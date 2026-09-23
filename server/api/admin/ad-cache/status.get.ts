import { adCacheRefreshStatus } from '../../../services/ad-cache-refresh.service'
import { defineEventHandler } from 'h3'
import { structureAdmin } from '../../../services/structure-admin.service'
import { adCache } from '../../../utils/adCache'
export default defineEventHandler(async event => {
  await structureAdmin(event)
  const cache = await adCache.get()
  return { refresh: adCacheRefreshStatus(), lastUpdated: cache?.lastUpdated ?? null, usersCount: cache?.users.length ?? 0,
    expired: !cache || !Number.isFinite(Date.parse(cache.lastUpdated)) || Date.now() - Date.parse(cache.lastUpdated) > 3600000 }
})
