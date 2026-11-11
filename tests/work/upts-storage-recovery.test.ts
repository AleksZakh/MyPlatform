import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {randomUUID,createHash} from 'node:crypto';

test('background recovery: bounded batches, failure isolation, retries, private files and originals',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'upts-recovery-test-'));
 process.env.LAB_FILES_ROOT=path.join(root,'files');process.env.WORK_PROJECT_FILES_ROOT=path.join(root,'projects');
 const {migratePendingUptsStorage}=await import('../../server/services/upts-storage-migration');
 const {openProjectFile}=await import('../../server/services/work/file-storage');
 const rows:any[]=[],object:any={id:1,number:'Тест',name:'Тест',storageFolder:null};
 const bytes=Buffer.from('drawing');const sha256=createHash('sha256').update(bytes).digest('hex');
 const old=path.join(root,'projects','1','contracts','1','shared','Чертёж — 01.11.2026');
 await mkdir(old,{recursive:true});
 for(let i=1;i<=7;i++){
  const row={id:String(i).padStart(5,'0'),contractId:1,projectId:1,ownerId:2,scope:'SHARED',storageKey:randomUUID(),storageFolder:'Чертёж — 01.11.2026',storagePath:null,name:'Схема.pdf',documentType:'Чертёж',size:bytes.length,sha256};rows.push(row);
  if(i!==5)await writeFile(path.join(old,row.storageKey),i===1?Buffer.from('corrupt'):bytes);
 }
 rows.push({...rows[0],id:'00008',scope:'PRIVATE',storageKey:randomUUID()});
 const matches=(row:any,w:any)=>Object.entries(w||{}).every(([k,v]:any)=>{
  if(v && typeof v==='object')return (!v.in||v.in.includes(row[k]))&&(!('not'in v)||row[k]!==v.not)&&(!v.gt||row[k]>v.gt);
  return row[k]===v;
 });
 const db:any={
  spaceGroup:{findFirst:async()=>null},
  uptsContract:{findMany:async({where}:any)=>matches(object,where)?[object]:[],updateMany:async({data}:any)=>{Object.assign(object,data);return {count:1}},findUniqueOrThrow:async()=>object},
  workProjectFile:{
   findMany:async({where,take}:any)=>rows.filter(r=>matches(r,where)).slice(0,take??rows.length),
   updateMany:async({where,data}:any)=>{const row=rows.find(r=>matches(r,where));if(row)Object.assign(row,data);return {count:row?1:0}},
   findUnique:async({where}:any)=>rows.find(r=>matches(r,where))
  },auditLog:{create:async()=>({})},$transaction:async(fn:any)=>fn(db)
 };
 try{
  const errors:any[]=[];const first=await migratePendingUptsStorage(db,null,r=>errors.push(r));
  assert.equal(first.migrated,3);assert.equal(first.failed,2);assert.equal(first.cursor,'00005');assert(first.hasMore);
  assert.equal(rows[0].storagePath,null);assert.equal(rows[4].storagePath,null);
  const second=await migratePendingUptsStorage(db,first.cursor);assert.equal(second.migrated,2);assert.equal(second.failed,0);assert(!second.hasMore);
  assert.equal(rows[7].storagePath,null,'private files stay private');
  await writeFile(path.join(old,rows[0].storageKey),bytes);await writeFile(path.join(old,rows[4].storageKey),bytes);
  const retry=await migratePendingUptsStorage(db);assert.equal(retry.migrated,2);assert.equal(retry.failed,0);assert.equal(retry.verified,0);
  for(const row of rows.slice(0,7)){
   assert(row.storagePath.startsWith('upts/Объект Тест [1]/Чертёж/'));
   assert.deepEqual(await readFile(path.join(old,row.storageKey)),bytes,'original retained');
   const file=await openProjectFile(row);try{assert.deepEqual(await file.readFile(),bytes)}finally{await file.close()}
  }
  const empty=await migratePendingUptsStorage(db);assert.equal(empty.objects,0);assert.equal(empty.failed,0);assert.equal(empty.cursor,null);
 }finally{await rm(root,{recursive:true,force:true});}
});
