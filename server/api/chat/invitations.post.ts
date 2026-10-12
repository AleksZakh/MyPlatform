import { z } from 'zod';
import { chatActor, input } from '../../services/chat/service';
import { inviteDomainContact } from '../../services/chat/invitations';
export default defineEventHandler(async event => {
 const actor = await chatActor(event);
 const { userId } = await input(event, z.object({ userId: z.number().int().positive().max(2147483647) }).strict());
 return inviteDomainContact(event, actor.id, userId);
});
