import { spaceGroupMembership } from './space-group-access.service'
import { AccessAction, type Prisma } from '@prisma/client'
import { createError, type H3Event } from 'h3'
import { prisma } from '../utils/prisma'
import { auditDenied } from '../utils/auditLog'
import { decideAccess, isSystemAdminLogin } from '../../shared/utils/access-decision'
import type { AccessSource } from '../../shared/types/access-management'
import { getDomainGroupContext } from './domain-group-access.service'
import { isSystemAdminOperation } from './access-catalog'

export type PermissionContext = {
  userId: number
  login: string | null
  resourceId: number
  resourceKey: string
  action: AccessAction
  isSystemAdmin: boolean
  source: AccessSource
  sources: AccessSource[]
  departmentId?: number
}

export async function getAccessActor(event: H3Event, db: Prisma.TransactionClient = prisma) {
  const session = await getUserSession(event)
  const userId = session?.user?.id
  if (typeof userId !== 'number' || !Number.isSafeInteger(userId) || userId <= 0) {
    throw createError({ statusCode: 401, statusMessage: 'Authentication required' })
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, login: true, email: true, authType: true, status: true, directoryObjectId: true,
      department: { select: { id: true, name: true, isActive: true } },
    },
  })
  if (!user) throw createError({ statusCode: 401, statusMessage: 'User not found' })
  if (user.status !== 'ACTIVE') {
    throw createError({ statusCode: 403, statusMessage: 'User is not active',
      data: { code: 'USER_INACTIVE', message: 'Учётная запись заблокирована или отключена.' } })
  }
  return { user, isSystemAdmin: isSystemAdminLogin(user.login, useRuntimeConfig(event).adminLogins) }
}

/** Every call reads current DB state: revocation does not wait for a new login. */
export async function requirePermission(
  event: H3Event, resourceKey: string, action: AccessAction,
): Promise<PermissionContext> {
  const actor = await getAccessActor(event)
  const resource = await prisma.accessResource.findUnique({
    where: { key: resourceKey }, select: { id: true, key: true, isActive: true },
  })
  if (!resource) throw createError({ statusCode: 500, statusMessage: 'Access resource configuration error' })
  const departmentId = actor.user.department?.isActive ? actor.user.department.id : null
  const [direct, inherited] = actor.isSystemAdmin ? [null, null] : await Promise.all([
    prisma.userPermission.findFirst({
      where: { userId: actor.user.id, resourceId: resource.id, action }, select: { id: true },
    }),
    departmentId ? prisma.departmentPermission.findFirst({
      where: { departmentId, resourceId: resource.id, action }, select: { id: true },
    }) : null,
  ])
  let decision = decideAccess({
    userActive: actor.user.status === 'ACTIVE', resourceActive: resource.isActive,
    systemAdmin: actor.isSystemAdmin, direct: !!direct,
    systemAdminOnly: isSystemAdminOperation(resource.key),
    departmentActive: !!departmentId, departmentGranted: !!inherited,
  })
  if (!decision.allowed && decision.blockedBy === 'NO_PERMISSION') {
    const localGrant = await prisma.spaceGroupPermission.findFirst({ where: {
      resourceId: resource.id, action, group: spaceGroupMembership(actor.user.id),
    } })
    if (localGrant) decision = { allowed: true, sources: ['SPACE_GROUP'], blockedBy: null }
  }
  if (!decision.allowed && decision.blockedBy === 'NO_PERMISSION' && actor.user.authType === 'DOMAIN') {
    const grants = await prisma.domainGroupPermission.findMany({
      where: { resourceId: resource.id, action, domainGroup: { isActive: true } },
      select: { domainGroup: { select: { directoryObjectId: true } } },
    })
    const linked = await prisma.spaceGroupPermission.count({ where: { resourceId: resource.id, action,
      group: { isActive: true, domainGroups: { some: { domainGroup: { isActive: true } } } },
    } })
    if (grants.length || linked) {
      const membership = await getDomainGroupContext(event, actor.user)
      if (membership.warning) throw createError({ statusCode: 503, statusMessage: 'AD_GROUP_ACCESS_UNVERIFIED',
        data: { code: 'AD_GROUP_ACCESS_UNVERIFIED', message: membership.warning } })
      const viaSpace = linked && await prisma.spaceGroupPermission.findFirst({ where: {
        resourceId: resource.id, action, group: spaceGroupMembership(actor.user.id, membership.ids),
      } })
      if (viaSpace) decision = { allowed: true, sources: ['SPACE_GROUP'], blockedBy: null }
      if (grants.some(p => membership.ids.includes(p.domainGroup.directoryObjectId))) {
        decision = { allowed: true, sources: ['DOMAIN_GROUP'], blockedBy: null }
      }
    }
  }
  if (!decision.allowed) {
    await auditDenied({ event, actorUserId: actor.user.id, actorLogin: actor.user.login,
      actorEmail: actor.user.email, actorAuthType: actor.user.authType, resourceKey, action })
    throw createError({ statusCode: 403, statusMessage: 'Permission denied',
      data: { code: decision.blockedBy === 'RESOURCE_INACTIVE' ? 'RESOURCE_INACTIVE' : 'PERMISSION_DENIED',
        resource: resourceKey, action, message: 'Недостаточно прав или ресурс отключён.' } })
  }
  return {
    userId: actor.user.id, login: actor.user.login?.trim().toLowerCase() ?? null,
    resourceId: resource.id, resourceKey: resource.key, action,
    isSystemAdmin: actor.isSystemAdmin, source: decision.sources[0]!, sources: decision.sources,
    ...(departmentId && decision.sources.includes('DEPARTMENT') ? { departmentId } : {}),
  }
}
