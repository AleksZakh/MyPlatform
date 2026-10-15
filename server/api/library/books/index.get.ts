import type { Prisma } from "@prisma/client";
import { prisma } from "../../../utils/prisma";
import { libraryReader, libraryAdmin } from "../../../services/library/access";
import { positiveId } from "../../../services/library/input";
export default defineEventHandler(async (event) => {
  await libraryReader(event);
  const q = getQuery(event);
  const trash = q.trash === "1";
  if (trash) await libraryAdmin(event, false);
  const page = q.page ? positiveId(q.page) : 1;
  const search = String(q.q || "")
    .trim()
    .slice(0, 200);
  const where: Prisma.LibraryBookWhereInput = {
    deletedAt: trash ? { not: null } : null,
  };
  if (q.category) {
    const id = positiveId(q.category);
    where.categories = {
      some: { category: { OR: [{ id }, { parentId: id }] } },
    };
  }
  if (q.series) where.series = String(q.series).slice(0, 300);
  if (search)
    where.OR = [
      "title",
      "author",
      "publisher",
      "year",
      "city",
      "keywords",
      "note",
      "series",
      "issue",
    ].map((key) => ({ [key]: { contains: search, mode: "insensitive" } }));
  const [books, total] = await Promise.all([
    prisma.libraryBook.findMany({
      where,
      include: { categories: { select: { categoryId: true } } },
      orderBy: [{ title: "asc" }, { id: "asc" }],
      take: 48,
      skip: (page - 1) * 48,
    }),
    prisma.libraryBook.count({ where }),
  ]);
  return { books: books.map(({ legacyData, ...book }) => book), total, page };
});
