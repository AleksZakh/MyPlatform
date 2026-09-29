import { defineEventHandler, getQuery } from 'h3';
import { adCache } from '../../utils/adCache';
import { listDomainUsers } from '../../services/ad-directory.service';

export default defineEventHandler(async (event) => {
  const cached = await adCache.get();
  if (getQuery(event).refresh !== 'true' && cached && !await adCache.isExpired()) {
    return { success: true, users: cached.users, count: cached.totalCount,
      fromCache: true, lastUpdated: cached.lastUpdated };
  }
  const users = await listDomainUsers(event);
  await adCache.set(users);
  return { success: true, users, count: users.length, fromCache: false,
    lastUpdated: new Date().toISOString() };
});
