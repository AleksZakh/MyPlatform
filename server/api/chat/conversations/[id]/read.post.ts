import { chatActor, input, conversationId, markRead } from '../../../../services/chat/service';
import { readInput } from '../../../../services/chat/validation';
import { notifyDialog } from '../../../../services/chat/notify';
export default defineEventHandler(async event => {
  const actor = await chatActor(event), id = conversationId(event), data = await input(event, readInput);
  const result = await markRead(actor.id, id, data.through);
  await notifyDialog(id);
  return result;
});
