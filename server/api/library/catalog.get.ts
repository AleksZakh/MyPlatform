import { prisma } from "../../utils/prisma";
import { libraryReader, libraryAdmin } from "../../services/library/access";
export default defineEventHandler(async (event) => {
  await libraryReader(event);
  let canManage = false;
  try {
    await libraryAdmin(event, false);
    canManage = true;
  } catch (e: any) {
    if (e.statusCode !== 403) throw e;
  }
  const rows = await prisma.libraryCategory.findMany({
    orderBy: [{ position: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { books: { where: { book: { deletedAt: null } } } } },
    },
  });
  return {
    canManage,
    categories: rows.map(({ _count, ...c }) => ({ ...c, count: _count.books })),
  };
});
