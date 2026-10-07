import { createError, getHeader, getRouterParam, readBody, setHeader, type H3Event } from 'h3';
import { getAccessActor } from '../access-control.service';
import type { z } from 'zod';
export const personSelect = { id: true, login: true, fullName: true, authType: true, status: true } as const;
export async function chatActor(event: H3Event) {
  setHeader(event, 'Cache-Control', 'no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  return (await getAccessActor(event)).user;
}
export function conversationId(event: H3Event) {
  const id = Number(getRouterParam(event, 'id'));
  if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw createError({ statusCode: 400 });
  return id;
}
export async function input<T extends z.ZodType>(event: H3Event, schema: T): Promise<z.infer<T>> {
  if (getHeader(event, 'x-space-chat') !== '1') throw createError({ statusCode: 403 });
  const body = await readBody(event);
  const parsed = schema.safeParse(body);
  if (!parsed.success) throw createError({ statusCode: 400, message: 'Проверьте поля сообщения (не более 4000 символов).' });
  return parsed.data;
}
export { membership, openDialog, saveMessage, markRead } from './repository';
