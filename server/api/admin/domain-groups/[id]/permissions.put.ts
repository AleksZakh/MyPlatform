import { defineEventHandler, getRouterParam, readBody } from 'h3'
import { saveAccessChanges } from '~~/server/services/access-management.service'
import { parseAccessId, parseAccessMutation, requireAccessMutationRequest } from '~~/server/services/access-input'

export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  const id = parseAccessId(getRouterParam(event, 'id'))
  const input = parseAccessMutation(await readBody<unknown>(event))
  return saveAccessChanges(event, 'domainGroup', id, input)
})
