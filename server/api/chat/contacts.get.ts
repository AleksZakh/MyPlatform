import { defineEventHandler } from 'h3';
import { chatActor } from '../../services/chat/service';
import { searchSpaceContacts } from '../../services/chat/contacts';
export default defineEventHandler(async event => searchSpaceContacts(event, (await chatActor(event)).id));
