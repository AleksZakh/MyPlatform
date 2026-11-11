import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {writeFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createServer} from 'node:http';
import {once} from 'node:events';
import {createApp,createRouter,toNodeListener} from 'h3';
test('Usage API guards admin/header, maps UPTS first, includes inactive/custom owners and handles cooldown/errors',async()=>{
 const file=resolve('tests/disk/.usage-api.mjs');const state:any={calls:0,fail:false};(globalThis as any).__usageApi=state;
 const server=createServer();
 try{
 const result=await build({entryPoints:['server/api/admin/files/disk/departments.post.ts'],bundle:true,write:false,format:'esm',platform:'node',packages:'external',plugins:[{name:'fixture',setup(b){
  b.onResolve({filter:/storage\/disk$/},()=>({path:'auth',namespace:'fixture'}));b.onResolve({filter:/storage\/departments$/},()=>({path:'departments',namespace:'fixture'}));b.onResolve({filter:/storage\/usage$/},()=>({path:'usage',namespace:'fixture'}));b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'fixture'}));b.onResolve({filter:/utils\/auditLog$/},()=>({path:'audit',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({resolveDir:process.cwd(),loader:'js',contents:path==='auth'?`import {createError} from 'h3';export async function diskAdmin(e){if(e.node.req.headers['x-admin']!=='1')throw createError({statusCode:403});return {id:1};}`:path==='departments'?`export async function storageDepartments(){return [{key:'group-7',groupIds:[7]}];}`:path==='db'?`export const prisma={workProject:{findMany:async()=>[{id:1,groupId:7,upts:{}},{id:2,groupId:7,upts:null},{id:3,groupId:null,upts:null}]}};`:path==='usage'?`export async function measureDepartmentStorage(input){const s=globalThis.__usageApi;s.calls++;s.mapping=[...input.projectOwners];if(s.fail)throw Error('private path');return {status:'complete',totalBytes:1024,rows:[],warnings:[]};}`:'export async function writeAuditEvent(){};'}));
 }}]});await writeFile(file,result.outputFiles[0]!.text);
 const url=pathToFileURL(file).href;const app=createApp(),router=createRouter();router.post('/usage',(await import(url)).default);router.post('/failure',(await import(url+'?failure')).default);app.use(router);server.on('request',toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+(server.address() as any).port;const req=(url='/usage',admin=true,marker=true)=>fetch(base+url,{method:'POST',headers:{...(admin?{'x-admin':'1'}:{}),...(marker?{'x-space-disk-scan':'1'}:{})}});
 assert.equal((await req('/usage',false)).status,403);assert.equal((await req('/usage',true,false)).status,403);assert.equal(state.calls,0);
 assert.equal((await req()).status,200);assert.deepEqual(state.mapping,[[1,'upts'],[2,'group-7'],[3,'projects']]);
 const throttle=await req();assert.equal(throttle.status,429);assert.ok(Number(throttle.headers.get('retry-after'))>0);
 state.fail=true;const failed=await req('/failure');assert.equal(failed.status,503);const detail=await failed.json();assert.equal(detail.data.retryAfter,10);assert.ok(!JSON.stringify(detail).includes('private path'));
 }finally{server.closeAllConnections();server.close();await rm(file,{force:true});delete (globalThis as any).__usageApi;}
});
