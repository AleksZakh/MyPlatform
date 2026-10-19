import { defineEventHandler } from 'h3';
import { workActor } from '../../services/work/access';
import { searchSpaceContacts } from '../../services/chat/contacts';
export default defineEventHandler(async event => searchSpaceContacts(event, (await workActor(event)).id));
