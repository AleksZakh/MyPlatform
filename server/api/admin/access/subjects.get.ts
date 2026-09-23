import { defineEventHandler, getQuery } from 'h3'
import { listAccessSubjects } from '~~/server/services/access-management.service'
import { accessError } from '~~/server/services/access-input'

export default defineEventHandler(async event => {
  const query = getQuery(event)
  if (query.kind !== 'user' && query.kind !== 'department' && query.kind !== 'domainGroup' && query.kind !== 'spaceGroup') {
    accessError(400, 'INVALID_ACCESS_KIND', 'Выберите тип получателя прав.')
  }
  if (query.search !== undefined && (typeof query.search !== 'string' || query.search.length > 120)) {
    accessError(400, 'INVALID_ACCESS_SEARCH', 'Поиск ограничен 120 символами.')
  }
  return listAccessSubjects(event, query.kind, typeof query.search === 'string' ? query.search.trim() : '')
})
