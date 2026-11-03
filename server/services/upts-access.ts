import { createError, type H3Event } from 'h3';
import { workActor } from './work/access';
export async function uptsActor(event: H3Event) {
  const actor = await workActor(event);
  if (!actor.uptsMember) throw createError({ statusCode: 403, message: 'Доступ к системе разрешён только сотрудникам УПТС. Обратитесь к администратору.', data: { code: 'UPTS_MEMBERSHIP_REQUIRED' } });
  return actor;
}
