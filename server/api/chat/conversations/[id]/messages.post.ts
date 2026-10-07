import { chatActor, input, conversationId, saveMessage } from '../../../../services/chat/service';
import { messageInput } from '../../../../services/chat/validation';
import { notifyDialog } from '../../../../services/chat/notify';
export default defineEventHandler(async event => {
  const actor = await chatActor(event), id = conversationId(event), data = await input(event, messageInput);
  const message = await saveMessage(actor.id, id, data.body, data.clientId);
  await notifyDialog(id);
  return message;
});
