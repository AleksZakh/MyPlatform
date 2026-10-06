import { defineEventHandler, setResponseHeader } from 'h3'
import { exportActor } from '../../../utils/lab-export-access'
import { readRegistryFilters, buildRegistryFilter } from '../../../utils/incoming-control-filter'
import { prisma } from '../../../utils/prisma'
import { getExportRecordLimit } from '../../../services/lab-export-settings'
export default defineEventHandler(async event => {
  await exportActor(event)
  const where = buildRegistryFilter(readRegistryFilters(event))
  const [total, recordLimit] = await Promise.all([
    prisma.samplingTest.count({ where }), getExportRecordLimit(),
  ])
  setResponseHeader(event, 'Cache-Control', 'private, no-store')
  return { total, recordLimit, allowed: total <= recordLimit }
})
