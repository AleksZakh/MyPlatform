import { defineEventHandler, getRouterParam } from 'h3'
import { prisma } from '../../../utils/prisma'
import { parseAccessId } from '../../../services/access-input'
import { structureAdmin } from '../../../services/structure-admin.service'
import { spaceGroupSnapshot } from '../../../services/space-group-management.service'
export default defineEventHandler(async event => {
  await structureAdmin(event)
  return spaceGroupSnapshot(prisma, parseAccessId(getRouterParam(event, 'id')))
})
