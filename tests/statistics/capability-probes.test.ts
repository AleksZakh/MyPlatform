import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { writeFile, unlink } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createServer } from 'node:http';
import { once } from 'node:events';
import * as h3 from 'h3';

test('capability probes are silent; protected navigation and mutation still record denial', async () => {
 const calls:any[]=[],audit:any[]=[],usage:any[]=[];
 Object.assign(globalThis,{probeCalls:calls,probeAudit:audit,probeUsage:usage});
 const output=resolve('tests/statistics/.capability-test.mjs');
 const built=await build({stdin:{contents:`export {default as check} from './server/api/access/check.get';export {default as guard} from './server/api/admin/guard.get';export {recordDeniedResponse} from './server/services/usage-denied';export {requirePermission} from './server/services/access-control.service';`,resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'isolate',setup(b){
  b.onResolve({filter:/access-control.service$/},()=>({path:'auth',namespace:'test'}));
  b.onResolve({filter:/^\.\/usage$/},()=>({path:'usage',namespace:'test'}));
  b.onResolve({filter:/^~~\//},a=>({path:resolve(a.path.slice(3)+'.ts')}));
  b.onLoad({filter:/.*/,namespace:'test'},a=>({resolveDir:process.cwd(),loader:'js',contents:a.path==='usage'?`export function recordUsage(e){globalThis.probeUsage.push(e)}`:`import {createError,getHeader} from 'h3';
  export async function requirePermission(event,resource,action,options={}) {
   globalThis.probeCalls.push({resource,action,options});
   const mode=getHeader(event,'x-test-mode');
   if(mode==='allowed')return {resourceKey:resource,action,sources:['USER'],userId:2};
   if(mode==='anonymous')throw createError({statusCode:401});
   if(mode==='failure')throw createError({statusCode:503});
   if(options.auditDenial!==false)globalThis.probeAudit.push({resource,action});
   throw createError({statusCode:403});
  }`}));
 }}]});
 await writeFile(output,built.outputFiles[0]!.text);const m=await import(pathToFileURL(output).href);
 const app=h3.createApp({onAfterResponse:e=>m.recordDeniedResponse(e)}),router=h3.createRouter();
 app.use(h3.defineEventHandler(e=>{e.context.user={id:2,login:'employee',authType:'DOMAIN'};}));
 router.get('/api/access/check',m.check);router.get('/api/admin/guard',m.guard);
 router.delete('/api/test/items/:id',h3.defineEventHandler(async e=>{await m.requirePermission(e,'lab.sampling-tests','DELETE');return {ok:true};}));
 app.use(router);const server=createServer(h3.toNodeListener(app));server.listen(0,'127.0.0.1');await once(server,'listening');
 const base='http://127.0.0.1:'+(server.address() as any).port;
 try {
  for(const resource of ['admin.center','lab.sampling-tests']) {
   const r=await fetch(base+'/api/access/check?resource='+resource+'&action=DELETE');
   assert.equal(r.status,200);assert.equal((await r.json()).allowed,false);
  }
  assert.equal(audit.length,0);assert.equal(usage.length,0);assert.ok(calls.every(c=>c.options.auditDenial===false));
  for(const [mode,status] of [['anonymous',401],['failure',503],['allowed',200]] as const){
   const r=await fetch(base+'/api/access/check?resource=admin.center&action=VIEW',{headers:{'x-test-mode':mode}});assert.equal(r.status,status);
   if(mode==='allowed')assert.equal((await r.json()).allowed,true);
  }
  assert.equal(usage.length,0);
  assert.equal((await fetch(base+'/api/admin/guard?page=/admin')).status,403);
  assert.equal(audit.length,1);assert.equal(usage.length,1);
  // Client metadata cannot silence a real operation.
  assert.equal((await fetch(base+'/api/test/items/15?probe=1',{method:'DELETE',headers:{'x-access-capability-probe':'1'}})).status,403);
  assert.equal(audit.length,2);assert.equal(usage.length,2);
  assert.equal(usage[1].kind,'ACCESS_DENIED');
 }finally{server.closeAllConnections();server.close();await unlink(output);}
});
