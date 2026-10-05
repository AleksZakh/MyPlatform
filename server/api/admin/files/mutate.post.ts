import { defineEventHandler, readBody, createError } from 'h3'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { requireAdmin } from '../../../utils/require-admin'
import { prisma } from '../../../utils/prisma'
import { checkedStoragePath, normalizeStoragePath, storageSegment } from '../../../services/storage/paths'
import { fileReferences } from '../../../services/storage/references'
import { executeChanges, recoverStorageOperations, withStorageLock } from '../../../services/storage/operations'
export default defineEventHandler(async event => {
  const admin = await requireAdmin(event)
  event.context.storageActorLogin = admin.login
  const body = await readBody(event)
  if (!['mkdir','rename','move','delete'].includes(body?.action)) throw createError({ statusCode: 400, message: 'Неизвестное действие' })
  try { return await withStorageLock(async () => {
    await recoverStorageOperations()
    if (body.action === 'mkdir') {
      const parent = normalizeStoragePath(String(body.directory || ''), true), name = storageSegment(String(body.name || ''))
      if (!body.name?.trim() || name !== body.name.trim()) throw new Error('Используйте имя без пробелов, разделителей и специальных символов')
      const target = [parent, name].filter(Boolean).join('/')
      const disk = await checkedStoragePath(target, true)
      await mkdir(disk)
      try { await prisma.auditLog.create({ data: { action: 'CREATE', actorEmail: admin.login, category: 'DATA', result: 'SUCCESS', resourceKey: 'system.file-storage', note: 'Создание каталога', afterData: { path: target } } }) }
      catch (error) { throw new Error('Каталог создан, но запись журнала не подтверждена. Проверьте журнал перед повтором.') }
      return { success: true }
    }
    const paths: string[] = (Array.isArray(body.paths) ? body.paths : []).map((p: unknown) => normalizeStoragePath(String(p)))
    if (!paths.length || paths.length > 100 || new Set(paths).size !== paths.length) throw new Error('Выберите от 1 до 100 файлов')
    if (body.action === 'rename' && paths.length !== 1) throw new Error('Переименовать можно один файл')
    const refs = await fileReferences()
    const changes = paths.map(source => {
      let target: string | null = null
      if (body.action !== 'delete') {
        const parent = body.action === 'move' ? normalizeStoragePath(String(body.directory || ''), true) : path.posix.dirname(source).replace(/^\.$/, '')
        const rawName = body.action === 'rename' ? String(body.name || '') : path.posix.basename(source)
        const name = storageSegment(rawName)
        if (!rawName.trim() || name !== rawName || path.extname(name).toLowerCase() !== path.extname(source).toLowerCase()) throw new Error('Недопустимое имя или изменение расширения')
        // Unique suffix also makes crash recovery safe against pre-existing targets.
        const ext = path.extname(name), stem = name.slice(0, name.length - ext.length)
        target = [parent, `${stem}_${randomUUID()}${ext}`].filter(Boolean).join('/')
      }
      return { source, target, refs: refs.filter(r => { try { return normalizeStoragePath(r.path) === source } catch { return false } }) }
    })
    for (const c of changes) await checkedStoragePath(c.source!)
    const id = await executeChanges(event, body.action, changes)
    return { success: true, operationId: id }
  }) } catch (error) { throw createError({ statusCode: 409, message: (error as Error).message }) }
})
