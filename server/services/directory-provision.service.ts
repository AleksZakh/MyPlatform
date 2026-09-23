import { Prisma, type User } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../utils/prisma'
import { ensureDomainUser } from './domain-user.service'
import { findDomainUser, normalizeDirectoryUser, normalizeDirectoryObjectId, type DirectoryUser, type RawDirectoryUser } from './ad-directory.service'
import { accessError, parseAccessId } from './access-input'
import { structureAdmin, structureAudit } from './structure-admin.service'
import type { StructureMember } from '../../shared/types/structure-member'

export const memberSelect = { id: true, fullName: true, login: true, email: true, directoryObjectId: true,
  authType: true, status: true, updatedAt: true } satisfies Prisma.UserSelect
export function memberOption(user: Pick<User, keyof typeof memberSelect>): StructureMember {
  return { id: user.id, name: user.fullName || user.login || user.email || `#${user.id}`,
    detail: [user.login || user.email, user.status].filter(Boolean).join(' · '), isActive: user.status === 'ACTIVE',
    authType: user.authType, status: user.status, updatedAt: user.updatedAt.toISOString(), directoryObjectId: user.directoryObjectId }
}
export function cachedProfiles(users: unknown[]): DirectoryUser[] {
  return users.flatMap(value => {
    if (!value || typeof value !== 'object') return []
    const raw = value as RawDirectoryUser
    const profile = normalizeDirectoryUser({ ...raw,
      sAMAccountName: raw.login ?? raw.sAMAccountName,
      objectGUID: raw.directoryObjectId ?? raw.objectGUID,
      displayName: raw.fullName ?? raw.displayName,
      mail: raw.email ?? raw.mail, title: raw.position ?? raw.title,
    })
    if (!profile) return []
    if (typeof raw.accountDisabled === 'boolean') profile.accountDisabled = raw.accountDisabled
    return [profile]
  })
}
export async function listStructureMembers(event: H3Event, cache: { users: unknown[] } | null, search: string, all = false) {
  await structureAdmin(event)
  const users = await prisma.user.findMany({ select: memberSelect, orderBy: { id: 'asc' } })
  const known = new Set(users.map(u => u.directoryObjectId?.toLowerCase()).filter(Boolean))
  const localDepartments = all ? await prisma.user.findMany({ select: { id: true, department: { select: { name: true } } } }) : []
  const departmentNames = new Map(localDepartments.map(u => [u.id, u.department?.name || 'Без отдела']))
  const q = search.trim().toLocaleLowerCase('ru')
  const options = users.map(memberOption)
  const seen = new Set<string>()
  const profiles = cachedProfiles(cache?.users ?? [])
  const profileById = new Map(profiles.filter(u => u.directoryObjectId).map(u => [u.directoryObjectId, u]))
  for (const option of options) option.departmentName = profileById.get(option.directoryObjectId?.toLowerCase() || '')?.department || departmentNames.get(option.id) || 'Без отдела'
  for (const user of profiles) {
    const guid = user.directoryObjectId
    const key = guid || `login:${user.login}`
    if ((guid && known.has(guid)) || seen.has(key)) continue
    seen.add(key)
    options.push({ id: 0, name: user.fullName || user.login, detail: `${user.login} · ${user.department || 'Без отдела'} · Только кэш AD${!guid ? ' · требуется проверка идентификатора в AD' : ''}${user.accountDisabled ? ' · отключён в AD' : ''}`,
      departmentName: user.department || 'Без отдела', cachedOnly: true, cacheLogin: user.login, directoryObjectId: guid, isActive: false, accountDisabled: user.accountDisabled, authType: 'DOMAIN' })
  }
  const matches = options.filter(u => `${u.name} ${u.detail}`.toLocaleLowerCase('ru').includes(q))
    .sort((a,b) => a.name.localeCompare(b.name, 'ru') || a.id-b.id)
  return { items: all ? matches : matches.slice(0,50), hasMore: !all && matches.length > 50,
    summary: { registered: users.length, cacheTotal: cache?.users.length ?? 0,
      cachedOnly: options.length - users.length, withoutLogin: (cache?.users.length ?? 0) - profiles.length,
      withoutIdentifier: profiles.filter(u => !u.directoryObjectId).length, matched: matches.length },
    warning: cache ? null : 'Кэш AD недоступен. Показаны только зарегистрированные пользователи.' }
}
export async function provisionCachedUser(event: H3Event, cache: { users: unknown[] } | null, body: unknown) {
  await structureAdmin(event)
  const input = body as { directoryObjectId?: unknown; cacheLogin?: unknown } | null
  const guid = typeof input?.directoryObjectId === 'string' ? normalizeDirectoryObjectId(input.directoryObjectId) : null
  const login = typeof input?.cacheLogin === 'string' ? input.cacheLogin.trim().toLowerCase() : null
  if (!guid && !login) accessError(400, 'INVALID_DIRECTORY_GUID', 'Выберите пользователя из кэша AD.')
  const matches = cachedProfiles(cache?.users ?? []).filter(u => guid
    ? u.directoryObjectId === guid : u.login === login && !u.directoryObjectId)
  if (matches.length !== 1) accessError(409, 'CACHE_PROFILE_UNAVAILABLE', 'Профиль отсутствует или дублируется в кэше. Обновите кэш AD.')
  let profile = matches[0]!
  if (!profile.directoryObjectId) {
    let live: DirectoryUser | null
    try { live = await findDomainUser(profile.login, event) }
    catch { accessError(503, 'AD_PROFILE_UNVERIFIED', 'Не удалось проверить идентификатор в AD. Пользователь не создан.') }
    if (!live?.directoryObjectId || live.login !== profile.login)
      accessError(409, 'AD_IDENTITY_REQUIRED', 'AD не вернул идентификатор выбранного пользователя. Обновите кэш и проверьте импорт.')
    profile = live
  }
  try {
    return await prisma.$transaction(async tx => {
      const actor = await structureAdmin(event, tx)
      const existing = await tx.user.findUnique({ where: { directoryObjectId: profile.directoryObjectId! } })
      if (existing) {
        if (existing.authType !== 'DOMAIN') accessError(409, 'IDENTITY_CONFLICT', 'Идентификатор уже используется другой учётной записью.')
        return { item: memberOption(existing), created: false }
      }
      // Do not attach cache identities to existing login/email records, even if GUID is missing.
      if (await tx.user.findFirst({ where: { OR: [{ login: profile.login }, ...(profile.email ? [{ email: profile.email.toLowerCase() }] : [])] } }))
        accessError(409, 'IDENTITY_CONFLICT', 'Логин или email уже занят. Проверьте связь существующей учётной записи с AD.')
      const user = await ensureDomainUser(profile, tx)
      const pending = await tx.user.update({ where: { id: user.id }, data: { status: 'PENDING_ACTIVATION' } })
      await structureAudit(event, tx, actor, 'User', pending.id, { exists: false },
        { exists: true, status: pending.status, directoryObjectId: pending.directoryObjectId, departmentId: pending.departmentId },
        `Учётная запись «${pending.login}» подготовлена из кэша AD без разрешения входа`)
      return { item: memberOption(pending), created: true }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002','P2034'].includes(e.code))
      accessError(409, 'PROVISION_CONFLICT', 'Пользователь уже создан или изменён параллельно. Обновите поиск.')
    throw e
  }
}
export async function activateDomainUser(event: H3Event, body: unknown) {
  await structureAdmin(event)
  const b = body as { userId?: unknown; updatedAt?: unknown } | null
  const id = parseAccessId(b?.userId)
  if (typeof b?.updatedAt !== 'string') accessError(400, 'USER_VERSION_REQUIRED', 'Обновите данные пользователя.')
  const original = await prisma.user.findUnique({ where: { id } })
  if (!original || original.authType !== 'DOMAIN' || !original.login || !original.directoryObjectId)
    accessError(409, 'DOMAIN_IDENTITY_REQUIRED', 'Требуется доменная учётная запись с objectGUID.')
  if (!['PENDING_ACTIVATION','DISABLED'].includes(original.status))
    accessError(409, 'ACTIVATION_UNAVAILABLE', 'Активировать можно ожидающую или отключённую запись. Заблокированную запись нужно разблокировать отдельно.')
  let profile: DirectoryUser | null
  try { profile = await findDomainUser(original.login, event) }
  catch { accessError(503, 'AD_ACTIVATION_UNVERIFIED', 'Не удалось проверить пользователя в AD. Активация не выполнена.') }
  if (!profile || profile.directoryObjectId?.toLowerCase() !== original.directoryObjectId.toLowerCase())
    accessError(409, 'AD_IDENTITY_CHANGED', 'Профиль AD отсутствует или его objectGUID изменился.')
  if (profile.accountDisabled) accessError(403, 'AD_ACCOUNT_DISABLED', 'Учётная запись отключена в AD. Активировать её в Space нельзя.')
  return prisma.$transaction(async tx => {
    const actor = await structureAdmin(event, tx)
    const current = await tx.user.findUniqueOrThrow({ where: { id } })
    if (current.updatedAt.toISOString() !== b.updatedAt || current.updatedAt.getTime() !== original.updatedAt.getTime()
      || current.status !== original.status || current.directoryObjectId !== original.directoryObjectId)
      accessError(409, 'USER_CHANGED', 'Пользователь изменён. Обновите состав группы и повторите действие.')
    const synced = await ensureDomainUser(profile!, tx)
    const active = await tx.user.update({ where: { id: synced.id }, data: { status: 'ACTIVE', activatedAt: new Date() } })
    await structureAudit(event, tx, actor, 'User', active.id, { status: original.status }, { status: 'ACTIVE' },
      `Доменная учётная запись «${active.login}» активирована в Space после проверки AD`)
    return { item: memberOption(active) }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 })
}
