import { defineEventHandler, readBody } from 'h3'
import { prisma } from '~~/server/utils/prisma'
import { writeAuditEvent } from '~~/server/utils/auditLog'
import { requirePermission, getAccessActor } from '~~/server/services/access-control.service'
import { findDirectoryGroup } from '~~/server/services/domain-group-directory.service'
import { accessError, requireAccessMutationRequest } from '~~/server/services/access-input'

export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  const viewer = await requirePermission(event, 'admin.users', 'VIEW')
  if (!viewer.isSystemAdmin) accessError(403, 'ACCESS_MANAGEMENT_ADMIN_ONLY', 'Добавлять группы может только системный администратор.')
  const body = await readBody(event)
  if (!body || typeof body.directoryObjectId !== 'string') accessError(400, 'INVALID_DIRECTORY_GUID', 'Выберите группу из каталога AD.')
  const group = await findDirectoryGroup(event, body.directoryObjectId)
  if (!group) accessError(404, 'DIRECTORY_GROUP_NOT_FOUND', 'Группа безопасности не найдена в AD.')
  const result = await prisma.$transaction(async tx => {
    const actor = await getAccessActor(event, tx)
    if (!actor.isSystemAdmin) accessError(403, 'ACCESS_MANAGEMENT_ADMIN_ONLY', 'Недостаточно полномочий.')
    const saved = await tx.domainGroup.upsert({ where: { directoryObjectId: group.directoryObjectId },
      create: group, update: { name: group.name, distinguishedName: group.distinguishedName } })
    await writeAuditEvent({ event, db: tx, category: 'ADMIN', result: 'SUCCESS', action: 'UPDATE',
      resourceKey: 'admin.users', entityType: 'DomainGroup', actorUserId: actor.user.id, actorLogin: actor.user.login,
      actorEmail: actor.user.email || actor.user.login || `user:${actor.user.id}`, actorAuthType: actor.user.authType,
      note: `Группа AD добавлена / обновлена: ${saved.name}`,
      changes: { directoryObjectId: { before: null, after: saved.directoryObjectId } },
    })
    return saved
  })
  return { item: { id: result.id, name: result.name, detail: result.distinguishedName, isActive: result.isActive } }
})
