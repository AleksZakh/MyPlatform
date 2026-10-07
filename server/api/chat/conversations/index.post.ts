import { chatActor, input, openDialog } from '../../../services/chat/service';
import { recipientInput } from '../../../services/chat/validation';
export default defineEventHandler(async event => {
  const actor = await chatActor(event);
  const data = await input(event, recipientInput);
  return openDialog(actor.id, data.userId);
});
