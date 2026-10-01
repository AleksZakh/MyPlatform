import { inspectMigrationFile } from '~~/server/utils/migration-stored-file'
import { detectMigrationDocument } from '~~/shared/utils/migration-document'
import { AccessAction } from '@prisma/client'
import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { mkdir, writeFile, unlink } from 'node:fs/promises'
import { createHash, randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { prisma } from '~~/server/utils/prisma'
import { requirePermission } from '~~/server/services/access-control.service'
import { auditDataChange, computeAuditDelta } from '~~/server/utils/auditLog'
import { receiptMigrationSelect, receiptMigrationDto, receiptStorageSegment } from '~~/server/services/lab/receipt-migration.service'

const ROOT = path.resolve(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files')
export default defineEventHandler(async event => {
  const permission = await requirePermission(event, 'lab.receipt-materials', AccessAction.UPDATE)
  const form = await readMultipartFormData(event)
  if (!form) throw createError({ statusCode: 400, statusMessage: 'Form required' })
  const files = form.filter(field => field.filename)
  if (files.length !== 1 || files[0]?.name !== 'file' || !files[0].data.length) throw createError({ statusCode: 400, statusMessage: 'Exactly one file required' })
  const file = files[0]
  if (file.data.length > 50 * 1024 * 1024) throw createError({ statusCode: 413, statusMessage: 'File too large' })
  const extension = detectMigrationDocument(file.data)?.extension
  if (!extension) throw createError({ statusCode: 415, statusMessage: 'PDF, JPEG, PNG or XLSX required' })
  const ids = form.filter(field => !field.filename && ['dbRecordId', 'receiptMaterialId'].includes(field.name || '')).map(field => Number(field.data.toString('utf8').trim()))
  const id = ids[0]
  if (!id || !Number.isSafeInteger(id) || id <= 0 || ids.some(value => value !== id)) throw createError({ statusCode: 400, statusMessage: 'Invalid receipt ID' })
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
  const row = await prisma.receiptMaterial.findFirst({ where: { id, deletedAt: null }, select: receiptMigrationSelect })
  if (!row) throw createError({ statusCode: 404, statusMessage: 'Receipt not found' })
  const dto = receiptMigrationDto(row)
  if (['receiptDate', 'qualityDocumentDate', 'qualityDocumentNumber', 'materialName', 'manufacturerName', 'samplingActNumber'].some(key => check[key] !== dto[key as keyof typeof dto])) throw createError({ statusCode: 409, statusMessage: 'Receipt changed; review required' })
  if (repair) {
    if (row.qualityDocumentPath !== repair.path) throw createError({ statusCode: 409, statusMessage: 'Recovery path changed' })
    if ((await inspectMigrationFile(repair.path)).state !== 'MISSING') throw createError({ statusCode: 409, statusMessage: 'Recovery requires a confirmed missing file' })
  } else if (row.qualityDocumentPath?.trim() && row.qualityDocumentPath.trim() !== '-') throw createError({ statusCode: 409, statusMessage: 'Receipt already has a document' })
  const sampling = row.samplingTest
  if (!sampling || sampling.deletedAt) throw createError({ statusCode: 409, statusMessage: 'Active sampling record required' })
  const segments = [receiptStorageSegment(sampling.testLocation.testObject.name), receiptStorageSegment(sampling.testLocation.name), sampling.samplingDate.toISOString().slice(0, 10)]
  const name = `quality_${receiptStorageSegment(row.qualityDocumentNumber || String(id))}_${id}_${randomUUID()}.${extension}`
  const relativePath = [...segments, name].join('/')
  const directory = path.join(ROOT, ...segments), diskPath = path.join(directory, name)
  const actor = await prisma.user.findUnique({ where: { id: permission.userId }, select: { email: true, login: true } })
  const actorEmail = actor?.email || actor?.login || `user:${permission.userId}`
  await mkdir(directory, { recursive: true })
  await writeFile(diskPath, file.data, { flag: 'wx' })
  try {
    await prisma.$transaction(async tx => {
      if (repair && (await inspectMigrationFile(repair.path)).state !== 'MISSING') throw createError({ statusCode: 409, statusMessage: 'Old document is no longer missing' })
      const changed = await tx.receiptMaterial.updateMany({
        where: { id, deletedAt: null, qualityDocumentPath: row.qualityDocumentPath,
          qualityDocumentNumber: row.qualityDocumentNumber, qualityDocumentDate: row.qualityDocumentDate, receiptDate: row.receiptDate, materialId: row.materialId, manufacturerId: row.manufacturerId,
          material: { is: { name: row.material.name } },
          manufacturer: row.manufacturer ? { is: { name: row.manufacturer.name } } : { is: null }, editedAt: row.editedAt,
          samplingTest: { is: { id: sampling.id, deletedAt: null, testLocationId: sampling.testLocationId, samplingDate: sampling.samplingDate, samplingActNumber: sampling.samplingActNumber } },
        },
        data: { qualityDocumentPath: relativePath, editorEmail: actorEmail },
      })
      if (changed.count !== 1) throw createError({ statusCode: 409, statusMessage: 'Record changed; review required' })
      await auditDataChange({ event, db: tx, resourceKey: 'lab.receipt-materials', entityType: 'ReceiptMaterial', entityId: id, action: 'UPDATE',
        note: repair ? 'Восстановление отсутствующего документа о качестве материала; SHA-256: ' + repair.sha256 : 'Импорт документа о качестве материала из старой системы', actorEmail,
        changes: computeAuditDelta({ qualityDocumentPath: row.qualityDocumentPath }, { qualityDocumentPath: relativePath }),
      })
    }, { maxWait: 10_000, timeout: 30_000 })
  } catch (error) {
    // A transport error at commit does not prove that the DB rolled back.
    // Remove our new file only after confirming that it is not referenced.
    try {
      const saved = await prisma.receiptMaterial.findUnique({ where: { id }, select: { qualityDocumentPath: true } })
      if (saved?.qualityDocumentPath !== relativePath) await unlink(diskPath).catch(() => undefined)
    } catch { /* Keep the file for reconciliation if the DB is unavailable. */ }
    throw error
  }
  return { success: true, attached: true, receiptMaterialId: id, path: relativePath, url: '/files/' + relativePath.split('/').map(encodeURIComponent).join('/') }
})
