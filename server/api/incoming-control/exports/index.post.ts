import { defineEventHandler, readBody, setResponseHeader } from 'h3'
import { exportActor, auditExport } from '../../../utils/lab-export-access'
import { buildRegistryFilter, hasRegistryFilter, readRegistryFilters, describeRegistryFilters } from '../../../utils/incoming-control-filter'
import { createJob, jobView, parseOptions } from '../../../services/lab-export-store'
export default defineEventHandler(async event => {
  const actor = await exportActor(event, true)
  const options = parseOptions(await readBody(event))
  const filters = readRegistryFilters(event)
  const where = buildRegistryFilter(filters)
  const job = await createJob(actor, options, where, hasRegistryFilter(where), describeRegistryFilters(filters))
  await auditExport(event, actor, job.id, 'EXPORT_PREPARE')
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return jobView(job)
})
