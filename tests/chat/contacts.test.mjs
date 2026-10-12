import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
globalThis.defineEventHandler = f => f;
globalThis.getQuery = event => event.query;
globalThis.createError = value => Object.assign(new Error(), value);
const local = [
 { id: 1, login: 'self', fullName: 'Self', status: 'ACTIVE', authType: 'DOMAIN', directoryObjectId: 'self', email: 'self@corp.test' },
 { id: 2, login: 'active', fullName: 'Employee Active', status: 'ACTIVE', authType: 'DOMAIN', directoryObjectId: 'active' },
 { id: 3, login: 'blocked', fullName: 'Employee Blocked', status: 'BLOCKED', authType: 'DOMAIN', directoryObjectId: 'blocked' },
 { id: 4, login: 'pending', fullName: 'Employee Pending', status: 'PENDING_ACTIVATION', authType: 'DOMAIN', directoryObjectId: 'pending' },
];
const profiles = [...local.map(u => ({ ...u, accountDisabled: false })),
 { login: 'new', fullName: 'Employee New', directoryObjectId: 'new-guid', accountDisabled: false },
 { login: 'disabled', fullName: 'Employee Disabled', directoryObjectId: 'disabled', accountDisabled: true },
 { login: 'blocked', fullName: 'Employee Recreated', directoryObjectId: 'new-blocked-guid', accountDisabled: false },
];
globalThis.__contactsUsers = local;
globalThis.__contactsCache = { users: profiles };
const r = await build({ entryPoints: ['server/api/chat/contacts.get.ts'], bundle: true, write: false, format: 'esm', plugins: [{ name: 'boundaries', setup(b) {
 b.onResolve({ filter: /services\/chat\/service$/ }, () => ({ path: 'actor', namespace: 'stub' }));
 b.onResolve({ filter: /utils\/prisma$/ }, () => ({ path: 'db', namespace: 'stub' }));
 b.onResolve({ filter: /utils\/adCache$/ }, () => ({ path: 'cache', namespace: 'stub' }));
 b.onResolve({ filter: /directory-provision.service$/ }, () => ({ path: 'profiles', namespace: 'stub' }));
 b.onLoad({ filter: /.*/, namespace: 'stub' }, a => ({ contents: {
 actor: 'export const personSelect = {}; export const chatActor = async () => ({id:1});',
 db: 'export const prisma = {user:{findMany:async()=>globalThis.__contactsUsers}};',
 cache: 'export const adCache = {get:async()=>globalThis.__contactsCache};',
 profiles: 'export const cachedProfiles = p => p;',
 }[a.path] }));
} }] });
const { default: contacts } = await import('data:text/javascript;base64,' + Buffer.from(r.outputFiles[0].text).toString('base64'));
test('AD-only search, deduplication, blocked identities, empty search and unavailable cache', async () => {
 assert.deepEqual((await contacts({ query: {} })).people.map(p => p.id), [2]);
 const result = await contacts({ query: { q: 'employee' } });
 assert.deepEqual(result.people.map(p => p.login), ['active', 'new', 'pending']);
 assert.equal(result.people[1].directoryObjectId, 'new-guid');
 assert.equal(result.people[1].id, 0);
 assert.deepEqual((await contacts({ query: { q: 'no-match' } })).people, []);
 profiles.push({ login: 'legacy', fullName: 'Legacy', directoryObjectId: null, accountDisabled: false });
 assert.equal((await contacts({query:{q:'Legacy'}})).people[0].directoryLogin,'legacy');
 globalThis.__contactsCache = null;
 assert.ok((await contacts({ query: { q: 'employee' } })).warning);
 globalThis.__contactsCache = { users: Array.from({length: 65}, (_,i) => ({ login: `candidate-${i}`, fullName: `Candidate ${String(i).padStart(2,'0')}`, directoryObjectId: `guid-${i}`, accountDisabled: false })) };
 const first = await contacts({query:{q:'Candidate'}}), second = await contacts({query:{q:'Candidate',offset:50}});
 assert.equal(first.people.length,50); assert.equal(first.hasMore,true);
 assert.equal(second.people.length,15); assert.equal(second.hasMore,false);
 assert.equal(new Set([...first.people,...second.people].map(p=>p.directoryObjectId)).size,65);
});
