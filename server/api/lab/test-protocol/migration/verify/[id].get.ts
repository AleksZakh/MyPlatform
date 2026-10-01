import { AccessAction } from '@prisma/client'
import { defineEventHandler, getRouterParam, createError, setResponseHeader } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { protocolMigrationSelect, protocolMigrationDto } from '~~/server/services/lab/protocol-migration.service'
import { inspectProtocolFile } from '~~/server/utils/protocol-migration-file'
export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.test-protocols', AccessAction.VIEW)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid ID' })
  const row = await prisma.testProtocol.findFirst({ where: { id, deletedAt: null }, select: protocolMigrationSelect })
  if (!row) throw createError({ statusCode: 404, message: 'Protocol not found' })
  const data = protocolMigrationDto(row)
  return { success: true, data, file: await inspectProtocolFile(row.protocolDocumentPath) }
})
