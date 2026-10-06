import { defineEventHandler, setResponseHeader } from 'h3'
import { requireAdmin } from '../../../utils/require-admin'
import { getExportRecordLimit } from '../../../services/lab-export-settings'
export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { recordLimit: await getExportRecordLimit() }
})
