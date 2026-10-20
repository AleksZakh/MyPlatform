import { isStatisticsOwner } from '../../services/usage-owner';
import { z } from 'zod';
import { defineEventHandler, setResponseStatus, createError } from 'h3';
import { getAccessActor } from '../../services/access-control.service';
import { workBody } from '../../services/work/access';
import { recordUsage } from '../../services/usage';
import { usagePage, USAGE_CLICKS } from '../../../shared/usage';
const input = z.object({ events:z.array(z.object({ id:z.string().uuid(), kind:z.enum(['PAGE','CLICK','VIDEO_PLAY']), target:z.string().max(200) }).strict()).max(25) }).strict();
export default defineEventHandler(async event => {
  if (event.context.externalSessionRevoked) throw createError({statusCode:401});
  const actor = await getAccessActor(event), body = input.safeParse(await workBody(event));
  if (!body.success) { setResponseStatus(event,400); return { ok:false }; }
  if(isStatisticsOwner(actor.user))return {ok:true};
  for (const e of body.data.events) {
    const target = e.kind === 'PAGE' ? usagePage(e.target) : e.kind === 'CLICK' && Object.hasOwn(USAGE_CLICKS, e.target) ? e.target : e.kind === 'VIDEO_PLAY' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(e.target) ? e.target : null;
    if (target) recordUsage({ id:`client:${actor.user.id}:${e.id}`, actorId:actor.user.id, kind:e.kind, target, source:'CLIENT' }, e.kind === 'CLICK' ? 500 : 5000);
  }
  return { ok:true };
});
