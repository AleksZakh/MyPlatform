import { defineEventHandler, setResponseHeader } from 'h3'
import { exportJobForRequest } from '../../../../utils/lab-export-access'
import { jobView } from '../../../../services/lab-export-store'
export default defineEventHandler(async event => {
  const job = await exportJobForRequest(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return jobView(job)
})
