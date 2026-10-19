import test from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { build } from "esbuild";
import { PrismaClient } from "@prisma/client";
import * as h3 from "h3";
import { createServer } from "node:http";
import { once } from "node:events";
const url = process.env.LIBRARY_TEST_DATABASE_URL || "";
if (!new URL(url).pathname.endsWith("_library_test"))
  throw new Error("Disposable *_library_test database required");
const db = new PrismaClient({ datasources: { db: { url } } });
Object.assign(globalThis, h3, { libraryTestDb: db });
const generated: string[] = [];
async function handler(file: string) {
  const out = await build({
    entryPoints: [file],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    packages: "external",
    plugins: [
      {
        name: "session",
        setup(b) {
          b.onResolve({ filter: /access-control.service$/ }, () => ({
            path: "auth",
            namespace: "test",
          }));
          b.onResolve({ filter: /utils\/prisma$/ }, () => ({
            path: "db",
            namespace: "test",
          }));
          b.onLoad({ filter: /.*/, namespace: "test" }, (args) => ({
            loader: "js",
            contents:
              args.path === "db"
                ? "export const prisma=globalThis.libraryTestDb;"
                : `
   export async function getAccessActor(e){ const id=Number(e.node.req.headers['x-test-user']); if(!id)throw Object.assign(new Error('auth'),{statusCode:401}); const user=await globalThis.libraryTestDb.user.findUnique({where:{id}}); if(!user||user.status!=='ACTIVE')throw Object.assign(new Error('blocked'),{statusCode:403}); return {user,isSystemAdmin:id===1}; }
   export async function requirePermission(e,key,action){const a=await getAccessActor(e);if(a.user.id!==1)throw Object.assign(new Error('denied'),{statusCode:403});return {userId:a.user.id};}
  `,
          }));
        },
      },
    ],
  });
  const p = resolve(`tests/library-video/.generated-${generated.length}.mjs`);
  generated.push(p);
  await writeFile(p, out.outputFiles[0]!.text);
  return (await import(pathToFileURL(p).href)).default;
}

