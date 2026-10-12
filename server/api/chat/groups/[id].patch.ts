import { chatActor, conversationId, input } from '../../../services/chat/service';
import { groupChangeInput } from '../../../services/chat/group-input';
import { changeGroup } from '../../../services/chat/groups';
import { notifyDialog } from '../../../services/chat/notify';
export default defineEventHandler(async event => {
 const actor = await chatActor(event), id = conversationId(event);
 const change = await input(event, groupChangeInput, 'Проверьте параметры изменения группы.');
 const result = await changeGroup(actor.id, id, change);
 await notifyDialog(id, result.previousRecipients);
 return { ok: true };
});
