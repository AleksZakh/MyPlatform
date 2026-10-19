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
      videos: { where: { video: { deletedAt: null, ...(!canManage ? { status: "READY" } : {}) } }, select: { videoId: true } },
      books: {
        where: { book: { deletedAt: null } },
        select: { bookId: true },
      },
    },
  });
  // The catalogue has two levels. Count each active book once per category,
  // including direct links and links through its immediate subcategories.
  const bookIdsByCategory = new Map<number, Set<number>>(
    rows.map((c) => [c.id, new Set(c.books.map((link) => link.bookId))]),
  );
  for (const category of rows) {
    if (category.parentId === null) continue;
    const parentBooks = bookIdsByCategory.get(category.parentId);
    if (!parentBooks) continue;
    for (const link of category.books) parentBooks.add(link.bookId);
  }

  const videoIds = new Map(rows.map(c => [c.id, new Set(c.videos.map(v => v.videoId))]));
  for (const c of rows) if (c.parentId !== null) for (const v of c.videos) videoIds.get(c.parentId)?.add(v.videoId);
  return {
    canManage,
    categories: rows.map(({ books, videos, ...c }) => ({
      ...c,
      count: bookIdsByCategory.get(c.id)!.size + (videoIds.get(c.id)?.size || 0),
    })),
  };
});
