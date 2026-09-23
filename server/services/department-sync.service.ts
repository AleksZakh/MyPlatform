import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../utils/prisma'
import { accessError, parseAccessId } from './access-input'
import { structureAdmin, structureAudit, structureRevision } from './structure-admin.service'

export const departmentName = (value: unknown): string => typeof value === 'string'
  ? value.normalize('NFC').replace(/\s+/g, ' ').trim() : ''
export interface DepartmentCache {
  lastUpdated: string
  users: { department?: unknown; directoryObjectId?: unknown; login?: unknown; fullName?: unknown }[]
}
export function parseDepartmentSync(value: unknown) {
  const b = value as Record<string, unknown> | null
  const name = departmentName(b?.directoryName)
  if (!name || name.length > 255 || name.includes('\0')) accessError(400, 'INVALID_DEPARTMENT', 'Выберите отдел из кэша AD.')
  if (b?.mode !== 'preview' && b?.mode !== 'apply') accessError(400, 'INVALID_MODE', 'Сначала выполните предпросмотр.')
  return { directoryName: name, departmentId: b.departmentId == null ? null : parseAccessId(b.departmentId), mode: b.mode, revision: b.revision }
}
export async function departmentSyncPlan(db: Prisma.TransactionClient, cache: DepartmentCache | null,
  input: ReturnType<typeof parseDepartmentSync>) {
  if (!cache || !Array.isArray(cache.users) || !cache.users.length) accessError(409, 'AD_CACHE_EMPTY', 'Сначала обновите кэш пользователей AD.')
  const members = cache.users.filter(u => departmentName(u.department) === input.directoryName)
  if (!members.length) accessError(409, 'DEPARTMENT_NOT_IN_CACHE', 'Отдел отсутствует в текущем кэше. Обновите список.')
  const mapping = await db.directoryDepartmentMapping.findUnique({ where: { directoryName: input.directoryName } })
  const targetId = input.departmentId ?? mapping?.departmentId
  const department = targetId ? await db.department.findUnique({ where: { id: targetId } })
    : await db.department.findUnique({ where: { name: input.directoryName } })
  if ((targetId && !department) || (department && !department.isActive)) accessError(409, 'DEPARTMENT_UNAVAILABLE', 'Выбранный отдел отсутствует или отключён.')
  const users = await db.user.findMany({ where: { authType: 'DOMAIN' },
    select: { id: true, login: true, fullName: true, directoryObjectId: true, departmentId: true,
      department: { select: { name: true } } }, orderBy: { id: 'asc' } })
  const changes: { userId: number; name: string; beforeId: number | null; beforeName: string | null }[] = []
  const skipped: { name: string; reason: string }[] = []
  const seen = new Set<number>()
  let unchanged = 0
  for (const member of members) {
    const guid = typeof member.directoryObjectId === 'string' ? member.directoryObjectId.trim().toLowerCase() : ''
    const label = String(member.fullName || member.login || 'Без имени')
    if (!guid) { skipped.push({ name: label, reason: 'Нет objectGUID: требуется проверить профиль AD.' }); continue }
    // A GUID appearing in different departments makes automatic membership ambiguous.
    if (cache.users.some(u => String(u.directoryObjectId || '').trim().toLowerCase() === guid
      && departmentName(u.department) !== input.directoryName))
      accessError(409, 'AMBIGUOUS_DIRECTORY_ID', 'Один objectGUID присутствует в нескольких отделах кэша.')
    const user = users.find(u => u.directoryObjectId?.toLowerCase() === guid)
    if (!user) { skipped.push({ name: label, reason: 'Нет зарегистрированной учётной записи с этим objectGUID. Привязка возможна после доменного входа.' }); continue }
    if (seen.has(user.id)) continue
    seen.add(user.id)
    if (department && user.departmentId === department.id) { unchanged++; continue }
    changes.push({ userId: user.id, name: user.fullName || user.login || label,
      beforeId: user.departmentId, beforeName: user.department?.name ?? null })
  }
  const target = department ? { id: department.id, name: department.name } : { id: null, name: input.directoryName }
  const plan = { directoryName: input.directoryName, cacheUpdatedAt: cache.lastUpdated, target,
    createsDepartment: !department, changes, skipped, unchanged }
  return { ...plan, revision: structureRevision({ plan, mapping, department, users, cache }) }
}
export async function syncDepartment(event: H3Event, cache: DepartmentCache | null, body: unknown) {
  await structureAdmin(event)
  const input = parseDepartmentSync(body)
  if (input.mode === 'preview') return prisma.$transaction(tx => departmentSyncPlan(tx, cache, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  try {
    return await prisma.$transaction(async tx => {
      const actor = await structureAdmin(event, tx)
      const plan = await departmentSyncPlan(tx, cache, input)
      if (input.revision !== plan.revision) accessError(409, 'DEPARTMENT_SYNC_CONFLICT', 'Кэш или структура изменились. Повторите предпросмотр.')
      const department = plan.target.id ? await tx.department.findUniqueOrThrow({ where: { id: plan.target.id } })
        : await tx.department.create({ data: { name: plan.target.name,
          key: `ad-${createHash('sha256').update(plan.directoryName).digest('hex').slice(0, 32)}` } })
      const old = await tx.directoryDepartmentMapping.findUnique({ where: { directoryName: plan.directoryName } })
      await tx.directoryDepartmentMapping.upsert({ where: { directoryName: plan.directoryName },
        create: { directoryName: plan.directoryName, departmentId: department.id }, update: { departmentId: department.id } })
      for (const change of plan.changes) {
        await tx.user.update({ where: { id: change.userId }, data: { departmentId: department.id } })
        await structureAudit(event, tx, actor, 'User', change.userId,
          { departmentId: change.beforeId }, { departmentId: department.id },
          `Отдел сотрудника «${change.name}» синхронизирован по кэшу AD`)
      }
      await structureAudit(event, tx, actor, 'Department', department.id,
        { mappingDepartmentId: old?.departmentId ?? null },
        { mappingDepartmentId: department.id, directoryName: plan.directoryName, changedUsers: plan.changes.length },
        `Синхронизация отдела «${plan.directoryName}» из кэша AD`)
      return { ...plan, target: { id: department.id, name: department.name }, applied: true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 20000 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(e.code))
      accessError(409, 'DEPARTMENT_SYNC_CONFLICT', 'Структура изменена параллельно. Повторите предпросмотр.')
    throw e
  }
}
