import { invitationTarget } from '../../services/chat/invitation-input';
import { chatActor, input } from '../../services/chat/service';
import { inviteDomainContact, provisionInvitationContact } from '../../services/chat/invitations';
export default defineEventHandler(async event => {
 const actor = await chatActor(event);
 const body = await input(event, invitationTarget, 'Некорректные данные получателя приглашения. Обновите поиск и выберите сотрудника заново.');
 const userId = 'userId' in body ? body.userId : await provisionInvitationContact(event, actor.id, body.directoryLogin, body.directoryObjectId);
 return inviteDomainContact(event, actor.id, userId);
});
