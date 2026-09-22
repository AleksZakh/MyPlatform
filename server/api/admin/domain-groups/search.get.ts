import { defineEventHandler, getQuery } from 'h3'
import { requirePermission } from '~~/server/services/access-control.service'
import { searchDirectoryGroups } from '~~/server/services/domain-group-directory.service'
import { accessError } from '~~/server/services/access-input'

export default defineEventHandler(async event => {
  const actor = await requirePermission(event, 'admin.users', 'VIEW')
  if (!actor.isSystemAdmin) accessError(403, 'ACCESS_MANAGEMENT_ADMIN_ONLY', 'Поиск новых групп доступен системному администратору.')
  const search = getQuery(event).search
  if (typeof search !== 'string' || search.trim().length < 2 || search.length > 120) {
    accessError(400, 'INVALID_GROUP_SEARCH', 'Введите от 2 до 120 символов названия группы.')
  }
  const groups = await searchDirectoryGroups(event, search)
  return { items: groups.slice(0, 50), hasMore: groups.length > 50 }
})
