import { chatActor, input } from '../../../services/chat/service';
import { groupCreateInput } from '../../../services/chat/group-input';
import { createGroup } from '../../../services/chat/groups';
import { notifyDialog } from '../../../services/chat/notify';
export default defineEventHandler(async event => {
 const actor = await chatActor(event), data = await input(event, groupCreateInput, 'Укажите название группы и активных участников.');
 const group = await createGroup(actor.id, data.name, data.userIds, data.clientId);
 await notifyDialog(group.id);
 return group;
});
