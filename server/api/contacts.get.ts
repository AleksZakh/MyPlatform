import { createError, defineEventHandler } from 'h3';
import { adCache } from '../utils/adCache';
import type { ContactsResponse } from '../../shared/types/contacts';

// Authentication is enforced by server/middleware/auth.ts, as for /api/ad/*.
// Read the existing cache even when stale; opening a phone book must not start
// another LDAP sync or silently truncate the directory at the old 500-user cap.
export default defineEventHandler(async (): Promise<ContactsResponse> => {
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
  return {
    lastUpdated: cache.lastUpdated,
    contacts: cache.users
      .filter((user) => !user.accountDisabled)
      .map((user, index) => ({
        id: `${user.directoryObjectId || user.login || 'contact'}:${index}`,
        fullName: user.fullName || user.login,
        telephoneNumber: user.telephoneNumber || '',
        email: user.email || '',
        department: user.department || '',
        position: user.position || '',
      })),
  };
});
