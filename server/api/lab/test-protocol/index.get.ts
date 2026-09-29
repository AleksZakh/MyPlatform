import type { Prisma } from '@prisma/client';
import { defineEventHandler, getQuery, createError } from 'h3';
import { prisma } from '../../../utils/prisma';
import { protocolHandbookInclude, protocolHandbookDto } from '../../../utils/lab-handbook-dto';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 || (page - 1) * pageSize > 2147483647) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid pagination' });
  }
  const search = String(query.search || '').trim();
  const text = { contains: search, mode: 'insensitive' as const };
  const where: Prisma.TestProtocolWhereInput = search ? { OR: [
    { protocolNumber: text }, { testResult: text }, { note: text },
    { samplingTest: { samplingActNumber: text } },
    { samplingTest: { receiptMaterial: { material: { name: text } } } },
    { samplingTest: { receiptMaterial: { manufacturer: { name: text } } } },
  ] } : {};
  const direction: Prisma.SortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
  const sortFields: Record<string, Prisma.TestProtocolOrderByWithRelationInput> = {
    id: { id: direction }, protocolNumber: { protocolNumber: direction },
    protocolDate: { protocolDate: direction }, testResult: { testResult: direction }, createdAt: { createdAt: direction },
    material: { samplingTest: { receiptMaterial: { material: { name: direction } } } },
    manufacturer: { samplingTest: { receiptMaterial: { manufacturer: { name: direction } } } },
  };
  const sortKey = String(query.sortKey || 'protocolNumber');
  const orderBy = Object.hasOwn(sortFields, sortKey) ? sortFields[sortKey]! : sortFields.protocolNumber!;
  const [rows, total] = await Promise.all([
    prisma.testProtocol.findMany({ where, orderBy: [orderBy, { id: 'asc' }],
      skip: (page - 1) * pageSize, take: pageSize, include: protocolHandbookInclude }),
    prisma.testProtocol.count({ where }),
  ]);
  return { success: true, data: rows.map(protocolHandbookDto), total, page, pageSize };
});
