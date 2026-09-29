import { defineEventHandler, getRouterParam, createError } from 'h3';
import { prisma } from '../../../utils/prisma';
import { receiptHandbookInclude, receiptHandbookDto } from '../../../utils/lab-handbook-dto';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid ID' });
  const row = await prisma.receiptMaterial.findUnique({ where: { id }, include: receiptHandbookInclude });
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Record not found' });
  return { success: true, data: receiptHandbookDto(row) };
});
