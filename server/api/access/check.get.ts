import { defineEventHandler, getQuery } from 'h3'
import { requirePermission } from '~~/server/services/access-control.service'
import { accessError } from '~~/server/services/access-input'
import { ACCESS_ACTIONS, type AccessActionName } from '~~/shared/types/access-management'

/** Checks only the current session; never accepts another user's id. */
export default defineEventHandler(async event => {
  const query = getQuery(event)
  if (typeof query.resource !== 'string' || !query.resource || query.resource.length > 150
    || typeof query.action !== 'string' || !ACCESS_ACTIONS.includes(query.action as AccessActionName)) {
    accessError(400, 'INVALID_ACCESS_CHECK', 'Укажите ресурс и действие VIEW / CREATE / UPDATE / DELETE.')
  }
  const permission = await requirePermission(event, query.resource, query.action as AccessActionName)
  return { allowed: true, resource: permission.resourceKey, action: permission.action, sources: permission.sources }
})
