import { defineEventHandler, getQuery } from 'h3'
import { adCache } from '../../../utils/adCache'
import { accessError } from '../../../services/access-input'
import { structureAdmin } from '../../../services/structure-admin.service'
import { listStructureMembers } from '../../../services/directory-provision.service'
export default defineEventHandler(async event => {
  await structureAdmin(event)
  const search = getQuery(event).search ?? ''
  if (typeof search !== 'string' || search.length > 120) accessError(400, 'INVALID_SEARCH', 'Поиск ограничен 120 символами.')
  return listStructureMembers(event, await adCache.get(), search)
})
