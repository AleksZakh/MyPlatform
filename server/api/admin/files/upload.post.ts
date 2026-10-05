import { defineEventHandler, readMultipartFormData, createError } from 'h3'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { prisma } from '../../../utils/prisma'
import { requireAdmin } from '../../../utils/require-admin'
import { detectMigrationDocument } from '../../../../shared/utils/migration-document'
import { checkedStoragePath, labPath, storageRoot, storageSegment, normalizeStoragePath } from '../../../services/storage/paths'
import { executeChanges, recoverStorageOperations, withStorageLock } from '../../../services/storage/operations'
import { fileReferences } from '../../../services/storage/references'
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  event.context.storageActorLogin = admin.login
  const form = await readMultipartFormData(event), files = form?.filter(x => x.filename) || []
  if (files.length !== 1 || !files[0]?.data.length || files[0].data.length > 50 * 1024 * 1024) throw createError({ statusCode: 400, message: 'Один файл до 50 МБ' })
  const file = files[0], format = detectMigrationDocument(file.data)
  if (!format) throw createError({ statusCode: 415, message: 'Допускаются PDF, JPEG, PNG и XLSX' })
  const text = (key: string) => form?.find(x => x.name === key && !x.filename)?.data.toString('utf8') || ''
  const samplingId = Number(text('samplingId')), type = text('type'), replacePath = text('replacePath')
  try { return await withStorageLock(async () => {
    await recoverStorageOperations()
    if (replacePath) {
      const source = normalizeStoragePath(replacePath), refs = (await fileReferences()).filter(r => { try { return normalizeStoragePath(r.path) === source } catch { return false } })
      if (!refs.length) throw new Error('Файл не связан с БД. Для загрузки укажите запись.')
      const directory = path.posix.dirname(source)
      const target = `${directory}/document_${randomUUID()}.${format.extension}`
      await executeChanges(event, 'replace', [{ source, target, refs }], file.data)
      return { success: true }
    }
    if (!Number.isSafeInteger(samplingId) || samplingId < 1 || !['sampling','quality','protocol','extra'].includes(type)) throw new Error('Укажите запись и тип документа')
    const row = await prisma.samplingTest.findFirst({ where: { id: samplingId, deletedAt: null }, include: { testLocation: { include: { testObject: true } } } })
    if (!row) throw new Error('Запись не найдена')
    const directory = labPath([row.testLocation.testObject.name, row.testLocation.name, row.samplingDate.toISOString().slice(0,10)])
    // Validate existing parents before creating a missing date folder.
    let current = ''
    for (const segment of directory.split('/')) { current = [current,segment].filter(Boolean).join('/'); const disk = await checkedStoragePath(current, true); await mkdir(disk).catch(error => { if (error.code !== 'EEXIST') throw error }) }
    const target = `${directory}/${type}_${samplingId}_${randomUUID()}.${format.extension}`
    const field = type === 'sampling' ? 'samplingDocumentPath' : type === 'quality' ? 'qualityDocumentPath' : type === 'protocol' ? 'protocolDocumentPath' : undefined
    await executeChanges(event, 'upload', [{ source: null, target, refs: [] }], file.data,
      { samplingId, name: file.filename!.slice(0,255), field, entityId: type === 'sampling' ? row.id : type === 'quality' ? row.receiptMaterialId : row.testProtocolId || undefined })
    return { success: true }
  }) } catch (error) { throw createError({ statusCode: 409, message: (error as Error).message }) }
})
