import { AccessAction } from '@prisma/client'
import { createError, defineEventHandler, readBody, setHeader } from 'h3'
import { prisma } from '../../utils/prisma'
import { requirePermission } from '../../services/access-control.service'
import { getLabFilterFacets } from '../../services/lab/filter-facets.service'
import { labFilterDateError, normalizeLabFilters } from '../../../shared/utils/lab-filter-values'

export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.sampling-tests', AccessAction.VIEW)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const body = await readBody(event)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw createError({ statusCode: 400, message: 'Ожидается объект параметров фильтра.' })
  }
  const filters = normalizeLabFilters(body.filters)
  const dateError = labFilterDateError(filters)
  if (dateError) throw createError({ statusCode: 400, message: dateError })
  // The draft is explicit. Do not mix in the previously applied filter cookie.
  return getLabFilterFacets(prisma, filters)
})
