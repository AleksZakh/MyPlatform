import { Prisma } from '@prisma/client'
import type { H3Event } from 'h3'
import { prisma } from '../utils/prisma'
import { accessError, parseAccessId } from './access-input'
import { structureAdmin, structureAudit, structureRevision } from './structure-admin.service'

export async function spaceGroupSnapshot(db: Prisma.TransactionClient, id: number) {
  const group = await db.spaceGroup.findUnique({ where: { id }, include: {
    users: { include: { user: { select: { id: true, login: true, fullName: true, email: true, status: true, authType: true, updatedAt: true, directoryObjectId: true } } }, orderBy: { userId: 'asc' } },
    domainGroups: { include: { domainGroup: { select: { id: true, name: true, isActive: true } } }, orderBy: { domainGroupId: 'asc' } },
  } })
  if (!group) accessError(404, 'SPACE_GROUP_NOT_FOUND', 'Группа Space не найдена.')
  return { group, revision: structureRevision(group) }
}
export function parseSpaceGroup(value: unknown) {
  const b = value as Record<string, unknown> | null
  if (!b || typeof b.name !== 'string' || !b.name.trim() || b.name.trim().length > 255 || b.name.includes('\0')
    || typeof b.isActive !== 'boolean') accessError(400, 'INVALID_SPACE_GROUP', 'Укажите название и состояние группы.')
  function ids(value: unknown) {
    if (!Array.isArray(value) || value.length > 1000) accessError(400, 'INVALID_MEMBERS', 'Допустимо до 1000 участников каждого типа.')
    return [...new Set(value.map(parseAccessId))]
  }
  return { name: b.name.normalize('NFC').replace(/\s+/g, ' ').trim(), isActive: b.isActive,
    userIds: ids(b.userIds), domainGroupIds: ids(b.domainGroupIds), revision: b.revision }
}
export async function saveSpaceGroup(event: H3Event, id: number | null, body: unknown) {
  await structureAdmin(event)
  const input = parseSpaceGroup(body)
  try {
    return await prisma.$transaction(async tx => {
      const actor = await structureAdmin(event, tx)
      const previous = id ? await spaceGroupSnapshot(tx, id) : null
      if (previous && previous.revision !== input.revision) accessError(409, 'STRUCTURE_CONFLICT', 'Состав группы изменился. Загрузите его заново.')
      const [users, domains] = await Promise.all([
        tx.user.count({ where: { id: { in: input.userIds } } }),
        tx.domainGroup.count({ where: { id: { in: input.domainGroupIds } } }),
      ])
      if (users !== input.userIds.length || domains !== input.domainGroupIds.length)
        accessError(400, 'MEMBER_NOT_FOUND', 'Один из выбранных участников больше не существует.')
      const group = id ? await tx.spaceGroup.update({ where: { id }, data: { name: input.name, isActive: input.isActive } })
        : await tx.spaceGroup.create({ data: { name: input.name, isActive: input.isActive } })
      await tx.spaceGroupUser.deleteMany({ where: { groupId: group.id } })
      await tx.spaceGroupDomain.deleteMany({ where: { groupId: group.id } })
      if (input.userIds.length) await tx.spaceGroupUser.createMany({ data: input.userIds.map(userId => ({ groupId: group.id, userId })) })
      if (input.domainGroupIds.length) await tx.spaceGroupDomain.createMany({ data: input.domainGroupIds.map(domainGroupId => ({ groupId: group.id, domainGroupId })) })
      const before = previous ? { name: previous.group.name, isActive: previous.group.isActive,
        userIds: previous.group.users.map(m => m.userId), domainGroupIds: previous.group.domainGroups.map(m => m.domainGroupId) } : { name: '', isActive: false, userIds: [], domainGroupIds: [] }
      await structureAudit(event, tx, actor, 'SpaceGroup', group.id, before,
        { name: input.name, isActive: input.isActive, userIds: input.userIds, domainGroupIds: input.domainGroupIds },
        `Изменена группа Space «${group.name}» и её состав`)
      return spaceGroupSnapshot(tx, group.id)
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 10000 })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(e.code))
      accessError(409, 'STRUCTURE_CONFLICT', 'Название уже занято или группа изменена параллельно. Обновите данные.')
    throw e
  }
}
