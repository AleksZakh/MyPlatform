import { defineEventHandler, getRouterParam } from 'h3'
import { readAccessSnapshot } from '~~/server/services/access-management.service'
import { parseAccessId } from '~~/server/services/access-input'

export default defineEventHandler(async event => {
  const id = parseAccessId(getRouterParam(event, 'id'))
  return readAccessSnapshot(event, 'spaceGroup', id)
})
