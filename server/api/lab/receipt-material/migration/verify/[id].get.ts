import { AccessAction } from '@prisma/client'
import { defineEventHandler, getRouterParam, createError, setResponseHeader } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { receiptMigrationSelect, receiptMigrationDto } from '~~/server/services/lab/receipt-migration.service'
import { inspectMigrationFile } from '~~/server/utils/migration-stored-file'
export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.receipt-materials', AccessAction.VIEW)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid ID' })
  const row = await prisma.receiptMaterial.findFirst({ where: { id, deletedAt: null }, select: receiptMigrationSelect })
  if (!row) throw createError({ statusCode: 404, message: 'Receipt not found' })
  const data = receiptMigrationDto(row)
  return { success: true, data, file: await inspectMigrationFile(row.qualityDocumentPath) }
})
