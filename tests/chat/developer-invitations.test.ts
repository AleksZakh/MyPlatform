import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, unlink } from 'node:fs/promises';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import { bypassInvitationCooldown } from '../../server/services/chat/invitation-policy';

const url = process.env.WORK_TEST_DATABASE_URL || '';
if (!url || !new URL(url).pathname.endsWith('_work_test')) throw new Error('Disposable *_work_test database required');
const db = new PrismaClient({ datasources: { db: { url } } });
const directory = new Map<string, any>();
let deliveries = 0, smtpFail = false, hold: Promise<void> | null = null;
let mailStarted: (() => void) | undefined;
Object.assign(globalThis, { developerTestDb: db, developerTestDirectory: directory,
 developerTestMail: async () => { mailStarted?.(); if (hold) await hold; if (smtpFail) throw new Error('SMTP unavailable'); deliveries++; } });
const generated: URL[] = [];
async function load(file: string) {
 const out = await build({ entryPoints: [file], bundle: true, write: false, platform: 'node', format: 'esm', packages: 'external', plugins: [{ name: 'test-services', setup(b) {
  const stubs: Record<string, string> = {
   db: 'export const prisma = globalThis.developerTestDb;',
   ldap: 'export async function findDomainUser(login){return globalThis.developerTestDirectory.get(login);}',
   mail: 'export const sendChatInvitationEmail = (...a) => globalThis.developerTestMail(...a);',
   usage: 'export function recordUsage(){}',
   groups: 'export async function directoryGroupUserIds(){return [];} export async function resolveDomainGroupIds(){return [];}',
   access: `export async function workActor(e){const u=await globalThis.developerTestDb.user.findUniqueOrThrow({where:{id:e.context.testUser}});if(u.status!=='ACTIVE')throw Object.assign(new Error('Inactive'),{statusCode:403});return {id:u.id,departmentId:null};} export async function hasWorkGrant(){return false;}`,
   audit: `export async function writeAuditEvent(a){await a.db.auditLog.create({data:{actorUserId:a.actorUserId,actorEmail:'',action:a.action,category:a.category,result:a.result,entityType:a.entityType,entityId:a.entityId}});}`,
  };
  for (const [filter, path] of [[/utils\/prisma$/, 'db'], [/ad-directory\.service$/, 'ldap'], [/chat-invitation-mail$/, 'mail'], [/\/usage$/, 'usage'], [/domain-group-directory\.service$/, 'groups'], [/^\.\/access$/, 'access'], [/utils\/auditLog$/, 'audit']] as [RegExp, string][]) b.onResolve({ filter }, () => ({ path, namespace: 'stub' }));
  b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({ contents: stubs[a.path]! }));
 } }] });
 const output = new URL(`./.developer-invitations-${generated.length}.mjs`, import.meta.url); generated.push(output);
 await writeFile(output, out.outputFiles[0]!.text); return import(output.href);
}
const failure = (code: number) => (e: any) => e.statusCode === code;
const event = (id: number) => ({ context: { testUser: id } }) as any;
async function user(login: string, pending = false) {
 const guid = randomUUID();
 directory.set(login, { login, directoryObjectId: guid, accountDisabled: false, email: login + '@example.test' });
 return db.user.create({ data: { login, directoryObjectId: guid, authType: 'DOMAIN', status: pending ? 'PENDING_ACTIVATION' : 'ACTIVE' } });
}

