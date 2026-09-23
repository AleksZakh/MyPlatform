import { defineEventHandler, readBody } from 'h3'
import { requireAccessMutationRequest } from '../../../services/access-input'
import { structureAdmin } from '../../../services/structure-admin.service'
import { syncDepartment } from '../../../services/department-sync.service'
import { adCache } from '../../../utils/adCache'
export default defineEventHandler(async event => {
  requireAccessMutationRequest(event)
  await structureAdmin(event)
  return syncDepartment(event, await adCache.get(), await readBody(event))
})
