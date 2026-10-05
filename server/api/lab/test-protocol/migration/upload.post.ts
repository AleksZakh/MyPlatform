import { inspectProtocolFile } from '~~/server/utils/protocol-migration-file'
import { detectMigrationDocument } from '~~/shared/utils/migration-document'
import { AccessAction } from '@prisma/client'
import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { auditDataChange, computeAuditDelta } from '~~/server/utils/auditLog'
import { protocolMigrationSelect, protocolMigrationDto, protocolStorageSegment } from '~~/server/services/lab/protocol-migration.service'

const ROOT = path.resolve(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files')
export default defineEventHandler(async event => {
  const permission = await requirePermission(event, 'lab.test-protocols', AccessAction.UPDATE)
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'Form required' })
  const files = form.filter(field => field.filename)
  if (files.length !== 1 || files[0]?.name !== 'file' || !files[0].data.length) throw createError({ statusCode: 400, statusMessage: 'Exactly one file required' })
  const file = files[0]
  if (file.data.length > 50 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'File too large' })
  const extension = detectMigrationDocument(file.data)?.extension
  if (!extension) throw createError({ statusCode: 415, statusMessage: 'PDF, JPEG, PNG or XLSX required' })
  const ids = form.filter(field => !field.filename && ['dbRecordId', 'testProtocolId'].includes(field.name || '')).map(field => Number(field.data.toString('utf8').trim()))
  const id = ids[0]
  if (!id || !Number.isSafeInteger(id) || id <= 0 || ids.some(value => value !== id)) throw createError({ statusCode: 400, statusMessage: 'Invalid protocol ID' })
  const expectations = form.filter(field => field.name === 'expected' && !field.filename)
  let expected: unknown
  try { if (expectations.length !== 1) throw new Error(); expected = JSON.parse(expectations[0]!.data.toString('utf8')) } catch { throw createError({ statusCode: 400, statusMessage: 'Expected record fields required' }) }
  if (!expected || typeof expected !== 'object') throw createError({ statusCode: 400, statusMessage: 'Invalid expected fields' })
  const check = expected as Record<string, unknown>
  const repairFields = form.filter(field => field.name === 'repairMissing' && !field.filename)
  let repair: { path: string; sha256: string } | undefined
  if (repairFields.length) {
    try {
      if (repairFields.length !== 1) throw new Error()
      const parsed = JSON.parse(repairFields[0]!.data.toString('utf8'))
      if (!parsed || typeof parsed.path !== 'string' || !parsed.path.trim() || parsed.path.trim() === '-'
        || typeof parsed.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(parsed.sha256)) throw new Error()
      repair = { path: parsed.path, sha256: parsed.sha256 }
    } catch { throw createError({ statusCode: 400, statusMessage: 'Invalid missing file recovery request' }) }
    if (createHash('sha256').update(file.data).digest('hex') !== repair.sha256)
      throw createError({ statusCode: 409, statusMessage: 'Recovery document hash mismatch' })
  }
  const row = await prisma.testProtocol.findFirst({ where: { id, deletedAt: null }, select: protocolMigrationSelect })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Protocol not found' })
  const dto = protocolMigrationDto(row)
  if (check.protocolNumber !== dto.protocolNumber || check.protocolDate !== dto.protocolDate || check.testResult !== dto.testResult) throw createError({ statusCode: 409, statusMessage: 'Protocol changed; review required' })
  if (repair) {
    if (row.protocolDocumentPath !== repair.path) throw createError({ statusCode: 409, statusMessage: 'Recovery path changed' })
    if ((await inspectProtocolFile(repair.path)).state !== 'MISSING') throw createError({ statusCode: 409, statusMessage: 'Recovery requires a confirmed missing file' })
  } else if (row.protocolDocumentPath?.trim() && row.protocolDocumentPath.trim() !== '-') throw createError({ statusCode: 409, statusMessage: 'Protocol already has a document' })
  const sampling = row.samplingTest
  if (!sampling || sampling.deletedAt) throw createError({ statusCode: 409, statusMessage: 'Active sampling record required' })
  const segments = ['lab', protocolStorageSegment(sampling.testLocation.testObject.name), protocolStorageSegment(sampling.testLocation.name), sampling.samplingDate.toISOString().slice(0, 10)]
  const name = `protocol_${protocolStorageSegment(row.protocolNumber || String(id))}_${id}_${randomUUID()}.${extension}`
  const relativePath = [...segments, name].join('/')
  const directory = path.join(ROOT, ...segments), diskPath = path.join(directory, name)
  const actor = await prisma.user.findUnique({ where: { id: permission.userId }, select: { email: true, login: true } })
  const actorEmail = actor?.email || actor?.login || `user:${permission.userId}`
  await mkdir(directory, { recursive: true })
  await writeFile(diskPath, file.data, { flag: 'wx' })
  try {
    await prisma.$transaction(async tx => {
      if (repair && (await inspectProtocolFile(repair.path)).state !== 'MISSING') throw createError({ statusCode: 409, statusMessage: 'Old document is no longer missing' })
      const changed = await tx.testProtocol.updateMany({
        where: { id, deletedAt: null, protocolDocumentPath: row.protocolDocumentPath,
          protocolNumber: row.protocolNumber, protocolDate: row.protocolDate, testResult: row.testResult, editedAt: row.editedAt,
          samplingTest: { is: { id: sampling.id, deletedAt: null, testLocationId: sampling.testLocationId, samplingDate: sampling.samplingDate } },
        },
        data: { protocolDocumentPath: relativePath, editorEmail: actorEmail },
      })
      if (changed.count !== 1) throw createError({ statusCode: 409, statusMessage: 'Record changed; review required' })
      await auditDataChange({ event, db: tx, resourceKey: 'lab.test-protocols', entityType: 'TestProtocol', entityId: id, action: 'UPDATE',
        note: repair ? 'Восстановление отсутствующего документа протокола; SHA-256: ' + repair.sha256 : 'Импорт документа протокола из старой системы', actorEmail,
        changes: computeAuditDelta({ protocolDocumentPath: row.protocolDocumentPath }, { protocolDocumentPath: relativePath }),
      })
    }, { maxWait: 10_000, timeout: 30_000 })
  } catch (error) {
    // A transport error at commit does not prove that the DB rolled back.
    // Remove our new file only after confirming that it is not referenced.
    try {
      const saved = await prisma.testProtocol.findUnique({ where: { id }, select: { protocolDocumentPath: true } })
      if (saved?.protocolDocumentPath !== relativePath) await unlink(diskPath).catch(() => undefined)
    } catch { /* Keep the file for reconciliation if the DB is unavailable. */ }
    throw error
  }
  return { success: true, attached: true, testProtocolId: id, path: relativePath, url: '/files/' + relativePath.split('/').map(encodeURIComponent).join('/') }
})
