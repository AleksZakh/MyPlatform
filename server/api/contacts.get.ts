import { createError, defineEventHandler } from 'h3';
import { adCache } from '../utils/adCache';
import type { ContactsResponse } from '../../shared/types/contacts';
import { prisma } from '../utils/prisma';
import { directoryEditor, directoryKey, mayEditContact } from '../utils/phoneDirectory';

// Authentication is enforced by server/middleware/auth.ts, as for /api/ad/*.
// Read the existing cache even when stale; opening a phone book must not start
// another LDAP sync or silently truncate the directory at the old 500-user cap.
export default defineEventHandler(async (event): Promise<ContactsResponse> => {
  const cache = await adCache.get();
  if (!cache) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Contacts unavailable',
      data: {
        message:
          'Справочник пока не загружен. Повторите попытку позже или обратитесь к администратору.',
      },
    });
  }
  const actor = await directoryEditor(event);
  const users = cache.users.filter(user => !user.accountDisabled);
  const keys = users.map(directoryKey);
  const details = await prisma.phoneDirectoryDetails.findMany({
    where: { directoryKey: { in: keys } },
  });
  const byKey = new Map(details.map(item => [item.directoryKey, item]));
  return {
    lastUpdated: cache.lastUpdated,
    contacts: users
      .map((user) => ({
        id: directoryKey(user),
        fullName: user.fullName || user.login,
        telephoneNumber: user.telephoneNumber || '',
        email: user.email || '',
        department: user.department || '',
        position: user.position || '',
        city: byKey.get(directoryKey(user))?.city || '',
        address: byKey.get(directoryKey(user))?.address || '',
        room: byKey.get(directoryKey(user))?.room || '',
        mobilePhone: byKey.get(directoryKey(user))?.mobilePhone || '',
        canEdit: mayEditContact(actor, user),
      })),
  };
});
