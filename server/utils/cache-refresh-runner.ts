/** One refresh at a time per server process. A failed fetch never overwrites the cache. */
export function createCacheRefreshRunner<T>(fetchUsers: () => Promise<T[]>, save: (users: T[]) => Promise<void>) {
  let pending: Promise<T[]> | null = null
  const state = { running: false, lastAttemptAt: null as string | null, lastSuccessAt: null as string | null, lastFailed: false }
  function refresh(): Promise<T[]> {
    if (pending) return pending
    state.running = true; state.lastAttemptAt = new Date().toISOString()
    pending = Promise.resolve().then(fetchUsers).then(async users => {
      await save(users)
      state.lastSuccessAt = new Date().toISOString(); state.lastFailed = false
      return users
    }).catch(error => { state.lastFailed = true; throw error }).finally(() => { state.running = false; pending = null })
    return pending
  }
  return { refresh, status: () => ({ ...state }) }
}
