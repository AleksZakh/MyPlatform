import { defineEventHandler, setResponseHeader } from 'h3'
import { exportActor } from '../../../utils/lab-export-access'
import { listJobs, jobView } from '../../../services/lab-export-store'
export default defineEventHandler(async event => {
  const actor = await exportActor(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return (await listJobs(actor)).filter(j => Date.parse(j.expiresAt) > Date.now()).reverse().map(jobView)
})
