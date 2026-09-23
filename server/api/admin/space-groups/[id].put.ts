import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { parseAccessId, requireAccessMutationRequest } from '../../../services/access-input'
import { saveSpaceGroup } from '../../../services/space-group-management.service'
export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  return saveSpaceGroup(event, parseAccessId(getRouterParam(event, 'id')), await readBody(event))
})
