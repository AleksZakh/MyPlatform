import { createError, getRequestHeader, type H3Event } from 'h3'
import { ACCESS_ACTIONS, type AccessMutation } from '../../shared/types/access-management'

export function accessError(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, data: { code, message } })
}

export function parseAccessId(value: unknown): number {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value) : ''
  const id = Number(text)
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(id) || id > 2_147_483_647) {
    accessError(400, 'INVALID_ACCESS_ID', 'Некорректный идентификатор.')
  }
  return id
}

export function parseAccessMutation(value: unknown): AccessMutation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    accessError(400, 'INVALID_ACCESS_BODY', 'Ожидается объект с изменениями прав.')
  }
  const body = value as Record<string, unknown>
  if (typeof body.revision !== 'string' || !/^[a-f0-9]{64}$/.test(body.revision)) {
    accessError(400, 'ACCESS_REVISION_REQUIRED', 'Обновите матрицу перед изменением прав.')
  }
  if (!Array.isArray(body.changes) || !body.changes.length || body.changes.length > 200) {
    accessError(400, 'INVALID_ACCESS_CHANGES', 'Допустимо от 1 до 200 изменений.')
  }
  const seen = new Set<string>()
  const changes = body.changes.map(item => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      accessError(400, 'INVALID_ACCESS_CHANGE', 'Некорректное изменение права.')
    }
    const change = item as Record<string, unknown>
    const resourceId = parseAccessId(change.resourceId)
    if (typeof change.action !== 'string' || !ACCESS_ACTIONS.includes(change.action as never)
      || typeof change.granted !== 'boolean') {
      accessError(400, 'INVALID_ACCESS_CHANGE', 'Некорректное действие или значение разрешения.')
    }
    const action = change.action as AccessMutation['changes'][number]['action']
    const key = `${resourceId}:${action}`
    if (seen.has(key)) accessError(400, 'DUPLICATE_ACCESS_CHANGE', 'Одно право указано несколько раз.')
    seen.add(key)
    return { resourceId, action, granted: change.granted }
  })
  return { revision: body.revision, changes }
}

/** A custom header prevents cross-site simple form submissions with a session cookie. */
export function requireAccessMutationRequest(event: H3Event): void {
  if (getRequestHeader(event, 'x-space-access-change') !== '1'
    || getRequestHeader(event, 'sec-fetch-site') === 'cross-site'
    || !getRequestHeader(event, 'content-type')?.toLowerCase().startsWith('application/json')) {
    accessError(403, 'INVALID_ACCESS_REQUEST', 'Изменение прав разрешено только из интерфейса Space.')
  }
}
