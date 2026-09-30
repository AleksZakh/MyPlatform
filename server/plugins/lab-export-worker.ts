import { defineNitroPlugin } from 'nitropack/runtime'
import { runExportTick } from '../services/lab-export-worker'
export default defineNitroPlugin(nitroApp => {
  if (process.env.LAB_EXPORT_WORKER === '0') return
  // In a PM2 cluster, only instance zero runs background work.
  if (process.env.NODE_APP_INSTANCE && process.env.NODE_APP_INSTANCE !== '0') return
  const tick = () => { void runExportTick().catch(error => console.error('[lab-export-worker]', error)) }
  const timer = setInterval(tick, 2000)
  timer.unref()
  tick()
  nitroApp.hooks.hook('close', () => { clearInterval(timer) })
})
