import { defineEventHandler, readBody } from 'h3'
import { requireAccessMutationRequest } from '../../../services/access-input'
import { activateDomainUser } from '../../../services/directory-provision.service'
export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  return activateDomainUser(event, await readBody(event))
})
