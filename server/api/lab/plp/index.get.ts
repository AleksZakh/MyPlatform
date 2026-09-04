// server/api/lab/plp/index.get.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = parseInt(query.page as string) || 1;
  const pageSize = parseInt(query.pageSize as string) || 10;
  const search = (query.search as string) || '';
  const sortKey = (query.sortKey as string) || 'name';
  const sortOrder = (query.sortOrder as string) || 'asc';

  const where = search ? {
    OR: [
      { name: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
    ],
  } : {};

  const orderBy = {
    [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc',
  };

  const [data, total] = await Promise.all([
    prisma.plp.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: { samplingTests: true },
        },
      },
    }),
    prisma.plp.count({ where }),
  ]);

  return {
    success: true,
    data,
    total,
    page,
    pageSize,
  };
});