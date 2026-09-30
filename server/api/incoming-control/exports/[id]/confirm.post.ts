import { defineEventHandler, readBody } from 'h3'
import { exportJobForRequest, auditExport } from '../../../../utils/lab-export-access'
import { confirmJob } from '../../../../services/lab-export-store'
export default defineEventHandler(async event => {
  const job = await exportJobForRequest(event, true)
  const body = await readBody<{ confirmAll?: boolean }>(event)
  await confirmJob(job, body?.confirmAll === true)
  await auditExport(event, job.ownerId, job.id, 'EXPORT_START')
  return { success: true }
})
