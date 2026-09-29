import { defineEventHandler, getRouterParam, createError } from 'h3';
import { prisma } from '../../../utils/prisma';
import { protocolHandbookInclude, protocolHandbookDto } from '../../../utils/lab-handbook-dto';

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid ID' });
  const row = await prisma.testProtocol.findUnique({ where: { id }, include: protocolHandbookInclude });
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Record not found' });
  return { success: true, data: protocolHandbookDto(row) };
});
