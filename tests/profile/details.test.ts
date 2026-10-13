import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import * as h3 from 'h3';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { emptyProfileDetails } from '../../shared/utils/profile-details';
import { normalizeAvatar } from '../../server/utils/profile-avatar';
const url = process.env.PROFILE_TEST_DATABASE_URL || '';
if (!new URL(url).pathname.endsWith('_profile_test')) throw new Error('Isolated *_profile_test database required.');
const db = new PrismaClient({ datasources: { db: { url } } });
Object.assign(globalThis, h3, { prismaTest: db });
const generated: string[] = [];
async function handler(file: string) {
 const output = await build({ entryPoints:[file], bundle:true, write:false, format:'esm', platform:'node', packages:'external', plugins:[{name:'test-session',setup(b){
  b.onResolve({filter:/access-control.service$/},()=>({path:'actor',namespace:'test'}));
  b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'test'}));
  b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='db'?'export const prisma = globalThis.prismaTest;':`export async function getAccessActor(e) {
   const id = Number(e.node.req.headers['x-test-user']);
   if (!id) throw Object.assign(new Error('auth'),{statusCode:401});
   const user = await globalThis.prismaTest.user.findUnique({where:{id},select:{id:true,status:true}});
   if (!user || user.status!=='ACTIVE') throw Object.assign(new Error('inactive'),{statusCode:403});
   return {user};
  }`,loader:'js'}));
 }}]});
 const path=resolve(`tests/profile/.generated-${generated.length}.mjs`);generated.push(path);await writeFile(path,output.outputFiles[0]!.text);
 return (await import(pathToFileURL(path).href)).default;
}
test('profile ownership, validation, avatar lifecycle and account isolation', async()=>{
 const app = h3.createApp({ debug: false }); const server=createServer(h3.toNodeListener(app));
 try {
  await db.$executeRawUnsafe(`CREATE TABLE app_users (id INTEGER PRIMARY KEY, status TEXT NOT NULL, "fullName" TEXT, login TEXT, email TEXT, organization TEXT, position TEXT, "updatedAt" TIMESTAMP NOT NULL DEFAULT now())`);
  await db.$executeRawUnsafe(`INSERT INTO app_users (id,status,"fullName",email) VALUES (1,'ACTIVE','First','first@example.org'),(2,'ACTIVE','Second','second@example.org'),(3,'BLOCKED','Third','third@example.org')`);
  await db.$executeRawUnsafe(await readFile('prisma/migrations/20261013080000_user_profile_details/migration.sql','utf8'));
  const router=h3.createRouter();
  router.get('/profile',await handler('server/api/profile/index.get.ts'));
  router.patch('/profile',await handler('server/api/profile/index.patch.ts'));
  router.put('/avatar',await handler('server/api/profile/avatar.put.ts'));
  router.get('/avatar',await handler('server/api/profile/avatar.get.ts'));
  router.delete('/avatar',await handler('server/api/profile/avatar.delete.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address() as any;
  const call=(path:string,method='GET',body?:any, user='1',header=true)=>fetch(`http://127.0.0.1:${address.port}${path}`,{method,headers:{'x-test-user':user,...(header?{'x-space-profile':'1'}:{}),...(body && !Buffer.isBuffer(body)?{'content-type':'application/json'}:{})},body:body?(Buffer.isBuffer(body)?body:JSON.stringify(body)):undefined});
  const before=await db.$queryRaw`SELECT email,"updatedAt" FROM app_users WHERE id=1`;
  const details={...emptyProfileDetails(),nickname:'Tester',contactEmail:'contact@example.org'};
  assert.equal((await call('/profile','PATCH',details)).status,200);
  assert.equal((await (await call('/profile')).json()).nickname,'Tester');
  assert.equal((await (await call('/profile','GET',undefined,'2')).json()).nickname,'');
  assert.equal((await call('/profile','PATCH',{...details,userId:2})).status,400);
  assert.equal((await call('/profile','PATCH',{...details,contactEmail:'bad'})).status,400);
  assert.equal((await call('/profile','PATCH',details,'1',false)).status,403);
  assert.equal((await call('/profile','PATCH',details,'3')).status,403);
  assert.equal((await call('/profile','GET',undefined,'')).status,401);
  const picture=await sharp({create:{width:500,height:300,channels:3,background:'#357'}}).png().toBuffer();
  assert.equal((await call('/avatar','PUT',picture)).status,200);
  const image=await call('/avatar');assert.equal(image.headers.get('content-type'),'image/jpeg');
  const metadata=await sharp(Buffer.from(await image.arrayBuffer())).metadata();assert.equal(metadata.width,256);assert.equal(metadata.height,256);assert.equal(metadata.exif,undefined);
  assert.equal((await call('/avatar','GET',undefined,'2')).status,404);
  assert.equal((await call('/avatar','PUT',Buffer.from('<svg/>'))).status,400);
  assert.equal((await call('/avatar','PUT',Buffer.alloc(5*1024*1024+1))).status,413);
  assert.equal((await call('/avatar','DELETE')).status,200);assert.equal((await call('/avatar')).status,404);
  assert.deepEqual(await db.$queryRaw`SELECT email,"updatedAt" FROM app_users WHERE id=1`,before);
  const huge=await sharp({create:{width:5000,height:4000,channels:3,background:'#fff'}}).png().toBuffer();
  await assert.rejects(normalizeAvatar(huge),{statusCode:400});
 } finally { server.closeAllConnections(); await new Promise<void>(r=>server.close(()=>r())); await db.$disconnect(); await Promise.all(generated.map(p=>unlink(p))); }
});
