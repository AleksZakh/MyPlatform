import type { Prisma } from '@prisma/client';
import type { H3Event } from 'h3';
import { prisma } from '../utils/prisma';
import { isUptsDepartment, isUptsGroup } from '../../shared/utils/upts-membership';
import { spaceGroupMembership } from './space-group-access.service';
import { resolveDomainGroupIds } from './domain-group-directory.service';

type MemberUser = {
  id: number; status: string;
  department: { key: string; name: string; isActive: boolean } | null;
};
type DirectoryUser = MemberUser & { authType: string; login: string | null; directoryObjectId: string | null };

/** Current DB membership, also usable inside a project transaction. No cross-request cache. */
export async function hasUptsMembership(db: Prisma.TransactionClient, user: MemberUser | null,
  isSystemAdmin: boolean, directoryIds: string[] = [], allowPending = false): Promise<boolean> {
  if (!user || (user.status !== 'ACTIVE' && !(allowPending && user.status === 'PENDING_ACTIVATION'))) return false;
  if (isSystemAdmin || isUptsDepartment(user.department)) return true;
  const groups = await db.spaceGroup.findMany({ where: spaceGroupMembership(user.id, directoryIds),
    select: { name: true, isActive: true } });
  if (groups.some(isUptsGroup)) return true;
  if (!directoryIds.length) return false;
  const domainGroups = await db.domainGroup.findMany({ where: { isActive: true, directoryObjectId: { in: directoryIds } },
    select: { name: true, isActive: true } });
  return domainGroups.some(isUptsGroup);
}

/** Live AD lookups happen before write transactions, and only for configured UPTS groups. */
export async function resolveUptsMembership(event: H3Event, user: DirectoryUser,
  isSystemAdmin: boolean, directoryIds: string[] = [], allowPending = false) {
  const result = { allowed: false, directoryIds, unavailable: false };
  if (await hasUptsMembership(prisma, user, isSystemAdmin, directoryIds, allowPending)) return { ...result, allowed: true };
  if (user.authType !== 'DOMAIN' || user.status !== 'ACTIVE') return result;
  const [linked, domain] = await Promise.all([
    prisma.spaceGroup.findMany({ where: { isActive: true, domainGroups: { some: { domainGroup: { isActive: true } } } }, select: { name: true, isActive: true } }),
    prisma.domainGroup.findMany({ where: { isActive: true }, select: { name: true, isActive: true } }),
  ]);
  if (!linked.some(isUptsGroup) && !domain.some(isUptsGroup)) return result;
  if (!user.directoryObjectId || !user.login) return { ...result, unavailable: true };
  try {
    const lookups = event.context.spaceGroupLookups ??= new Map<string, Promise<string[]>>();
    if (!lookups.has(user.directoryObjectId)) lookups.set(user.directoryObjectId, resolveDomainGroupIds(event, user.directoryObjectId, user.login));
    const ids = await lookups.get(user.directoryObjectId)!;
    return { allowed: await hasUptsMembership(prisma, user, isSystemAdmin, ids, allowPending), directoryIds: ids, unavailable: false };
  } catch {
    return { ...result, unavailable: true }; // Never replace unverified AD membership with a cached grant.
  }
}