import { randomUUID } from 'node:crypto';
import { claim, processVideo, runMedia } from '../../scripts/lib/library-video-process.mjs';
import { byteRange, checkedVideoFile } from '../../scripts/lib/library-video-files.mjs';
test('video: uploads, permissions, >2GB size, worker, ranges, progress, trash and category moves', async () => {
 const app=h3.createApp({debug:false}),router=h3.createRouter(),server=createServer(h3.toNodeListener(app));
 try {
  await db.user.createMany({data:[{id:1,authType:'DOMAIN',status:'ACTIVE',login:'librarian'},{id:2,authType:'EXTERNAL',status:'ACTIVE',email:'reader@test.invalid'},{id:3,authType:'DOMAIN',status:'BLOCKED',login:'blocked'}]});
  const root=await db.libraryCategory.create({data:{name:'Learning'}});
  const child=await db.libraryCategory.create({data:{name:'IT',parentId:root.id}});
  const destination=await db.libraryCategory.create({data:{name:'Safety'}});
  for (const [route,file,verb] of [
   ['/uploads','video-uploads/index.post','post'],['/uploads','video-uploads/index.options','options'],
   ['/videos','videos/index.get','get'],['/videos/:id','videos/[id].get','get'],['/videos/:id','videos/[id].patch','patch'],
   ['/videos/:id/upload','videos/[id]/upload.head','head'],['/videos/:id/upload','videos/[id]/upload.patch','patch'],
   ['/videos/:id/media','videos/[id]/media.get','get'],['/videos/:id/media','videos/[id]/media.head','head'],['/videos/:id/poster','videos/[id]/poster.get','get'],
   ['/videos/:id/position','videos/[id]/position.get','get'],['/videos/:id/position','videos/[id]/position.put','put'],
   ['/videos/:id/state','videos/[id]/state.post','post'],['/settings','video-settings/index.put','put'],
   ['/catalog','catalog.get','get'],['/categories/:id','categories/[id].delete','delete'],
  ]) (router as any)[verb](route,await handler('server/api/library/'+file+'.ts'));
  app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const port=(server.address() as any).port;
  const call=(path:string,method='GET',body?:any,user='1',headers:Record<string,string>={})=>fetch(`http://127.0.0.1:${port}${path}`,{method,headers:{'x-test-user':user,'x-space-library':'1',...(!Buffer.isBuffer(body)&&body?{'Content-Type':'application/json'}:{}),...headers},body:body?(Buffer.isBuffer(body)?body:JSON.stringify(body)):undefined});
  const fixture=resolve('tests/library-video/fixture.mp4');
  await runMedia('/usr/bin/ffmpeg',['-v','error','-y','-f','lavfi','-i','color=c=blue:s=160x90:r=10','-t','2','-c:v','mpeg4','-threads','1',fixture],undefined);
  const bytes=await readFile(fixture);
  const creationHeaders=(total=bytes.length,key=randomUUID())=>({'Tus-Resumable':'1.0.0','Upload-Length':String(total),'Upload-Metadata':'space '+Buffer.from(JSON.stringify({title:'Computer literacy',author:'Space',categoryIds:[root.id,child.id],clientKey:key,filename:'lesson.mp4',fingerprint:'a'.repeat(64)})).toString('base64')});
  assert.equal((await call('/videos','GET',undefined,'')).status,401);
  assert.equal((await call('/videos','GET',undefined,'3')).status,403);
  assert.equal((await call('/uploads','POST',undefined,'2',creationHeaders())).status,403);
  assert.equal((await call('/uploads','POST',undefined,'1',{'Tus-Resumable':'0.2'})).status,412);
  assert.equal((await call('/settings','PUT',{maxMiB:3072},'2')).status,403);
  assert.equal((await call('/settings','PUT',{maxMiB:3072})).status,200);
  assert.equal((await call('/uploads','POST',undefined,'1',creationHeaders(4*1024**3))).status,413);
  const large=await call('/uploads','POST',undefined,'1',creationHeaders(3*1024**3)); assert.equal(large.status,201);
  const largeId=large.headers.get('location')!.split('/')[4];
  assert.equal(Number((await db.libraryVideo.findUniqueOrThrow({where:{id:largeId}})).totalBytes),3*1024**3);
  const headers=creationHeaders();
  let r=await call('/uploads','POST',undefined,'1',headers);assert.equal(r.status,201,await r.text());
  const location=r.headers.get('location')!.replace('/api/library',''), id=location.split('/')[2];
  r=await call('/uploads','POST',undefined,'1',headers);assert.equal(r.headers.get('location'),'/api/library'+location);
  assert.equal((await call(`/videos/${id}`,'GET',undefined,'2')).status,403);
  assert.equal((await call(`/videos/${id}/upload`,'HEAD',undefined,'2',{'Tus-Resumable':'1.0.0'})).status,403);
  const patch=(offset:number,data:Buffer,user='1')=>call(location,'PATCH',data,user,{'Tus-Resumable':'1.0.0','Upload-Offset':String(offset),'Content-Type':'application/offset+octet-stream'});
  assert.equal((await patch(0,Buffer.alloc(9*1024**2))).status,413);
  assert.equal((await patch(0,bytes.subarray(0,100))).status,204);
  assert.equal((await patch(0,bytes.subarray(0,100))).status,409);
  r=await call(location,'HEAD',undefined,'1',{'Tus-Resumable':'1.0.0'});assert.equal(r.headers.get('upload-offset'),'100');
  const concurrent=await Promise.all([patch(100,bytes.subarray(100,200)),patch(100,bytes.subarray(100,200))]);
  assert.deepEqual(concurrent.map(r=>r.status).sort(),[204,409]);
  assert.equal((await patch(200,bytes.subarray(200))).status,204);
  const job=await claim(db);assert.equal(job.id,id);assert.equal(await claim(db),null);
  await processVideo(db,job,new AbortController().signal);
  const ready=await db.libraryVideo.findUniqueOrThrow({where:{id}});assert.equal(ready.status,'READY',ready.error||'');assert.ok(ready.duration!>1);
  assert.equal(await db.libraryVideoChunk.count({where:{videoId:id}}),0);
  r=await call(`/videos/${id}/media`,'GET',undefined,'2',{range:'bytes=0-99'});assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,100);
  assert.equal((await call(`/videos/${id}/media`,'GET',undefined,'')).status,401);
  assert.equal((await call(`/videos/${id}/media`,'GET',undefined,'3')).status,403);
  r=await call(`/videos/${id}/media`,'HEAD',undefined,'2');assert.equal(r.status,200);assert.ok(Number(r.headers.get('content-length'))>0);
  assert.equal((await call(`/videos/${id}/media`,'GET',undefined,'2',{range:'bytes=999999999-'})).status,416);
  assert.equal((await call(`/videos/${id}/poster`,'GET',undefined,'2')).status,200);
  // Compatible H.264 remux and recovery of an expired processing lease.
  const compatibleBytes=await readFile((await checkedVideoFile(ready.mediaPath)).file);
  const compatibleMeta={'Tus-Resumable':'1.0.0','Upload-Length':String(compatibleBytes.length),'Upload-Metadata':'space '+Buffer.from(JSON.stringify({title:'Remux',categoryIds:[destination.id],clientKey:randomUUID(),filename:'ready.mp4',fingerprint:'c'.repeat(64)})).toString('base64')};
  r=await call('/uploads','POST',undefined,'1',compatibleMeta);assert.equal(r.status,201);const remuxId=r.headers.get('location')!.split('/')[4];
  assert.equal((await call(`/videos/${remuxId}/upload`,'PATCH',compatibleBytes,'1',{'Tus-Resumable':'1.0.0','Upload-Offset':'0','Content-Type':'application/offset+octet-stream'})).status,204);
  await db.libraryVideo.update({where:{id:remuxId},data:{status:'PROCESSING',leaseToken:randomUUID(),leaseUntil:new Date(0)}});
  const recoveredJob=await claim(db);assert.equal(recoveredJob.id,remuxId);await processVideo(db,recoveredJob,new AbortController().signal);
  assert.equal((await db.libraryVideo.findUniqueOrThrow({where:{id:remuxId}})).status,'READY');

  process.env.LIBRARY_VIDEO_X_ACCEL='1';r=await call(`/videos/${id}/media`,'GET',undefined,'2');assert.match(r.headers.get('x-accel-redirect')!,/^\/_space-library-video\//);delete process.env.LIBRARY_VIDEO_X_ACCEL;
  assert.equal((await call(`/videos/${id}/position`,'PUT',{seconds:1},'2')).status,200);
  assert.equal((await (await call(`/videos/${id}/position`,'GET',undefined,'2')).json()).seconds,1);
  assert.equal((await (await call(`/videos/${id}/position`)).json()).seconds,0);
  const catalog=await (await call('/catalog','GET',undefined,'2')).json();assert.equal(catalog.categories.find((c:any)=>c.id===root.id).count,1);
  assert.equal((await call(`/categories/${child.id}`,'DELETE',{})).status,409);
  assert.equal((await call(`/categories/${child.id}`,'DELETE',{targetId:destination.id})).status,200);
  assert.equal(await db.libraryVideoCategory.count({where:{videoId:id,categoryId:destination.id}}),1);
  const current=await db.libraryVideo.findUniqueOrThrow({where:{id}});
  assert.equal((await call(`/videos/${id}/state`,'POST',{action:'trash',version:current.version},'2')).status,403);
  assert.equal((await call(`/videos/${id}/state`,'POST',{action:'trash',version:current.version})).status,200);
  assert.equal((await call(`/videos/${id}/media`,'GET',undefined,'2')).status,403);
  assert.equal((await call(`/videos/${id}/state`,'POST',{action:'restore',version:current.version+1})).status,200);
  assert.equal((await call(`/videos/${id}/media`,'GET',undefined,'2')).status,200);
  // A malformed completed upload stays unpublished and can be retried or trashed.
  r=await call('/uploads','POST',undefined,'1',{...creationHeaders(4), 'Upload-Metadata':'space '+Buffer.from(JSON.stringify({title:'Invalid',categoryIds:[root.id],clientKey:randomUUID(),filename:'bad.mp4',fingerprint:'b'.repeat(64)})).toString('base64')});assert.equal(r.status,201,await r.text());const bad=r.headers.get('location')!.split('/')[4];
  assert.equal((await call(`/videos/${bad}/upload`,'PATCH',Buffer.from('oops'),'1',{'Tus-Resumable':'1.0.0','Upload-Offset':'0','Content-Type':'application/offset+octet-stream'})).status,204);
  await processVideo(db,await claim(db),new AbortController().signal);
  assert.equal((await db.libraryVideo.findUniqueOrThrow({where:{id:bad}})).status,'ERROR');
  assert.equal((await call(`/videos/${bad}/media`,'GET',undefined,'2')).status,403);
  assert.deepEqual(byteRange('bytes=-10',100),{start:90,end:99});assert.throws(()=>byteRange('bytes=-0',100));assert.throws(()=>byteRange('bytes=0-1,4-5',100));
  await assert.rejects(()=>checkedVideoFile('../etc/passwd'));
  await unlink(fixture);
 } finally {server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await db.$disconnect();for(const p of generated)await unlink(p).catch(()=>{});}
});
