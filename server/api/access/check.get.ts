import { defineEventHandler, getQuery, setHeader } from 'h3'
import { requirePermission } from '~~/server/services/access-control.service'
import { accessError } from '~~/server/services/access-input'
import { ACCESS_ACTIONS, type AccessActionName } from '~~/shared/types/access-management'

/** Checks only the current session; never accepts another user's id. */
export default defineEventHandler(async event => {
  // Server-owned marker on this capability-only route; never read from client headers.
  event.context.accessCapabilityProbe = true
  setHeader(event, 'Cache-Control', 'private, no-store')
  const query = getQuery(event)
  if (typeof query.resource !== 'string' || !query.resource || query.resource.length > 150
    || typeof query.action !== 'string' || !ACCESS_ACTIONS.includes(query.action as AccessActionName)) {
    accessError(400, 'INVALID_ACCESS_CHECK', 'Укажите ресурс и действие VIEW / CREATE / UPDATE / DELETE.')
  }
  try {
    const permission = await requirePermission(event, query.resource, query.action as AccessActionName, { auditDenial: false })
    return { allowed: true, resource: permission.resourceKey, action: permission.action, sources: permission.sources }
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode !== 403) throw error
    return { allowed: false, resource: query.resource, action: query.action, sources: [] }
  }
})
