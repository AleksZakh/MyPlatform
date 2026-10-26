import { createError, getHeader, setHeader, type H3Event } from 'h3';
import { requirePermission } from '../access-control.service';
export const WORK_RESOURCE = 'diagnostic.works';
export async function workAccess(event: H3Event, action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE') {
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  if (action !== 'VIEW') {
    if (getHeader(event, 'x-space-diagnostic') !== '1' ||
        getHeader(event, 'sec-fetch-site') === 'cross-site' ||
        !getHeader(event, 'content-type')?.startsWith('application/json')) {
      throw createError({ statusCode: 403, message: 'Запрос должен быть отправлен из Space.' });
    }
    await requirePermission(event, WORK_RESOURCE, 'VIEW');
  }
  return requirePermission(event, WORK_RESOURCE, action);
}
export function workInput<T>(fn: () => T): T {
  try { return fn(); } catch (e) {
    throw createError({ statusCode: 400, message: e instanceof Error ? e.message : 'Некорректные данные.' });
  }
}

