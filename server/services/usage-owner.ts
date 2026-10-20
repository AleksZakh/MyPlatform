import type { Prisma } from '@prisma/client';

// Dedicated domain account, independent of administrator roles and delegated grants.
export const STATISTICS_OWNER_LOGIN = 'zakharov_av';
export function isStatisticsOwner(user: {login?: string | null; authType?: string | null}): boolean {
  return user.authType === 'DOMAIN' && user.login?.toLowerCase() === STATISTICS_OWNER_LOGIN;
}
export const statisticsOwnerWhere: Prisma.UserWhereInput = {
  authType:'DOMAIN', login:{equals:STATISTICS_OWNER_LOGIN,mode:'insensitive'},
};
