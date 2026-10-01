import { AccessAction } from '@prisma/client'
import { defineEventHandler, getQuery, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { receiptMigrationSelect, receiptMigrationDto } from '~~/server/services/lab/receipt-migration.service'

export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.receipt-materials', AccessAction.VIEW)
  const query = getQuery(event)
  const page = Number(query.page ?? 1), pageSize = Number(query.pageSize ?? 500)
  const skip = (page - 1) * pageSize
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 500 || !Number.isSafeInteger(skip) || skip > 2147483647) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid pagination' })
  }
  const rows = await prisma.receiptMaterial.findMany({
    where: { deletedAt: null }, orderBy: { id: 'asc' }, skip, take: pageSize,
    select: receiptMigrationSelect,
  })
  return { success: true, data: rows.map(receiptMigrationDto) }
})