test('developer exception: daily cooldown only; domain identity, SMTP concurrency, project roles and pending invitations', async () => {
 try {
  const { inviteDomainContact } = await load('server/services/chat/invitations.ts');
  const { inviteToProject, cancelInvitation } = await load('server/services/work/team.ts');
  const dev = await user('zakharov_av'), ordinary = await user('other'), recipient = await user('pending', true);
  for (const identity of [null, { login: 'zakharov_av', authType: 'EXTERNAL', status: 'ACTIVE' }, { login: 'zakharov_av', authType: 'DOMAIN', status: 'BLOCKED' }, { login: 'other', authType: 'DOMAIN', status: 'ACTIVE' }]) assert.equal(bypassInvitationCooldown(identity), false);
  assert.equal(bypassInvitationCooldown({ ...dev, login: 'ZAKHAROV_AV' }), true);
  await inviteDomainContact(event(ordinary.id), ordinary.id, recipient.id);
  await assert.rejects(inviteDomainContact(event(ordinary.id), ordinary.id, recipient.id), failure(429));
  await inviteDomainContact(event(dev.id), dev.id, recipient.id);
  await inviteDomainContact(event(dev.id), dev.id, recipient.id);
  assert.equal(deliveries, 3);
  assert.equal(await db.auditLog.count({ where: { action: 'INVITE', targetUserId: recipient.id } }), 3);
  await assert.rejects(inviteDomainContact(event(ordinary.id), ordinary.id, recipient.id), failure(429));
  await db.user.update({ where: { id: dev.id }, data: { authType: 'EXTERNAL' } });
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(429));
  await db.user.update({ where: { id: dev.id }, data: { authType: 'DOMAIN' } });

  let release!: () => void;
  hold = new Promise<void>(r => { release = r; });
  const started = new Promise<void>(r => { mailStarted = r; });
  const inFlight = inviteDomainContact(event(dev.id), dev.id, recipient.id);
  await started;
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(429));
  release(); await inFlight; hold = null; mailStarted = undefined;
  smtpFail = true;
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(502));
  assert.equal((await db.domainChatInvitation.findUniqueOrThrow({ where: { recipientId: recipient.id } })).sentAt, null);
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(429));
  await db.domainChatInvitation.update({ where: { recipientId: recipient.id }, data: { reservedAt: new Date(Date.now() - 121000) } });
  smtpFail = false;
  await inviteDomainContact(event(dev.id), dev.id, recipient.id);
  directory.get(recipient.login!).accountDisabled = true;
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(409));
  directory.get(recipient.login!).accountDisabled = false;
  await db.user.update({ where: { id: dev.id }, data: { status: 'BLOCKED' } });
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(403));
  await db.user.update({ where: { id: dev.id }, data: { status: 'ACTIVE' } });

  async function project(ownerId: number) { return db.workProject.create({ data: { clientKey: randomUUID(), name: 'Test', ownerId, scope: 'TEAM' } }); }
  async function invite(p: any, senderId: number, userId: number) {
   const fresh = await db.workProject.findUniqueOrThrow({ where: { id: p.id } });
   return inviteToProject(event(senderId), p.id, { version: fresh.version, role: 'MEMBER', target: { userId } });
  }
  const p = await project(dev.id), p2 = await project(ordinary.id);
  const beforeMail = deliveries;
  await invite(p, dev.id, recipient.id); assert.equal(deliveries, beforeMail + 1, 'Developer project sends a new email even if chat invitation exists');
  await assert.rejects(invite(p, dev.id, recipient.id), failure(409));
  let row = await db.workProjectInvitation.findUniqueOrThrow({ where: { projectId_userId: { projectId: p.id, userId: recipient.id } } });
  await cancelInvitation(event(dev.id), p.id, row.id);
  await invite(p, dev.id, recipient.id); assert.equal(deliveries, beforeMail + 2);
  await assert.rejects(invite(p2, dev.id, recipient.id), failure(404), 'Developer does not gain access to other projects');
  await invite(p2, ordinary.id, recipient.id); assert.equal(deliveries, beforeMail + 2, 'Ordinary users reuse recent activation delivery');
  row = await db.workProjectInvitation.findUniqueOrThrow({ where: { projectId_userId: { projectId: p2.id, userId: recipient.id } } });
  await cancelInvitation(event(ordinary.id), p2.id, row.id);
  await assert.rejects(invite(p2, ordinary.id, recipient.id), failure(429));
  const active = await user('active');
  await invite(p, dev.id, active.id);
  row = await db.workProjectInvitation.findUniqueOrThrow({ where: { projectId_userId: { projectId: p.id, userId: active.id } } });
  await cancelInvitation(event(dev.id), p.id, row.id);
  await invite(p, dev.id, active.id); assert.equal(deliveries, beforeMail + 2, 'Active employees receive internal invitations, not activation emails');
  // The developer exception does not disable either existing hourly guard.
  for (let i = 0; i < 20; i++) {
   const u = await user('hourly-' + i, true);
   await db.domainChatInvitation.create({ data: { id: randomUUID(), senderId: dev.id, recipientId: u.id, directoryObjectId: u.directoryObjectId!, recipientVersion: u.updatedAt, reservedAt: new Date(), expiresAt: new Date(Date.now() + 86400000), sentAt: new Date() } });
   await db.workProjectInvitation.create({ data: { id: randomUUID(), projectId: p.id, inviterId: dev.id, userId: u.id, role: 'MEMBER', status: 'CANCELLED', expiresAt: new Date(Date.now() + 86400000) } });
  }
  await assert.rejects(inviteDomainContact(event(dev.id), dev.id, recipient.id), failure(429));
  const next = await user('hourly-next');
  await assert.rejects(invite(p, dev.id, next.id), failure(429));
 } finally {
  await db.$disconnect();
  for (const file of generated) await unlink(file).catch(() => {});
 }
});
