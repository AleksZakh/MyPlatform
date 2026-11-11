import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile, symlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { pathToFileURL } from 'node:url';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { createApp, createRouter, toNodeListener } from 'h3';
test('Admin catalogs: built-ins, future departments, explicit initialization, real upload, no traversal or hidden writes',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'space-catalog-')),root=path.join(temp,'files');await mkdir(root);await mkdir(path.join(root,'lab'));
 process.env.LAB_FILES_ROOT=root;process.env.FILE_OPERATIONS_ROOT=path.join(temp,'journal');
 const markers=new Set<string>();const db:any={
  department:{findMany:async()=>[{id:1,key:'lab',name:'Лабораторный контроль',isActive:true},{id:7,key:'new',name:'Новый отдел',isActive:true}]},
  auditLog:{create:async()=>({})},
  fileStorageOperation:{create:async({data}:any)=>{markers.add(data.id);return data;},findUnique:async({where}:any)=>markers.has(where.id)?{id:where.id}:null},
 };
 db.$transaction=async(fn:any)=>fn(db);(globalThis as any).__storageDb=db;
 const generated:string[]=[];
 async function bundle(file:string){const result=await build({entryPoints:[file],bundle:true,write:false,format:'esm',platform:'node',packages:'external',plugins:[{name:'test',setup(b){
  b.onResolve({filter:/services\/storage\/disk$/},()=>({path:'auth',namespace:'fixture'}));
  b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'fixture'}));
  b.onResolve({filter:/utils\/auditLog$/},()=>({path:'audit',namespace:'fixture'}));
  b.onResolve({filter:/storage\/references$|^\.\/references$/},()=>({path:'refs',namespace:'fixture'}));
  b.onLoad({filter:/.*/,namespace:'fixture'},({path})=>({resolveDir:process.cwd(),loader:'js',contents:path==='auth'?`import {createError,setHeader} from 'h3';export async function diskAdmin(e){if(e.node.req.headers['x-test-user']!=='admin')throw createError({statusCode:403});setHeader(e,'Cache-Control','private, no-store');return {id:1,login:'admin'};}`:path==='db'?'export const prisma=globalThis.__storageDb;':path==='refs'?'export async function fileReferences(){return [];} export async function changeReference(){};':'export async function writeAuditEvent(){};export async function auditDataChange(){};export function computeAuditDelta(){return [];}'}));
 }}]});const p=path.resolve('tests/disk/.catalog-'+generated.length+'.mjs');generated.push(p);await writeFile(p,result.outputFiles[0]!.text);return (await import(pathToFileURL(p).href)).default;}
 const app=createApp(),router=createRouter(),server=createServer(toNodeListener(app));
 try{
  router.get('/files',await bundle('server/api/admin/files/index.get.ts'));router.post('/init',await bundle('server/api/admin/files/departments/index.post.ts'));router.post('/upload',await bundle('server/api/admin/files/upload.post.ts'));app.use(router);server.listen(0,'127.0.0.1');await once(server,'listening');
  const base='http://127.0.0.1:'+(server.address() as any).port;
  const get=(p:string,user='admin')=>fetch(base+p,{headers:{'x-test-user':user}});
  const init=(key:string,header=true)=>fetch(base+'/init',{method:'POST',headers:{'x-test-user':'admin','content-type':'application/json',...(header?{'x-space-storage':'1'}:{})},body:JSON.stringify({key})});
  assert.equal((await get('/files','other')).status,403);
  let r=await get('/files');assert.equal(r.status,200);const data=await r.json();assert.deepEqual(data.items.map((i:any)=>i.path).sort(),['departments/7','diagnostic','lab','upts']);
  assert.deepEqual(await readdir(root),['lab']);r=await get('/files?path=upts');assert.equal((await r.json()).initialized,false);assert.deepEqual(await readdir(root),['lab']);
  assert.equal((await init('diagnostic',false)).status,403);assert.equal((await init('../escape')).status,400);
  assert.equal((await init('diagnostic')).status,200);assert.equal((await init('diagnostic')).status,200);
  assert.equal((await init('department-7')).status,200);
  async function upload(directory:string){const form=new FormData();form.set('departmentDirectory',directory);form.set('file',new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF'],{type:'application/pdf'}),'test.pdf');return fetch(base+'/upload',{method:'POST',headers:{'x-test-user':'admin','x-space-storage':'1'},body:form});}
  r=await upload('upts');assert.equal(r.status,200,await r.text());const files=await readdir(path.join(root,'upts'));assert.equal(files.length,1);assert.match(await readFile(path.join(root,'upts',files[0]!), 'utf8'),/^%PDF/);
  assert.equal((await upload('lab')).status,409);assert.equal((await upload('../outside')).status,409);
  await symlink(temp,path.join(root,'diagnostic/escape'));assert.equal((await upload('diagnostic/escape')).status,409);
  assert.equal((await get('/files?path=../')).status,400);
  await mkdir(path.join(root,'upts','Объект Проверка [1]'));const markersBefore=markers.size;assert.equal((await upload('upts/Объект Проверка [1]')).status,409);assert.equal(markers.size,markersBefore);assert.deepEqual(await readdir(path.join(root,'upts','Объект Проверка [1]')),[]);
  assert.ok(markers.size>0);
 }finally{server.closeAllConnections();server.close();for(const p of generated)await rm(p,{force:true});await rm(temp,{recursive:true,force:true});delete (globalThis as any).__storageDb;}
});
