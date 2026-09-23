import { defineEventHandler, readBody } from 'h3'
import { requireAccessMutationRequest } from '../../../services/access-input'
import { saveSpaceGroup } from '../../../services/space-group-management.service'
export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  return saveSpaceGroup(event, null, await readBody(event))
})
