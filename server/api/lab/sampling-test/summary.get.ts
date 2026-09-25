// server/api/lab/sampling-test/summary.get.ts
import { AccessAction, type Prisma } from '@prisma/client';
import { createError, defineEventHandler, getQuery } from 'h3';
import { requirePermission } from '../../../services/access-control.service';
import { prisma } from '../../../utils/prisma';

// Select only the data needed for the response.
const samplingSelect = {
  id: true,
  samplingActNumber: true,
  samplingDate: true,
  testLocation: {
    select: {
      name: true,
      testObject: { select: { name: true } },
    },
  },
} satisfies Prisma.SamplingTestSelect;

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function positiveInteger(value: unknown, fallback: number): number {
  const text = queryString(value);
  if (!/^\d+$/.test(text)) return fallback;
  const number = Number(text);
  return Number.isSafeInteger(number) && number > 0 ? number : fallback;
}

function sorting(
  key: string,
  direction: Prisma.SortOrder,
): Prisma.SamplingTestOrderByWithRelationInput {
  switch (key) {
    case 'id': return { id: direction };
    case 'sActNumber': // Existing UI alias.
    case 'samplingActNumber': return { samplingActNumber: direction };
    case 'sDate':
    case 'samplingDate': return { samplingDate: direction };
    case 'createdAt': return { createdAt: direction };
    case 'editedAt': return { editedAt: direction };
    case 'note': return { note: direction };
    case 'plp': return { plp: { name: direction } };
    case 'inspector': return { inspector: { name: direction } };
    case 'objectName':
    case 'object': return { testLocation: { testObject: { name: direction } } };
    case 'samplingPlace':
    case 'location': return { testLocation: { name: direction } };
    case 'protocolNumber': return { testProtocol: { protocolNumber: direction } };
    case 'protocolDate': return { testProtocol: { protocolDate: direction } };
    case 'receiptDate': return { receiptMaterial: { receiptDate: direction } };
    case 'material': return { receiptMaterial: { material: { name: direction } } };
    case 'manufacturer': return { receiptMaterial: { manufacturer: { name: direction } } };
    default: return { samplingActNumber: direction };
  }
}

export default defineEventHandler(async (event) => {
  // Keep access errors outside the DB error handler (403 must remain 403).
  await requirePermission(event, 'lab.sampling-tests', AccessAction.VIEW);

  const query = getQuery(event);
  const page = positiveInteger(query.page, 1);
  const pageSize = Math.min(positiveInteger(query.pageSize, 10), 1000);
  const skip = (page - 1) * pageSize;
  if (!Number.isSafeInteger(skip) || skip > 2_147_483_647) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      message: 'Слишком большой номер страницы',
    });
  }

  const search = queryString(query.search).trim();
  const sortKey = queryString(query.sortKey) || 'sActNumber';
  const direction: Prisma.SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const where: Prisma.SamplingTestWhereInput = {};

  if (search) {
    const contains = { contains: search, mode: 'insensitive' as const };
    where.OR = [
      { samplingActNumber: contains },
      { note: contains },
      { plp: { name: contains } },
      { inspector: { name: contains } },
      { testLocation: { name: contains } },
      { testLocation: { testObject: { name: contains } } },
      { testProtocol: { protocolNumber: contains } },
      { receiptMaterial: { material: { name: contains } } },
    ];
  }

  const orderBy: Prisma.SamplingTestOrderByWithRelationInput[] = [sorting(sortKey, direction)];
  if (sortKey !== 'id') orderBy.push({ id: direction });

  try {
    const [data, total] = await Promise.all([
      prisma.samplingTest.findMany({ where, orderBy, skip, take: pageSize, select: samplingSelect }),
      prisma.samplingTest.count({ where }),
    ]);

    return {
      success: true,
      data: data.map((row) => ({
        id: row.id,
        samplingActNumber: row.samplingActNumber,
        samplingDate: row.samplingDate.toISOString().slice(0, 10).split('-').reverse().join('.'),
        objectName: row.testLocation.testObject.name,
        samplingPlace: row.testLocation.name,
      })),
      total,
      page,
      pageSize,
    };
  } catch (error: unknown) {
    console.error('Ошибка при получении списка актов отбора:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error',
      message: 'Ошибка при получении списка актов отбора',
    });
  }
});
