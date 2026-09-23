import type { H3Event } from 'h3'
import { prisma } from '../utils/prisma'
import { resolveDomainGroupIds } from './domain-group-directory.service'

export interface DomainGroupContext { ids: string[]; warning: string | null }
export const emptyDomainGroupContext = (): DomainGroupContext => ({ ids: [], warning: null })

export async function getDomainGroupContext(event: H3Event, user: {
  authType: string; login: string | null; directoryObjectId: string | null; status: string
}): Promise<DomainGroupContext> {
  if (user.authType !== 'DOMAIN' || user.status !== 'ACTIVE') return emptyDomainGroupContext()
  if (!await prisma.domainGroupPermission.count({ where: { domainGroup: { isActive: true } } })
    && !await prisma.spaceGroupDomain.count({ where: { group: { isActive: true, permissions: { some: {} } }, domainGroup: { isActive: true } } })) return emptyDomainGroupContext()
  if (!user.directoryObjectId || !user.login) return { ids: [], warning: 'Нет связи с objectGUID AD. Выполните повторный доменный вход для проверки групп.' }
  try {
    // Cache only in this request, not in a cookie or between requests. AD revocation is rechecked.
    const lookups = event.context.spaceGroupLookups ??= new Map<string, Promise<string[]>>()
    if (!lookups.has(user.directoryObjectId)) lookups.set(user.directoryObjectId, resolveDomainGroupIds(event, user.directoryObjectId, user.login))
    return { ids: await lookups.get(user.directoryObjectId)!, warning: null }
  } catch {
    return { ids: [], warning: 'Группы AD не проверены: каталог недоступен или не настроена область поиска. Их права сейчас не подтверждены.' }
  }
}
