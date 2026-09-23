import type { Prisma } from '@prisma/client'

/** Direct membership and live AD membership are alternative paths; inactive groups never grant. */
export function spaceGroupMembership(userId: number, directoryIds: string[] = []): Prisma.SpaceGroupWhereInput {
  return { isActive: true, OR: [
    { users: { some: { userId } } },
    ...(directoryIds.length ? [{ domainGroups: { some: { domainGroup: {
      isActive: true, directoryObjectId: { in: directoryIds },
    } } } }] : []),
  ] }
}
