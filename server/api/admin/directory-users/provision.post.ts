import { defineEventHandler, readBody } from 'h3'
import { adCache } from '../../../utils/adCache'
import { requireAccessMutationRequest } from '../../../services/access-input'
import { structureAdmin } from '../../../services/structure-admin.service'
import { provisionCachedUser } from '../../../services/directory-provision.service'
export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  await structureAdmin(event)
  return provisionCachedUser(event, await adCache.get(), await readBody(event))
})
