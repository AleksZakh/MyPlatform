import { AccessAction } from '@prisma/client'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { receiptMigrationSelect, receiptMigrationDto } from '~~/server/services/lab/receipt-migration.service'

export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.receipt-materials', AccessAction.VIEW)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid ID' })
  const row = await prisma.receiptMaterial.findFirst({ where: { id, deletedAt: null }, select: receiptMigrationSelect })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  return { success: true, data: receiptMigrationDto(row) }
})
