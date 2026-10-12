import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
const url = process.env.PREFERENCES_TEST_DATABASE_URL || '';
if (!url || !new URL(url).pathname.endsWith('_preferences_test')) throw new Error('Use an isolated *_preferences_test database.');
const db = new PrismaClient({ datasources: { db: { url } } });
Object.assign(globalThis, {
  prismaTest: db, defineEventHandler: (fn: any) => fn, setHeader: () => {},
  getHeader: (e: any, name: string) => e.headers[name], readBody: (e: any) => e.body,
  createError: (data: any) => Object.assign(new Error(data.message), data),
});
async function handler(file: string) {
 const out = await build({ entryPoints:[file], bundle:true, write:false, format:'esm', platform:'node', plugins:[{name:'boundaries',setup(b){
  b.onResolve({filter:/access-control.service$/},()=>({path:'actor',namespace:'test'}));
  b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='db'?'export const prisma = globalThis.prismaTest;':'export async function getAccessActor(e) { if (!e.context.userId) throw Object.assign(new Error(), {statusCode:401}); return {user:{id:e.context.userId}}; }',loader:'js'}));
 }}]});
 return (await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0]!.text).toString('base64'))).default;
}
test('preferences migration, ownership, section merging, blocked users and cascade', async()=>{
 try {
  await db.$executeRawUnsafe(`CREATE TABLE app_users (id INTEGER PRIMARY KEY, status TEXT NOT NULL, "updatedAt" TIMESTAMP NOT NULL DEFAULT now())`);
  await db.$executeRawUnsafe(`INSERT INTO app_users (id,status) VALUES (1,'ACTIVE'),(2,'ACTIVE'),(3,'BLOCKED')`);
  await db.$executeRawUnsafe(await readFile('prisma/migrations/20261012170000_user_preferences/migration.sql','utf8'));
  const get = await handler('server/api/profile/preferences.get.ts'), patch = await handler('server/api/profile/preferences.patch.ts');
  const event = (userId:number,body:any, headers:any={'x-space-preferences':'1'}) => ({context:{userId},body,headers});
  const before:any = await db.$queryRaw`SELECT "updatedAt" FROM app_users WHERE id=1`;
  await patch(event(1,{display:{contrast:'high'}}));
  await patch(event(1,{notifications:{success:false}}));
  await patch(event(1,{labTable:{visibleColumns:['samplingDate'],columnOrder:['samplingDate']}}));
  const saved = await get(event(1,{}));
  assert.equal(saved.display.contrast,'high');assert.equal(saved.notifications.success,false);assert.deepEqual(saved.labTable.columnOrder,['samplingDate']);
  assert.equal((await get(event(2,{}))).display.contrast,'normal');
  await assert.rejects(patch(event(1,{userId:2,display:{}})),{statusCode:400});
  await assert.rejects(patch(event(1,{display:{}},{})),{statusCode:403});
  await assert.rejects(patch(event(3,{display:{}})),{statusCode:403});
  await assert.rejects(get({...event(1,{}),context:{userId:1,externalSessionRevoked:true}}),{statusCode:401});
  const after:any = await db.$queryRaw`SELECT "updatedAt" FROM app_users WHERE id=1`;
  assert.deepEqual(before,after);
  await patch(event(1,{labTable:null}));assert.equal((await get(event(1,{}))).labTable,null);
  await db.$executeRaw`DELETE FROM app_users WHERE id=1`;assert.equal(await db.userPreference.count(),0);
 } finally { await db.$disconnect(); }
});
