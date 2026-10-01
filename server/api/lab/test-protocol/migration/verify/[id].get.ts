import { AccessAction } from '@prisma/client'
import { defineEventHandler, getRouterParam, createError, setResponseHeader } from 'h3'
import { realpath, open } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { protocolMigrationSelect, protocolMigrationDto } from '~~/server/services/lab/protocol-migration.service'
import { detectMigrationDocument } from '~~/shared/utils/migration-document'
export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.test-protocols', AccessAction.VIEW)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isSafeInteger(id) || id <= 0) throw createError({ statusCode: 400, message: 'Invalid ID' })
  const row = await prisma.testProtocol.findFirst({ where: { id, deletedAt: null }, select: protocolMigrationSelect })
  if (!row) throw createError({ statusCode: 404, message: 'Protocol not found' })
  const data = protocolMigrationDto(row)
  const source = row.protocolDocumentPath?.trim()
  if (!source || source === '-') return { success: true, data, file: { state: 'ABSENT' as const } }
  try {
    const root = await realpath(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files')
    const relative = source.startsWith('/files/') ? source.slice(7) : source
    if (path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0')) throw new Error('Path')
    const candidate = path.resolve(root, relative)
    if (!candidate.startsWith(root + path.sep)) throw new Error('Path')
    const actual = await realpath(candidate)
    if (!actual.startsWith(root + path.sep)) throw new Error('Path')
    const file = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const before = await file.stat()
      if (!before.isFile() || before.size > 50 * 1024 * 1024) throw new Error('Size')
      const bytes = await file.readFile()
      const after = await file.stat()
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('Changed')
      const format = detectMigrationDocument(bytes)
      if (!format) throw new Error('Format')
      return { success: true, data, file: { state: 'PRESENT' as const, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length, extension: format.extension } }
    } finally { await file.close() }
  } catch { return { success: true, data, file: { state: 'UNAVAILABLE' as const } } }
})
