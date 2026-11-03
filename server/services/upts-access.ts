import { createError, type H3Event } from 'h3';
import { workActor } from './work/access';
export async function uptsActor(event: H3Event) {
  const actor = await workActor(event);
  if (actor.uptsAccessUnavailable) throw createError({ statusCode: 503, message: 'Не удалось проверить членство в группах УПТС в Active Directory. Повторите позже.', data: { code: 'AD_GROUP_ACCESS_UNVERIFIED' } });
  if (!actor.uptsMember) throw createError({ statusCode: 403, message: 'Доступ разрешён сотрудникам подразделения, участникам группы УПТС и системным администраторам. Обратитесь к администратору.', data: { code: 'UPTS_MEMBERSHIP_REQUIRED' } });
  return actor;
}
