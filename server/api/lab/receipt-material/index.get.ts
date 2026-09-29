import type { Prisma } from '@prisma/client';
import { defineEventHandler, getQuery, createError } from 'h3';
import { prisma } from '../../../utils/prisma';
import { receiptHandbookInclude, receiptHandbookDto } from '../../../utils/lab-handbook-dto';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = Number(query.page || 1);
  const pageSize = Number(query.pageSize || 10);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000 || (page - 1) * pageSize > 2147483647) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid pagination' });
  }
  const search = String(query.search || '').trim();
  const text = { contains: search, mode: 'insensitive' as const };
  const where: Prisma.ReceiptMaterialWhereInput = search ? { OR: [
    { qualityDocumentNumber: text }, { note: text },
    { material: { name: text } }, { manufacturer: { name: text } },
  ] } : {};
  const direction: Prisma.SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const sortFields: Record<string, Prisma.ReceiptMaterialOrderByWithRelationInput> = {
    id: { id: direction }, qualDate: { receiptDate: direction }, receiptDate: { receiptDate: direction },
    qualDocNumber: { qualityDocumentNumber: direction }, qualityDocumentNumber: { qualityDocumentNumber: direction },
    qualityDocumentDate: { qualityDocumentDate: direction }, createdAt: { createdAt: direction },
    material: { material: { name: direction } }, manufacturer: { manufacturer: { name: direction } },
  };
  const sortKey = String(query.sortKey || 'qualDate');
  const orderBy = Object.hasOwn(sortFields, sortKey) ? sortFields[sortKey]! : sortFields.qualDate!;
  const [rows, total] = await Promise.all([
    prisma.receiptMaterial.findMany({ where, orderBy: [orderBy, { id: 'asc' }],
      skip: (page - 1) * pageSize, take: pageSize, include: receiptHandbookInclude }),
    prisma.receiptMaterial.count({ where }),
  ]);
  return { success: true, data: rows.map(receiptHandbookDto), total, page, pageSize };
});
