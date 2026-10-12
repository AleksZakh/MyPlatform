import { chatActor, conversationId } from '../../../services/chat/service';
import { getGroup } from '../../../services/chat/groups';
export default defineEventHandler(async event => getGroup((await chatActor(event)).id, conversationId(event)));
