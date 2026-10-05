import { defineEventHandler, getQuery } from 'h3'
import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const q = String(getQuery(event).q || '').trim()
  return prisma.samplingTest.findMany({ where: { deletedAt: null, ...(q ? { OR: [{ samplingActNumber: { contains: q, mode: 'insensitive' } }, ...(Number.isSafeInteger(Number(q)) ? [{ id: Number(q) }] : [])] } : {}) },
    select: { id: true, samplingActNumber: true, samplingDate: true, testLocation: { select: { name: true, testObject: { select: { name: true } } } } }, take: 30, orderBy: { id: 'desc' } })
})
