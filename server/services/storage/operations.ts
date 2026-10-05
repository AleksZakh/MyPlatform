import { mkdir, open, readFile, writeFile, readdir, copyFile, unlink, lstat, realpath, rename } from 'node:fs/promises'
import { constants } from 'node:fs'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { prisma } from '../../utils/prisma'
import { auditDataChange, computeAuditDelta } from '../../utils/auditLog'
import type { H3Event } from 'h3'
import { checkedStoragePath, normalizeStoragePath, storageJournalRoot, storageRoot } from './paths'
import { changeReference, fileReferences, type FileReference } from './references'

type Change = { source: string | null; target: string | null; refs: FileReference[] }
interface Manifest { id: string; kind: string; changes: Change[]; createdAt: string; createdTargets: string[] }
async function journalDirectory() {
  await mkdir(storageJournalRoot, { recursive: true, mode: 0o700 })
  const [root, journal] = await Promise.all([realpath(storageRoot), realpath(storageJournalRoot)])
  if (journal === root || journal.startsWith(root + path.sep)) throw new Error('Журнал операций должен быть вне /files/')
  return journal
}
export async function withStorageLock<T>(action: () => Promise<T>): Promise<T> {
  const journal = await journalDirectory()
  const lock = path.join(journal, 'lock')
  // Deliberately never steal an old lock: process crash requires explicit recovery.
  const handle = await open(lock, 'wx', 0o600).catch(() => { throw new Error('Хранилище занято или требует восстановления. См. инструкцию.') })
  try { await handle.writeFile(JSON.stringify({ pid: process.pid, at: new Date().toISOString() })); await handle.sync(); return await action() }
  finally { await handle.close(); await unlink(lock) }
}
async function removeIfUnreferenced(relative: string) {
  const refs = await fileReferences(prisma, [relative])
  if (refs.some(r => normalizeStoragePath(r.path) === relative)) return
  await unlink(await checkedStoragePath(relative)).catch(error => { if (error.code !== 'ENOENT') throw error })
}
async function finish(manifest: Manifest, committed: boolean) {
  for (const change of manifest.changes) {
    if (committed && change.source && change.source !== change.target) await removeIfUnreferenced(change.source)
    if (!committed && change.target && manifest.createdTargets?.includes(change.target)) await removeIfUnreferenced(change.target)
  }
  await writeFile(path.join(storageJournalRoot, manifest.id, 'done'), committed ? 'committed' : 'rolled-back', { mode: 0o600 })
}
export async function recoverStorageOperations() {
  await journalDirectory()
  for (const entry of await readdir(storageJournalRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-f0-9-]{36}$/.test(entry.name)) continue
    const dir = path.join(storageJournalRoot, entry.name)
    try { await lstat(path.join(dir, 'done')); continue } catch {}
    let manifest: Manifest
    try { manifest = JSON.parse(await readFile(path.join(dir, 'manifest.json'), 'utf8')) } catch { continue }
    const marker = await prisma.fileStorageOperation.findUnique({ where: { id: manifest.id } })
    await finish(manifest, Boolean(marker))
  }
}
export async function executeChanges(event: H3Event | null, kind: string, changes: Change[], bytes?: Buffer,
  attach?: { samplingId: number; name: string; field?: 'samplingDocumentPath' | 'qualityDocumentPath' | 'protocolDocumentPath'; entityId?: number }) {
  const id = randomUUID(), dir = path.join(await journalDirectory(), id)
  await mkdir(dir, { mode: 0o700 })
  const manifest: Manifest = { id, kind, changes, createdAt: new Date().toISOString(), createdTargets: [] }
  const manifestHandle = await open(path.join(dir, 'manifest.json'), 'wx', 0o600)
  try { await manifestHandle.writeFile(JSON.stringify(manifest, null, 2)); await manifestHandle.sync() } finally { await manifestHandle.close() }
  try {
    for (const [index, change] of changes.entries()) {
      if (change.source) await copyFile(await checkedStoragePath(change.source), path.join(dir, `${index}.backup`), constants.COPYFILE_EXCL)
      if (change.target) {
        const destination = await checkedStoragePath(change.target, true)
        if (bytes) await writeFile(destination, bytes, { flag: 'wx' })
        else if (change.source) await copyFile(await checkedStoragePath(change.source), destination, constants.COPYFILE_EXCL)
        else throw new Error('Нет содержимого файла')
        manifest.createdTargets.push(change.target)
        const temp = path.join(dir, 'manifest.tmp')
        const record = await open(temp, 'w', 0o600)
        try { await record.writeFile(JSON.stringify(manifest, null, 2)); await record.sync() } finally { await record.close() }
        await rename(temp, path.join(dir, 'manifest.json'))
      }
    }
    await prisma.$transaction(async tx => {
      for (const change of changes) {
        if (!change.source) continue
        const actual = await fileReferences(tx, [change.source])
        const key = (r: FileReference) => `${r.model}:${r.id}:${r.field}:${r.path}`
        if (actual.map(key).sort().join('|') !== change.refs.map(key).sort().join('|')) throw new Error('Связи файла изменились. Обновите список.')
      }
      for (const change of changes) for (const ref of change.refs) {
        await changeReference(tx, ref, change.target, event?.context.storageActorLogin || 'file-storage-migration')
        // Same audit structure for online operations and CLI migration.
        if (event) await auditDataChange({ event, db: tx, actorEmail: event.context.storageActorLogin, resourceKey: 'system.file-storage', entityType: ref.entity, entityId: ref.id, action: 'UPDATE', note: kind,
          changes: computeAuditDelta({ [ref.field]: ref.path }, { [ref.field]: change.target }) })
        else await tx.auditLog.create({ data: { entityType: ref.entity, entityId: ref.id, action: 'UPDATE', category: 'DATA', result: 'SUCCESS', resourceKey: 'system.file-storage', actorEmail: 'file-storage-migration', note: kind,
          beforeData: { [ref.field]: ref.path }, afterData: { [ref.field]: change.target } } })
      }
      if (attach) {
        const row = await tx.samplingTest.findFirst({ where: { id: attach.samplingId, deletedAt: null } })
        if (!row) throw new Error('Активная запись реестра не найдена')
        const destination = changes[0]!.target!
        if (!attach.field) {
          const item = await tx.fileAttachment.create({ data: { samplingTestId: row.id, name: attach.name, path: destination } })
          if (event) await auditDataChange({ event, db: tx, actorEmail: event.context.storageActorLogin, resourceKey: 'system.file-storage', entityType: 'FileAttachment', entityId: item.id, action: 'CREATE', note: kind, afterData: { path: destination, samplingTestId: row.id } })
        } else {
          const ref: FileReference = { model: attach.field === 'samplingDocumentPath' ? 'samplingTest' : attach.field === 'qualityDocumentPath' ? 'receiptMaterial' : 'testProtocol',
            entity: attach.field === 'samplingDocumentPath' ? 'SamplingTest' : attach.field === 'qualityDocumentPath' ? 'ReceiptMaterial' : 'TestProtocol', id: attach.entityId!, field: attach.field,
            path: '', type: '', number: '', date: null, samplingId: row.id, object: '', location: '', deleted: false }
          let count = 0
          if (ref.model === 'samplingTest') count = (await tx.samplingTest.updateMany({ where: { id: row.id, deletedAt: null, OR: [{ samplingDocumentPath: null }, { samplingDocumentPath: { in: ['', '-'] } }] }, data: { samplingDocumentPath: destination, editorEmail: event?.context.storageActorLogin || 'file-storage-migration' } })).count
          if (ref.model === 'receiptMaterial') count = (await tx.receiptMaterial.updateMany({ where: { id: row.receiptMaterialId, deletedAt: null, OR: [{ qualityDocumentPath: null }, { qualityDocumentPath: { in: ['', '-'] } }] }, data: { qualityDocumentPath: destination, editorEmail: event?.context.storageActorLogin || 'file-storage-migration' } })).count
          if (ref.model === 'testProtocol' && row.testProtocolId) count = (await tx.testProtocol.updateMany({ where: { id: row.testProtocolId, deletedAt: null, OR: [{ protocolDocumentPath: null }, { protocolDocumentPath: { in: ['', '-'] } }] }, data: { protocolDocumentPath: destination, editorEmail: event?.context.storageActorLogin || 'file-storage-migration' } })).count
          if (count !== 1) throw new Error('Документ уже прикреплён либо связанная запись недоступна. Используйте замену.')
          if (event) await auditDataChange({ event, db: tx, actorEmail: event.context.storageActorLogin, resourceKey: 'system.file-storage', entityType: ref.entity, entityId: ref.id, action: 'UPDATE', note: kind, changes: computeAuditDelta({ [ref.field]: null }, { [ref.field]: destination }) })
        }
      }
      if (!attach && changes.every(c => !c.refs.length)) await tx.auditLog.create({ data: { actorEmail: event?.context.storageActorLogin || 'file-storage-migration', action: 'UPDATE', category: 'DATA', result: 'SUCCESS', resourceKey: 'system.file-storage', note: kind, afterData: { paths: changes.map(c => ({ source: c.source, target: c.target })) } } })
      await tx.fileStorageOperation.create({ data: { id, kind } })
    }, { timeout: 60_000, maxWait: 10_000, isolationLevel: 'Serializable' })
  } catch (error) {
    // Never assume a failed response means rollback. Query the durable commit marker.
    let marker
    try { marker = await prisma.fileStorageOperation.findUnique({ where: { id } }) } catch { throw new Error(`Исход операции не определён. ID ${id}. Выполните восстановление после проверки БД.`) }
    await finish(manifest, Boolean(marker))
    if (!marker) throw error
  }
  await finish(manifest, true)
  return id
}
