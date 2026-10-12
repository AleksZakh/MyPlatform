import { z } from 'zod';
import { chatActor, input } from '../../services/chat/service';
import { inviteDomainContact, provisionInvitationContact } from '../../services/chat/invitations';
const target = z.union([
 z.object({ userId: z.number().int().positive().max(2147483647) }).strict(),
 z.object({ directoryLogin: z.string().trim().min(1).max(255), directoryObjectId: z.string().uuid().optional() }).strict(),
]);
export default defineEventHandler(async event => {
 const actor = await chatActor(event);
 const body = await input(event, target);
 const userId = 'userId' in body ? body.userId : await provisionInvitationContact(event, actor.id, body.directoryLogin, body.directoryObjectId);
 return inviteDomainContact(event, actor.id, userId);
});
