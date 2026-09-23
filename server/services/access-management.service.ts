import { spaceGroupMembership } from './space-group-access.service'
import { getDomainGroupContext, emptyDomainGroupContext, type DomainGroupContext } from './domain-group-access.service'
import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../utils/prisma'
import { writeAuditEvent } from '../utils/auditLog'
import { getAccessActor, requirePermission } from './access-control.service'
import { accessError } from './access-input'
import { assignableActions, isSystemAdminOperation } from './access-catalog'
import { decideAccess, isSystemAdminLogin } from '../../shared/utils/access-decision'
import { ACCESS_ACTIONS, type AccessCell, type AccessMutation, type AccessSnapshot,
  type AccessSubjectKind, type AccessSubjectOption } from '../../shared/types/access-management'

const permissionSelect = {
  id: true, resourceId: true, action: true, grantedByLogin: true, updatedAt: true,
} satisfies Prisma.UserPermissionSelect

export async function buildAccessSnapshot(
  db: Prisma.TransactionClient, kind: AccessSubjectKind, id: number,
  adminLogins: unknown, canManage: boolean, membership: DomainGroupContext = emptyDomainGroupContext(),
): Promise<AccessSnapshot> {
  const user = kind === 'user' ? await db.user.findUnique({
    where: { id }, select: {
      id: true, fullName: true, login: true, email: true, status: true,
      department: { select: { id: true, name: true, isActive: true,
        permissions: { select: permissionSelect, orderBy: { id: 'asc' } } } },
      permissions: { select: permissionSelect, orderBy: { id: 'asc' } },
    },
  }) : null
  const department = kind === 'department' ? await db.department.findUnique({
    where: { id }, select: {
      id: true, name: true, isActive: true,
      permissions: { select: permissionSelect, orderBy: { id: 'asc' } },
      _count: { select: { users: true } },
    },
  }) : null
  const domainGroup = kind === 'domainGroup' ? await db.domainGroup.findUnique({
    where: { id }, include: { permissions: { select: permissionSelect, orderBy: { id: 'asc' } } },
  }) : null
  const spaceGroup = kind === 'spaceGroup' ? await db.spaceGroup.findUnique({
    where: { id }, include: { permissions: { select: permissionSelect, orderBy: { id: 'asc' } },
      _count: { select: { users: true, domainGroups: true } } },
  }) : null
  const spaceGrants = user ? await db.spaceGroupPermission.findMany({
    where: { group: spaceGroupMembership(user.id, membership.ids) },
    include: { group: { select: { id: true, name: true } } }, orderBy: { id: 'asc' },
  }) : []
  const groupGrants = user && membership.ids.length ? await db.domainGroupPermission.findMany({
    where: { domainGroup: { isActive: true, directoryObjectId: { in: membership.ids } } },
    include: { domainGroup: { select: { id: true, name: true } } }, orderBy: { id: 'asc' },
  }) : []
  if (!user && !department && !domainGroup && !spaceGroup) accessError(404, 'ACCESS_SUBJECT_NOT_FOUND', 'Получатель прав не найден.')
  const targetDepartment = user?.department ?? null
  const direct = user?.permissions ?? department?.permissions ?? domainGroup?.permissions ?? spaceGroup?.permissions ?? []
  const inherited = targetDepartment?.permissions ?? []
  const subject: AccessSnapshot['subject'] = {
    kind, id,
    name: user ? user.fullName || user.login || user.email || `Сотрудник #${id}` : (department || domainGroup || spaceGroup)!.name,
    isActive: user ? user.status === 'ACTIVE' : (department || domainGroup || spaceGroup)!.isActive,
    status: user ? user.status : (department || domainGroup || spaceGroup)!.isActive ? 'ACTIVE' : 'DISABLED',
    isSystemAdmin: !!user && isSystemAdminLogin(user.login, adminLogins),
    department: targetDepartment ? {
      id: targetDepartment.id, name: targetDepartment.name, isActive: targetDepartment.isActive,
    } : null,
    memberCount: department?._count.users ?? spaceGroup?._count.users ?? null,
  }
  // Include inactive resources so obsolete grants remain visible and revocable.
  const resources = await db.accessResource.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
    select: { id: true, key: true, name: true, description: true, type: true, isActive: true,
      departments: { select: { isOwner: true, department: { select: { name: true } } } } },
  })
  const directMap = new Map(direct.map(p => [`${p.resourceId}:${p.action}`, p]))
  const inheritedSet = new Set(inherited.map(p => `${p.resourceId}:${p.action}`))
  const data = resources.map(resource => {
    const supported = assignableActions(resource)
    const actions = Object.fromEntries(ACCESS_ACTIONS.map(action => {
      const key = `${resource.id}:${action}`
      const own = directMap.get(key)
      const inheritedGranted = !!targetDepartment?.isActive && inheritedSet.has(key)
      const decision = decideAccess({
        userActive: subject.isActive, resourceActive: resource.isActive,
        systemAdmin: subject.isSystemAdmin, direct: kind === 'user' && !!own,
        systemAdminOnly: isSystemAdminOperation(resource.key),
        departmentActive: kind === 'department' ? subject.isActive : !!targetDepartment?.isActive,
        spaceGroupGranted: kind === 'spaceGroup' ? !!own : spaceGrants.some(p => p.resourceId === resource.id && p.action === action),
        domainGroupGranted: kind === 'domainGroup' ? !!own : groupGrants.some(p => p.resourceId === resource.id && p.action === action),
        departmentGranted: kind === 'department' ? !!own : inheritedGranted,
      })
      const cell: AccessCell = {
        directGranted: !!own, inheritedGranted,
        spaceGroups: spaceGrants.filter(p => p.resourceId === resource.id && p.action === action).map(p => p.group),
        domainGroups: groupGrants.filter(p => p.resourceId === resource.id && p.action === action).map(p => p.domainGroup), systemGranted: subject.isSystemAdmin,
        effectiveGranted: decision.allowed, sources: decision.sources, blockedBy: decision.blockedBy,
        canGrant: canManage && resource.isActive && subject.isActive && supported.includes(action),
        canRevoke: canManage && !!own,
        grantedByLogin: own?.grantedByLogin ?? null,
      }
      return [action, cell]
    })) as AccessSnapshot['data'][number]['actions']
    return { id: resource.id, key: resource.key, name: resource.name,
      description: resource.description, type: resource.type, isActive: resource.isActive,
      group: resource.departments.filter(item => item.isOwner).map(item => item.department.name).sort().join(', ')
        || (resource.key.startsWith('admin.') ? 'Администрирование' : 'Общие ресурсы'),
      actions }
  })
  // Version includes inherited access, membership, status and catalog changes.
  const revision = createHash('sha256').update(JSON.stringify({ subject, direct, inherited, data, membership })).digest('hex')
  return { success: true, revision, directoryWarning: membership.warning, canManage, subject, actions: [...ACCESS_ACTIONS], data,
    summary: {
      totalResources: data.length,
      directPermissions: data.reduce((n, row) => n + ACCESS_ACTIONS.filter(a => row.actions[a].directGranted).length, 0),
      effectivePermissions: data.reduce((n, row) => n + ACCESS_ACTIONS.filter(a => row.actions[a].effectiveGranted).length, 0),
    } }
}

