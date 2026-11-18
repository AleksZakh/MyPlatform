import type { H3Event } from 'h3';
import { createError } from 'h3';
import { createHash } from 'node:crypto';
import { useStorage } from 'nitropack/runtime';
import {
  createAdClient, normalizeDirectoryUser, DIRECTORY_USER_ATTRIBUTES,
  type DirectoryUser,
} from './ad-directory.service';

export type PhoneDirectoryScope = 'engineering' | 'group' | 'management' | 'roads';
type ScopedConfig = { phonebookGkUsersDN?: string; phonebookUkUsersDN?: string; phonebookRoadsUsersDN?: string };
type ScopedCache = { users: DirectoryUser[]; lastUpdated: string };
const ttlMs = 60 * 60 * 1000;

export function configuredDN(event: H3Event, scope: Exclude<PhoneDirectoryScope, 'engineering'>) {
  const config = useRuntimeConfig(event).ad as ScopedConfig;
  return ({
    group: config.phonebookGkUsersDN,
    management: config.phonebookUkUsersDN,
    roads: config.phonebookRoadsUsersDN,
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
  const key = `phonebook:ad:${scope}:${dnHash}`;
  const previous = await storage.getItem<ScopedCache>(key);
  if (previous && Date.now() - Date.parse(previous.lastUpdated) < ttlMs) return previous;

  const ad = createAdClient(event);
  try {
    const rawUsers = await new Promise<Record<string, unknown>[]>((resolve, reject) => {
      ad.find({
        baseDN,
        filter: '(&(objectCategory=person)(objectClass=user))',
        scope: 'sub', timeLimit: 60,
        attributes: DIRECTORY_USER_ATTRIBUTES,
        includeMembership: [], referrals: { enabled: false },
      } as any, (error: object, results: any) => {
        if (error) reject(error);
        else resolve(results?.users || []);
      });
    });
    const unique = new Map<string, DirectoryUser>();
    for (const raw of rawUsers) {
      const user = normalizeDirectoryUser(raw);
      if (user && !user.accountDisabled) unique.set(user.directoryObjectId || `login:${user.login}`, user);
    }
    const result = { users: [...unique.values()], lastUpdated: new Date().toISOString() };
    await storage.setItem(key, result);
    return result;
  } catch (cause) {
    if (previous) return previous;
    console.error(`[PHONEBOOK] LDAP lookup failed for scope ${scope}`, cause);
    throw createError({ statusCode: 503, data: { message: 'Не удалось прочитать контакты этого подразделения из AD.' } });
  }
}
