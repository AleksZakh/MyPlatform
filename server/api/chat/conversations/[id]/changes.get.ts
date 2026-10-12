import { chatActor, conversationId, membership } from '../../../../services/chat/service';
import { messageChanges } from '../../../../services/chat/message-actions';
export default defineEventHandler(async event => {
 const actor = await chatActor(event), id = conversationId(event);
 await membership(actor.id,id);
 const since = Number(getQuery(event).since ?? 0);
 if (!Number.isSafeInteger(since) || since < 0 || since > 2147483647) throw createError({ statusCode: 400 });
 return messageChanges(actor.id,id,since);
});