async function membershipForSubject(event: H3Event, kind: AccessSubjectKind, id: number) {
  if (kind !== 'user') return emptyDomainGroupContext()
  const user = await prisma.user.findUnique({ where: { id }, select: { authType: true, login: true, directoryObjectId: true, status: true } })
  return user ? getDomainGroupContext(event, user) : emptyDomainGroupContext()
}

export async function readAccessSnapshot(event: H3Event, kind: AccessSubjectKind, id: number) {
  const viewer = await requirePermission(event, 'admin.users', 'VIEW')
  const membership = await membershipForSubject(event, kind, id)
  return prisma.$transaction(tx => buildAccessSnapshot(
    tx, kind, id, useRuntimeConfig(event).adminLogins, viewer.isSystemAdmin, membership,
  ), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function saveAccessChanges(event: H3Event, kind: AccessSubjectKind, id: number, input: AccessMutation) {
  const viewer = await requirePermission(event, 'admin.users', 'VIEW')
  if (!viewer.isSystemAdmin) accessError(403, 'ACCESS_MANAGEMENT_ADMIN_ONLY', 'Назначать права пока может только системный администратор.')
  const membership = await membershipForSubject(event, kind, id)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(async tx => {
        // Recheck the actor inside the same transaction as the grants and audit.
        const actor = await getAccessActor(event, tx)
        if (!actor.isSystemAdmin) accessError(403, 'ACCESS_MANAGEMENT_ADMIN_ONLY', 'Недостаточно полномочий для назначения прав.')
        const snapshot = await buildAccessSnapshot(tx, kind, id, useRuntimeConfig(event).adminLogins, true, membership)
        if (snapshot.revision !== input.revision) {
          accessError(409, 'ACCESS_REVISION_CONFLICT', 'Права, состав отдела или ресурс изменились. Обновите матрицу и повторите действие.')
        }
        const rows = new Map(snapshot.data.map(row => [row.id, row]))
        // Validate the entire batch before changing the database.
        for (const change of input.changes) {
          const cell = rows.get(change.resourceId)?.actions[change.action]
          if (!cell) accessError(400, 'ACCESS_RESOURCE_NOT_FOUND', 'Ресурс отсутствует в каталоге.')
          if (change.granted && !cell.directGranted && !cell.canGrant) {
            accessError(400, 'ACCESS_GRANT_UNAVAILABLE', 'Ресурс, получатель или выбранная операция недоступны для назначения.')
          }
        }
        let changed = 0
        for (const change of input.changes) {
          const row = rows.get(change.resourceId)!
          const previous = row.actions[change.action].directGranted
          if (previous === change.granted) continue
          const entityType = kind === 'user' ? 'UserPermission' : kind === 'department' ? 'DepartmentPermission' : kind === 'domainGroup' ? 'DomainGroupPermission' : 'SpaceGroupPermission'
          if (change.granted) {
            const common = { resourceId: change.resourceId, action: change.action, grantedByLogin: actor.user.login }
            if (kind === 'user') await tx.userPermission.create({ data: { ...common, userId: id } })
            else if (kind === 'spaceGroup') await tx.spaceGroupPermission.create({ data: { ...common, groupId: id } })
            else if (kind === 'domainGroup') await tx.domainGroupPermission.create({ data: { ...common, domainGroupId: id } })
            else await tx.departmentPermission.create({ data: { ...common, departmentId: id } })
          } else if (kind === 'user') {
            await tx.userPermission.deleteMany({ where: { userId: id, resourceId: change.resourceId, action: change.action } })
          } else if (kind === 'spaceGroup') {
            await tx.spaceGroupPermission.deleteMany({ where: { groupId: id, resourceId: change.resourceId, action: change.action } })
          } else if (kind === 'domainGroup') {
            await tx.domainGroupPermission.deleteMany({ where: { domainGroupId: id, resourceId: change.resourceId, action: change.action } })
          } else {
            await tx.departmentPermission.deleteMany({ where: { departmentId: id, resourceId: change.resourceId, action: change.action } })
          }
          await writeAuditEvent({
            event, db: tx, category: 'ADMIN', result: 'SUCCESS', action: change.granted ? 'CREATE' : 'DELETE',
            resourceKey: row.key, entityType, targetUserId: kind === 'user' ? id : undefined,
            actorUserId: actor.user.id, actorLogin: actor.user.login,
            actorEmail: actor.user.email || actor.user.login || `user:${actor.user.id}`, actorAuthType: actor.user.authType,
            note: `${change.granted ? 'Выдано' : 'Отозвано'} ${change.action}: ${snapshot.subject.name} — ${row.name}`,
            changes: {
              granted: { before: previous, after: change.granted },
              subjectKind: { before: kind, after: kind }, subjectId: { before: id, after: id },
              resourceId: { before: row.id, after: row.id }, action: { before: change.action, after: change.action },
            },
          })
          changed++
        }
        const updated = await buildAccessSnapshot(tx, kind, id, useRuntimeConfig(event).adminLogins, true, membership)
        return { ...updated, changed }
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5000, timeout: 10000 })
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : null
      if (code === 'P2034' && attempt < 2) continue
      if (code === 'P2034' || code === 'P2002') {
        accessError(409, 'ACCESS_REVISION_CONFLICT', 'Права изменены параллельно. Обновите матрицу.')
      }
      throw error
    }
  }
  return accessError(409, 'ACCESS_REVISION_CONFLICT', 'Обновите матрицу.')
}

