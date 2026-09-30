import { AccessAction } from '@prisma/client'
import { defineEventHandler, getRouterParam, createError } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { protocolMigrationSelect, protocolMigrationDto } from '~~/server/services/lab/protocol-migration.service'

export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.test-protocols', AccessAction.VIEW)
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, statusMessage: 'Invalid ID' })
  const row = await prisma.testProtocol.findFirst({ where: { id, deletedAt: null }, select: protocolMigrationSelect })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Protocol not found' })
  return { success: true, data: protocolMigrationDto(row) }
})
