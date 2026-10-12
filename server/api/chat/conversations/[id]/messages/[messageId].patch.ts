import { chatActor, conversationId, input } from '../../../../../services/chat/service';
import { changeMessage, messageChangeInput } from '../../../../../services/chat/message-actions';
import { notifyDialog } from '../../../../../services/chat/notify';
export default defineEventHandler(async event => {
 const actor = await chatActor(event), id = conversationId(event);
 const messageId = Number(getRouterParam(event, 'messageId'));
 if (!Number.isSafeInteger(messageId) || messageId <= 0 || messageId > 2147483647) throw createError({ statusCode: 400 });
 const data = await input(event, messageChangeInput, 'Проверьте текст сообщения (от 1 до 4000 символов).');
 const message = await changeMessage(actor.id, id, messageId, data);
 await notifyDialog(id);
 return message;
});
