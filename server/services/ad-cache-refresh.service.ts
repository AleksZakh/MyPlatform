import { listDomainUsers } from './ad-directory.service'
import { adCache } from '../utils/adCache'
import { createCacheRefreshRunner } from '../utils/cache-refresh-runner'
const runner = createCacheRefreshRunner(() => listDomainUsers(), users => adCache.set(users))
export const adCacheRefreshStatus = runner.status
export async function refreshAdCache(source: 'startup' | 'scheduled' | 'manual') {
  const started = Date.now()
  try {
    const users = await runner.refresh()
    console.info(`[AD-CACHE] source=${source} result=success users=${users.length} durationMs=${Date.now() - started}`)
    return users
  } catch (error) {
    console.error(`[AD-CACHE] source=${source} result=error; previous cache retained`, error)
    throw error
  }
}