export async function listAccessSubjects(event: H3Event, kind: AccessSubjectKind, search: string) {
  await requirePermission(event, 'admin.users', 'VIEW')
  let items: AccessSubjectOption[]
  if (kind === 'user') {
    const users = await prisma.user.findMany({
      where: search ? { OR: ['fullName', 'login', 'email'].map(field => ({ [field]: { contains: search, mode: 'insensitive' as const } })) } : {},
      orderBy: [{ fullName: 'asc' }, { id: 'asc' }], take: 51,
      select: { id: true, fullName: true, login: true, email: true, status: true,
        department: { select: { name: true } } },
    })
    items = users.map(user => ({ id: user.id, name: user.fullName || user.login || user.email || `#${user.id}`,
      detail: [user.login || user.email, user.department?.name, user.status].filter(Boolean).join(' · '),
      isActive: user.status === 'ACTIVE' }))
  } else if (kind === 'spaceGroup') {
    const groups = await prisma.spaceGroup.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
      orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 51,
      include: { _count: { select: { users: true, domainGroups: true } } },
    })
    items = groups.map(g => ({ id: g.id, name: g.name,
      detail: `${g._count.users} пользователей · ${g._count.domainGroups} групп AD`, isActive: g.isActive }))
  } else if (kind === 'domainGroup') {
    const groups = await prisma.domainGroup.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
      orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 51,
    })
    items = groups.map(g => ({ id: g.id, name: g.name, detail: g.distinguishedName, isActive: g.isActive }))
  } else {
    const departments = await prisma.department.findMany({
      where: search ? { name: { contains: search, mode: 'insensitive' } } : {},
      orderBy: [{ name: 'asc' }, { id: 'asc' }], take: 51,
      select: { id: true, name: true, isActive: true, _count: { select: { users: true } } },
    })
    items = departments.map(department => ({ id: department.id, name: department.name,
      detail: `${department._count.users} сотрудников${department.isActive ? '' : ' · отключено'}`, isActive: department.isActive }))
  }
  return { items: items.slice(0, 50), hasMore: items.length > 50 }
}
