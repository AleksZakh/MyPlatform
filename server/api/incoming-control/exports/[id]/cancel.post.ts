import { defineEventHandler } from 'h3'
import { exportJobForRequest, auditExport } from '../../../../utils/lab-export-access'
import { cancelJob } from '../../../../services/lab-export-store'
export default defineEventHandler(async event => {
  const job = await exportJobForRequest(event, true)
  await cancelJob(job)
  await auditExport(event, job.ownerId, job.id, 'EXPORT_CANCEL')
  return { success: true }
})
