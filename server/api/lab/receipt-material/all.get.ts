import type { Prisma } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';
import { prisma } from '../../../utils/prisma';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const search = String(query.search || '').trim();
  const text = { contains: search, mode: 'insensitive' as const };
  const where: Prisma.ReceiptMaterialWhereInput = search ? { OR: [
    { qualityDocumentNumber: text }, { note: text }, { material: { name: text } },
  ] } : {};
  const direction: Prisma.SortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
  const sorts: Record<string, Prisma.ReceiptMaterialOrderByWithRelationInput> = {
    id: { id: direction }, qualDate: { receiptDate: direction }, receiptDate: { receiptDate: direction },
    qualDocNumber: { qualityDocumentNumber: direction }, qualityDocumentNumber: { qualityDocumentNumber: direction },
    material: { material: { name: direction } },
  };
  const sortKey = String(query.sortKey || 'qualDate');
  const orderBy = Object.hasOwn(sorts, sortKey) ? sorts[sortKey]! : sorts.qualDate!;
  const rows = await prisma.receiptMaterial.findMany({ where, orderBy,
    select: { id: true, receiptDate: true, qualityDocumentNumber: true, qualityDocumentPath: true,
      note: true, material: { select: { id: true, name: true } } } });
  const data = rows.map(row => ({ ...row, qualDate: row.receiptDate,
    qualDocNumber: row.qualityDocumentNumber, qualDocPath: row.qualityDocumentPath }));
  return { success: true, data, total: data.length };
});
