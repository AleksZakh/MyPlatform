import { getQuery, type H3Event } from 'h3';
import { personSelect } from './service';
import { prisma } from '../../utils/prisma';
import { adCache } from '../../utils/adCache';
import { cachedProfiles } from '../directory-provision.service';
import type { ChatPerson } from '../../../shared/types/chat';
export async function searchSpaceContacts(event: H3Event, actorId: number) {
 const query = getQuery(event), q = String(query.q || '').trim().slice(0, 100).toLocaleLowerCase('ru');
 const offset = Number(query.offset || 0);
 if (!Number.isSafeInteger(offset) || offset < 0 || offset > 1000000) throw createError({ statusCode: 400 });
 // Include blocked identities when deduplicating: they must never reappear as AD-only candidates.
 const users = await prisma.user.findMany({ select: { ...personSelect, directoryObjectId: true, email: true,
  department: { select: { name: true } }, receivedChatInvitation: { select: { sentAt: true, expiresAt: true, consumedAt: true } } } });
 const matches = (name: string | null, login: string | null) => !q || (name || '').toLocaleLowerCase('ru').includes(q) || (login || '').toLocaleLowerCase('ru').includes(q);
 const people: ChatPerson[] = users.filter(u => u.id !== actorId && (u.status === 'ACTIVE' || (q && u.authType === 'DOMAIN' && u.status === 'PENDING_ACTIVATION')) && matches(u.fullName, u.login))
  .map(({ directoryObjectId, email, department, receivedChatInvitation: invitation, ...person }) => ({ ...person,
   department: department?.name || null, hasEmail: !!email,
   invitationPending: !!invitation?.sentAt && !invitation.consumedAt && invitation.expiresAt > new Date(),
  }));
 let warning: string | null = null;
 if (q) {
  const cache = await adCache.get();
  if (!cache) warning = 'Каталог AD временно недоступен. Показаны только пользователи Space.';
  const knownIds = new Set(users.map(u => u.directoryObjectId?.toLowerCase()).filter(Boolean));
  const knownLogins = new Set(users.map(u => u.login?.toLowerCase()).filter(Boolean));
  for (const profile of cachedProfiles(cache?.users || [])) {
   const guid = profile.directoryObjectId?.toLowerCase(), login = profile.login.toLowerCase();
   if (profile.accountDisabled || (guid && knownIds.has(guid)) || knownLogins.has(login) || !matches(profile.fullName, login)) continue;
   if (guid) knownIds.add(guid); knownLogins.add(login);
   people.push({ id: 0, authType: 'DOMAIN', status: 'PENDING_ACTIVATION', fullName: profile.fullName, login,
    directoryObjectId: guid, directoryLogin: login, department: profile.department, hasEmail: !!profile.email });
  }
 }
 people.sort((a,b) => (a.fullName || a.login || '').localeCompare(b.fullName || b.login || '', 'ru') || (a.login || '').localeCompare(b.login || '') || a.id-b.id);
 return { people: people.slice(offset, offset + 50), hasMore: people.length > offset + 50, warning };
}
