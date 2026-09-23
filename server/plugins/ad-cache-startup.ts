import { refreshAdCache } from '../services/ad-cache-refresh.service'
export default defineNitroPlugin(nitroApp => {
  // A failed LDAP connection must not prevent the application from starting.
  const timer = setTimeout(() => { void refreshAdCache('startup').catch(() => {}) }, 2000)
  timer.unref?.()
  nitroApp.hooks.hook('close', () => { clearTimeout(timer) })
})
