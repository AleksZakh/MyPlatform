import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { build } from 'esbuild';
const url = process.env.CHAT_TEST_DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_chat_test')) throw new Error('Use a fresh disposable *_chat_test database');
process.env.DATABASE_URL = url;
const { prisma } = await import('../../server/utils/prisma');
const { resolveAuthenticatedDomainUser } = await import('../../server/services/invited-domain-login');
const { invitationIsUsable } = await import('../../server/services/chat/invitation-policy');
// Stub only LDAP and SMTP. Repository, transaction and activation code run against the test DB.
let profile: any;
let delivered = 0, smtpFails = false;
(globalThis as any).__findDirectory = async () => profile;
(globalThis as any).__sendInvitation = async () => { if (smtpFails) throw new Error('SMTP offline'); delivered++; };
const bundled = await build({ entryPoints: ['server/services/chat/invitations.ts'], bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'external-services', setup(b) {
 b.onResolve({ filter: /ad-directory\.service$/ }, () => ({ path: 'ldap', namespace: 'stub' }));
 b.onResolve({ filter: /chat-invitation-mail$/ }, () => ({ path: 'mail', namespace: 'stub' }));
 b.onResolve({ filter: /utils\/prisma$/ }, () => ({ path: 'prisma', namespace: 'stub' }));
 b.onLoad({ filter: /.*/, namespace: 'stub' }, args => ({ contents: args.path === 'ldap' ? 'export const findDomainUser = (...a) => globalThis.__findDirectory(...a)' : args.path === 'mail' ? 'export const sendChatInvitationEmail = (...a) => globalThis.__sendInvitation(...a)' : 'export const prisma = globalThis.__testPrisma' }));
} }] });
(globalThis as any).__testPrisma = prisma;
// File beside tests allows Node to resolve external packages.
const { writeFile, unlink } = await import('node:fs/promises');
const output = new URL('./.invitations-bundle.mjs', import.meta.url);
await writeFile(output, bundled.outputFiles[0].text);
const { inviteDomainContact, provisionInvitationContact } = await import(output.href);
await unlink(output);
function directory(guid: string, login: string) { return { directoryObjectId: guid, login, email: `${login}@example.test`, fullName: login, position: null, department: null, accountDisabled: false, userPrincipalName: null }; }
const failure = (code: number) => (e: any) => e.statusCode === code;
test('invitation migration, delivery, limits, AD activation and account restrictions', async () => {
 try {
  // BASE_SCHEMA_SQL must be generated from the previous schema, never a live database.
  const schema = await readFile(process.env.BASE_SCHEMA_SQL!, 'utf8');
  for (const sql of schema.split(';').filter(s => s.trim())) await prisma.$executeRawUnsafe(sql);
  const migration = await readFile(new URL('../../prisma/migrations/20261012120000_domain_chat_invitations/migration.sql', import.meta.url), 'utf8');
  for (const sql of migration.split(';').filter(s => s.trim())) await prisma.$executeRawUnsafe(sql);
  const sender = await prisma.user.create({ data: { authType: 'DOMAIN', status: 'ACTIVE', login: 'sender' } });
  const guid = randomUUID(); profile = directory(guid, 'recipient');
  const user = await prisma.user.create({ data: { authType: 'DOMAIN', status: 'PENDING_ACTIVATION', directoryObjectId: guid, login: profile.login, email: profile.email, fullName: profile.fullName } });
  await assert.rejects(resolveAuthenticatedDomainUser(profile), failure(403));
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).status, 'PENDING_ACTIVATION');
  const goodProfile = profile; profile = { ...profile, email: null };
  await assert.rejects(inviteDomainContact({} as any, sender.id, user.id), failure(409));
  profile = { ...goodProfile, accountDisabled: true };
  await assert.rejects(inviteDomainContact({} as any, sender.id, user.id), failure(409));
  profile = goodProfile;
  await inviteDomainContact({} as any, sender.id, user.id);
  assert.equal(delivered, 1);
  await assert.rejects(inviteDomainContact({} as any, sender.id, user.id), failure(429));
  let invitation = await prisma.domainChatInvitation.findUniqueOrThrow({ where: { recipientId: user.id } });
  assert.equal(invitationIsUsable(invitation, user, { ...profile, directoryObjectId: randomUUID() }), false);
  assert.equal(invitationIsUsable(invitation, user, profile, invitation.expiresAt), false);
  assert.equal(invitationIsUsable({ ...invitation, sentAt: null }, user, profile), false);
  for (const status of ['BLOCKED', 'DISABLED'] as const) {
   await prisma.user.update({ where: { id: user.id }, data: { status } });
   await assert.rejects(resolveAuthenticatedDomainUser(profile), failure(403));
  }
  const pending = await prisma.user.update({ where: { id: user.id }, data: { status: 'PENDING_ACTIVATION' } });
  // Administrative changes invalidate the earlier grant, even if returned to pending.
  await assert.rejects(resolveAuthenticatedDomainUser(profile), failure(403));
  await prisma.domainChatInvitation.update({ where: { recipientId: user.id }, data: { recipientVersion: pending.updatedAt } });
  await assert.rejects(resolveAuthenticatedDomainUser({ ...profile, accountDisabled: true }), failure(403));
  const activated = await resolveAuthenticatedDomainUser(profile);
  assert.equal(activated.status, 'ACTIVE');
  assert.ok((await prisma.domainChatInvitation.findUniqueOrThrow({ where: { recipientId: user.id } })).consumedAt);
  assert.equal(await prisma.auditLog.count({ where: { action: 'ACTIVATE', targetUserId: user.id } }), 1);
  await resolveAuthenticatedDomainUser(profile);
  assert.equal(await prisma.auditLog.count({ where: { action: 'ACTIVATE', targetUserId: user.id } }), 1);
  assert.equal(await prisma.userPermission.count({ where: { userId: user.id } }), 0);
  profile = directory(randomUUID(), 'failed');
  const failed = await prisma.user.create({ data: { authType: 'DOMAIN', status: 'PENDING_ACTIVATION', directoryObjectId: profile.directoryObjectId, login: profile.login } });
  smtpFails = true;
  await assert.rejects(inviteDomainContact({} as any, sender.id, failed.id), failure(502));
  assert.equal((await prisma.domainChatInvitation.findUniqueOrThrow({ where: { recipientId: failed.id } })).sentAt, null);
  await assert.rejects(resolveAuthenticatedDomainUser(profile), failure(403));
  await assert.rejects(inviteDomainContact({} as any, sender.id, failed.id), failure(429));
  smtpFails = false;
  profile = directory('s-71-29333743916866-72048014-29952050', 'not-yet-in-space');
  const newId = await provisionInvitationContact({} as any, sender.id, profile.login);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: newId } })).status, 'PENDING_ACTIVATION');
  await assert.rejects(resolveAuthenticatedDomainUser(profile), failure(403));
  assert.equal(await provisionInvitationContact({} as any, sender.id, profile.login, profile.directoryObjectId), newId);
  await inviteDomainContact({} as any, sender.id, newId);
  assert.equal((await resolveAuthenticatedDomainUser(profile)).status, 'ACTIVE');
  await prisma.user.update({ where: { id: newId }, data: { status: 'BLOCKED' } });
  await assert.rejects(provisionInvitationContact({} as any, sender.id, profile.login, profile.directoryObjectId), failure(409));
  await assert.rejects(provisionInvitationContact({} as any, sender.id, profile.login, randomUUID()), failure(409));
  profile = { ...directory(randomUUID(), 'no-mail'), email: null };
  await assert.rejects(provisionInvitationContact({} as any, sender.id, profile.login, profile.directoryObjectId), failure(409));
  assert.equal(await prisma.user.count({ where: { login: 'no-mail' } }), 0);
 } finally { await prisma.$disconnect(); }
});
