import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, link, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { measureDepartmentStorage } from '../../server/services/storage/usage';
const departments=[{key:'lab',name:'Лаборатория',path:'lab',departmentIds:[1],active:true},{key:'diagnostic',name:'Диагностика',path:'diagnostic',departmentIds:[2],active:true},{key:'upts',name:'УПТС',path:'upts',departmentIds:[3],active:true},{key:'department-7',name:'Отдел 7',path:'departments/7',departmentIds:[7],active:true}];
test('Department totals include project contracts, private/trash bytes, custom departments, unassigned and no duplicate inodes',async()=>{
 const temp=await mkdtemp(path.join(os.tmpdir(),'space-usage-'));
 const storage=path.join(temp,'files'),projects=path.join(temp,'projects');
 async function put(p:string,n:number){await mkdir(path.dirname(p),{recursive:true});await writeFile(p,Buffer.alloc(n));}
 try{
  await put(path.join(storage,'lab/a.pdf'),4096);await put(path.join(storage,'diagnostic/a.pdf'),8192);
  await put(path.join(storage,'departments/7/a.pdf'),4096);await put(path.join(storage,'legacy.pdf'),4096);
  await put(path.join(projects,'101/contracts/2/shared/file'),12288);await put(path.join(projects,'101/private/8/trashed-file'),4096);
  await put(path.join(projects,'102/shared/unknown'),4096);
  const input={storage,projects,departments,projectOwners:new Map([[101,'upts']])};
  const result=await measureDepartmentStorage(input);
  assert.equal(result.status,'complete');assert.equal(result.rows.find(r=>r.key==='upts')!.files,2);
  assert.equal(result.rows.find(r=>r.key==='department-7')!.files,1);assert.equal(result.rows.find(r=>r.key==='projects')!.files,1);
  assert.equal(result.rows.find(r=>r.key==='other')!.files,1);
  assert.equal(result.totalBytes,result.rows.reduce((n,r)=>n+r.bytes,0));assert.ok(Math.abs(result.rows.reduce((n,r)=>n+(r.percent||0),0)-100)<0.3);
  await link(path.join(storage,'lab/a.pdf'),path.join(storage,'diagnostic/hardlink.pdf'));
  const linked=await measureDepartmentStorage(input);assert.equal(linked.rows.reduce((n,r)=>n+r.files,0),7);
  await put(path.join(temp,'outside/secret'),4096);await symlink(path.join(temp,'outside'),path.join(storage,'upts-link'));
  const guarded=await measureDepartmentStorage(input);assert.equal(guarded.status,'partial');assert.equal(guarded.rows.reduce((n,r)=>n+r.files,0),7);
  assert.match(guarded.warnings.join(' '),/Символические ссылки/);
  const bounded=await measureDepartmentStorage({...input,maxEntries:1});assert.equal(bounded.status,'partial');assert.match(bounded.warnings.join(' '),/лимит/);
  const missing=await measureDepartmentStorage({...input,projects:path.join(temp,'missing')});assert.equal(missing.status,'partial');
 }finally{await rm(temp,{recursive:true,force:true});}
});
test('Overlapping configured roots count project files once and retain UPTS attribution',async()=>{
 const storage=await mkdtemp(path.join(os.tmpdir(),'space-overlap-')),projects=path.join(storage,'projects');
 try{await mkdir(path.join(projects,'3/shared'),{recursive:true});await writeFile(path.join(projects,'3/shared/file'),Buffer.alloc(4096));
  const result=await measureDepartmentStorage({storage,projects,departments,projectOwners:new Map([[3,'upts']])});
  assert.equal(result.status,'complete');assert.equal(result.rows.reduce((n,r)=>n+r.files,0),1);assert.equal(result.rows.find(r=>r.key==='upts')!.files,1);
 }finally{await rm(storage,{recursive:true,force:true});}
});
