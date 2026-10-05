import { prisma } from '../../utils/prisma'
import type { Prisma } from '@prisma/client'

export interface FileReference {
  model: 'samplingTest' | 'receiptMaterial' | 'testProtocol' | 'aEng' | 'fileAttachment'
  entity: string; id: number; field: string; path: string; type: string; number: string
  date: string | null; samplingId: number | null; object: string; location: string; deleted: boolean
}
interface SamplingContext { id: number; deletedAt?: Date | null; testLocation: { name: string; testObject: { name: string } } }
export async function fileReferences(db: Prisma.TransactionClient = prisma, paths?: string[]): Promise<FileReference[]> {
  const values = paths?.flatMap(p => [p, '/files/' + p])
  const filter = (field: string) => ({ where: values ? { [field]: { in: values } } : {} })
  const [sampling, receipts, protocols, legacy, attachments] = await Promise.all([
    db.samplingTest.findMany({ ...filter('samplingDocumentPath'), include: { testLocation: { include: { testObject: true } } } }),
    db.receiptMaterial.findMany({ ...filter('qualityDocumentPath'), include: { samplingTest: { include: { testLocation: { include: { testObject: true } } } } } }),
    db.testProtocol.findMany({ ...filter('protocolDocumentPath'), include: { samplingTest: { include: { testLocation: { include: { testObject: true } } } } } }),
    db.aEng.findMany({ where: values ? { OR: ['sDocPath','qualDocPath','testDocPath','protocolDocPath'].map(field => ({ [field]: { in: values } })) } : {} }),
    db.fileAttachment.findMany({ ...filter('path'), include: { samplingTest: { include: { testLocation: { include: { testObject: true } } } } } }),
  ])
  const result: FileReference[] = []
  function push(model: FileReference['model'], entity: string, row: { id: number; deletedAt?: Date | null; objectName?: string } & Record<string, unknown>, field: string, type: string, number: string, date: Date | null, s: SamplingContext | null) {
    const value = row[field]
    if (typeof value !== 'string' || !value.trim() || value.trim() === '-') return
    result.push({ model, entity, id: row.id, field, path: value, type, number,
      date: date?.toISOString().slice(0, 10) || null, samplingId: s?.id || null,
      object: s?.testLocation?.testObject?.name || row.objectName || '', location: s?.testLocation?.name || '',
      deleted: Boolean(row.deletedAt || s?.deletedAt) })
  }
  for (const row of sampling) push('samplingTest', 'SamplingTest', row, 'samplingDocumentPath', 'Акт отбора', row.samplingActNumber, row.samplingDate, row)
  for (const row of receipts) push('receiptMaterial', 'ReceiptMaterial', row, 'qualityDocumentPath', 'Документ о качестве', row.qualityDocumentNumber || '', row.qualityDocumentDate, row.samplingTest)
  for (const row of protocols) push('testProtocol', 'TestProtocol', row, 'protocolDocumentPath', 'Протокол испытаний', row.protocolNumber || '', row.protocolDate, row.samplingTest)
  for (const row of legacy) for (const field of ['sDocPath','qualDocPath','testDocPath','protocolDocPath']) push('aEng', 'AEng', row, field, 'Архивный документ', String(row.id), null, null)
  for (const row of attachments) push('fileAttachment', 'FileAttachment', row, 'path', 'Дополнительное вложение', row.name, row.createdAt, row.samplingTest)
  return values ? result.filter(r => values.includes(r.path)) : result
}
// Explicit allowlist: the client cannot supply a Prisma model or field name.
export async function changeReference(tx: Prisma.TransactionClient, ref: FileReference, target: string | null, actorEmail?: string) {
  let count = 0
  if (ref.model === 'samplingTest') count = (await tx.samplingTest.updateMany({ where: { id: ref.id, samplingDocumentPath: ref.path }, data: { samplingDocumentPath: target, ...(actorEmail ? { editorEmail: actorEmail } : {}) } })).count
  if (ref.model === 'receiptMaterial') count = (await tx.receiptMaterial.updateMany({ where: { id: ref.id, qualityDocumentPath: ref.path }, data: { qualityDocumentPath: target, ...(actorEmail ? { editorEmail: actorEmail } : {}) } })).count
  if (ref.model === 'testProtocol') count = (await tx.testProtocol.updateMany({ where: { id: ref.id, protocolDocumentPath: ref.path }, data: { protocolDocumentPath: target, ...(actorEmail ? { editorEmail: actorEmail } : {}) } })).count
  if (ref.model === 'fileAttachment') {
    if (target === null) count = (await tx.fileAttachment.deleteMany({ where: { id: ref.id, path: ref.path } })).count
    else count = (await tx.fileAttachment.updateMany({ where: { id: ref.id, path: ref.path }, data: { path: target } })).count
  }
  if (ref.model === 'aEng') {
    const field = ref.field as 'sDocPath' | 'qualDocPath' | 'testDocPath' | 'protocolDocPath'
    count = (await tx.aEng.updateMany({ where: { id: ref.id, [field]: ref.path }, data: { [field]: target, ...(actorEmail ? { editorEmail: actorEmail, editedAt: new Date() } : {}) } })).count
  }
  if (count !== 1) throw new Error('Связанная запись изменилась. Обновите список и повторите операцию.')
}
