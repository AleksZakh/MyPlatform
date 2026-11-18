import type { H3Event } from 'h3';
import { createError } from 'h3';
import { createHash } from 'node:crypto';
import { useStorage } from 'nitropack/runtime';
import {
  createAdClient, normalizeDirectoryUser, normalizeDirectoryObjectId, DIRECTORY_USER_ATTRIBUTES,
  type DirectoryUser,
} from './ad-directory.service';
import { isADContact, normalizePhoneContact } from '../utils/phone-directory-contact';

export type PhoneDirectoryScope = 'engineering' | 'group' | 'management' | 'roads';
type ScopedConfig = { phonebookGkUsersDN?: string; phonebookUkUsersDN?: string; phonebookRoadsUsersDN?: string };
type ScopedCache = { users: DirectoryUser[]; lastUpdated: string };
const ttlMs = 60 * 60 * 1000;

export function configuredDN(event: H3Event, scope: Exclude<PhoneDirectoryScope, 'engineering'>) {
  const config = useRuntimeConfig(event).ad as ScopedConfig;
  return ({
    group: process.env.AD_PHONEBOOK_GK_USERS_DN || config.phonebookGkUsersDN,
    management: process.env.AD_PHONEBOOK_UK_USERS_DN || config.phonebookUkUsersDN,
    roads: process.env.AD_PHONEBOOK_ROADS_USERS_DN || config.phonebookRoadsUsersDN,
  })[scope]?.trim() || '';
}

export async function scopedDirectoryUsers(event: H3Event, scope: Exclude<PhoneDirectoryScope, 'engineering'>) {
  const baseDN = configuredDN(event, scope);
  if (!baseDN) throw createError({
    statusCode: 503,
    data: { message: 'Для этой организации ещё не настроен DN-контейнер пользователей AD.' },
  });
  const storage = useStorage();
  const dnHash = createHash('sha256').update(baseDN.toLowerCase()).digest('hex').slice(0, 16);
  // Revision avoids the old, valid-but-empty user-only cache after upgrade.
  const key = `phonebook:ad:contacts-v3:${scope}:${dnHash}`;
  const previous = await storage.getItem<ScopedCache>(key);
  if (previous && Date.now() - Date.parse(previous.lastUpdated) < ttlMs) return previous;

  const ad = createAdClient(event);
  try {
    const entries = await new Promise<Array<{ raw: Record<string, unknown>; contact: boolean }>>((resolve, reject) => {
      ad.find({
        baseDN,
        filter: '(&(objectCategory=person)(|(objectClass=user)(objectClass=contact)))',
        scope: 'sub', timeLimit: 60, sizeLimit: 0,
        // activedirectory2 adds a PagedResultsControl by default, but ldapjs
        // only requests subsequent pages when opts.paged is explicitly set.
        paged: { pageSize: 500 },
        attributes: [...DIRECTORY_USER_ATTRIBUTES, 'objectClass', 'objectCategory'],
        includeMembership: [], referrals: { enabled: false },
      } as any, (error: object, results: any) => {
        if (error) reject(error);
        else resolve([
          ...(results?.users || []).map((raw: Record<string, unknown>) => ({ raw, contact: isADContact(raw) })),
          ...(results?.other || []).map((raw: Record<string, unknown>) => ({ raw, contact: true })),
        ]);
      });
    });
    const unique = new Map<string, DirectoryUser>();
    let contacts = 0;
    let accounts = 0;
    let skipped = 0;
    for (const entry of entries) {
      const contactId = entry.contact ? normalizeDirectoryObjectId(entry.raw.objectGUID) : null;
      const user = entry.contact
        ? (contactId ? normalizePhoneContact(entry.raw, contactId) : null)
        : normalizeDirectoryUser(entry.raw);
      if (!user || user.accountDisabled) { skipped++; continue; }
      unique.set(user.directoryObjectId || `login:${user.login}`, user);
      if (entry.contact) contacts++;
      else accounts++;
    }
    console.info(`[PHONEBOOK] scope=${scope} accounts=${accounts} contacts=${contacts} skipped=${skipped} total=${unique.size}`);
    const result = { users: [...unique.values()], lastUpdated: new Date().toISOString() };
    await storage.setItem(key, result);
    return result;
  } catch (cause) {
    if (previous) return previous;
    console.error(`[PHONEBOOK] LDAP lookup failed for scope ${scope}`, cause);
    throw createError({ statusCode: 503, data: { message: 'Не удалось прочитать контакты этого подразделения из AD.' } });
  }
}
