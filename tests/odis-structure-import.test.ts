import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {loadApprovedSource,verifyCandidate,type ApprovedWork} from '../scripts/lib/odis-structure-import-source';
import {canonicalWorkGroups} from '../scripts/lib/odis-canonical-work-groups';
import {structureWorkColumns,userWorkColumns,prepareStructureWork,userIndex,reconcileUser,databaseIndex,resolveDatabase} from '../scripts/lib/odis-structure-work-plan';
import {sha256File} from '../scripts/lib/odis-stream-sql';
import {workData,verifyStored,classifyBatch,insertBatch,atomic,type ImportMeta} from '../scripts/lib/odis-structure-import-db';
import {checkMigrationScope} from '../scripts/lib/odis-migration-scope';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {resolve} from 'node:path';
const raw=(id:number,extra:Record<string,string>={}):Record<string,string>=>({...Object.fromEntries(structureWorkColumns.map(c=>[c,''])),id:String(id),kontragent:'Заказчик',number_dog:'Д-1',date_dog:'2020-01-01',build_cod_isso_work:'00115',work_id:'129',work_name:'Обработка результатов испытаний',work_status:'planned',work_plan_length:'0',...extra});
const refs={contracts:[{id:11,number:'Д-1',date:new Date('2020-01-01T00:00:00Z'),deletedAt:null,counterparty:{name:'Заказчик'}}],structures:[{id:22,code:'00115',deletedAt:null}],links:[{id:33,contractId:11,structureId:22,deletedAt:null}],catalog:[{id:44,code:'324',name:'Обработка результатов испытаний',deletedAt:null,hours:'5'}]};
const users=userIndex(),index=databaseIndex({...refs,works:[]});
const meta:ImportMeta={sourceHash:'a'.repeat(64),userSourceHash:'b'.repeat(64),actorId:7};
function fixture(values=[raw(2),raw(1)]){
 const prepared=values.map(prepareStructureWork),rows=new Map(prepared.map(r=>[r.legacyId,r])),business=new Map<string,number[]>(),references=new Map<number,number[]>();
 for(const r of prepared){if(r.excluded)continue;business.set(r.businessHash,[...(business.get(r.businessHash)||[]),r.legacyId]);if(r.userId)references.set(r.userId,[...(references.get(r.userId)||[]),r.legacyId]);}
 const groups=canonicalWorkGroups(business,references),row=rows.get(1)!;
 const candidate={...row,action:'LINKS_RESOLVED_SCHEMA_PENDING',blockers:[],isAlias:false,canonicalLegacyId:1,target:resolveDatabase(row,index),personal:reconcileUser(row,users),sourceOrigins:groups.aliasesByCanonical.get(1)!.map(id=>{const r=rows.get(id)!;return {legacyId:id,sourceIdRaw:r.source.id,sourceHash:r.sourceHash,sourceCode:r.sourceCode};})};
 return {candidate,rows,groups,item:verifyCandidate(candidate,rows,groups,users)};
}
const stored=(item:ApprovedWork,id=1)=>({...workData(item,meta),id,deletedAt:null,legacyPersonalSource:item.personal,legacyOrigins:item.origins.map(o=>({...o,assignmentId:id,sourceFileHash:meta.sourceHash})),catalogHoursSnapshot:'5'});
test('allowlist is rebuilt from immutable SQL; exact aliases retained; deferred and tests excluded',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'odis-import-source-'));
 try{
  const values=[raw(2),raw(1),raw(3,{user_work_id:'99'}),raw(4,{number_dog:'111-тест_1'})],f=fixture(values);
  assert.equal(f.rows.get(4)!.excluded,true);
  const file=join(dir,'source.sql'),userFile=join(dir,'users.sql'),planFile=join(dir,'report.json'),candidateFile=join(dir,'candidates.jsonl');
  const quote=(s:string)=>"'"+s.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
  await writeFile(file,'INSERT INTO `dis_dog_build_works` ('+structureWorkColumns.map(c=>'`'+c+'`').join(',')+') VALUES '+values.map(r=>'('+structureWorkColumns.map(c=>quote(r[c]!)).join(',')+')').join(',')+';');
  await writeFile(userFile,'INSERT INTO `dis_user_works` ('+userWorkColumns.map(c=>'`'+c+'`').join(',')+') VALUES ('+userWorkColumns.map(c=>quote(c==='id'?'999':c==='work_type'?'dog_works':'')).join(',')+');');
  await writeFile(planFile,JSON.stringify({mode:'PLAN',status:'PLANNED',analysisVersion:'structure-works-plan-v3',databaseUsed:true,historyIgnored:true,canApply:false,sourceRows:4,userSourceRows:1,sourceHash:await sha256File(file),userSourceHash:await sha256File(userFile),committed:{created:0,updated:0,deleted:0},byAction:{LINKS_RESOLVED_SCHEMA_PENDING:1,MERGED_ALIAS:1,DEFERRED:1,EXCLUDED_TEST:1},planned:{canonicalWorks:1,sourceRowsCovered:2,allNonTestCanonicalWorks:2}}));
  await writeFile(candidateFile,JSON.stringify(f.candidate)+'\n');
  const loaded=await loadApprovedSource(planFile,file,userFile,()=>{});assert.equal(loaded.approved.length,1);assert.deepEqual(loaded.approved[0]!.origins.map(o=>o.legacyId),[1,2]);assert.equal(loaded.approved[0]!.row.data.code,'324');
  const altered=structuredClone(f.candidate);altered.data.planHours='9';await writeFile(candidateFile,JSON.stringify(altered)+'\n');await assert.rejects(loadApprovedSource(planFile,file,userFile,()=>{}),/Нормализованные поля/);
  await writeFile(candidateFile,JSON.stringify(f.candidate)+'\n');await writeFile(file,(await readFile(file,'utf8'))+'\n');await assert.rejects(loadApprovedSource(planFile,file,userFile,()=>{}),/Контрольные суммы/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('missing aliases, alias-as-primary, source changes and direct personal conflicts cannot become candidates',()=>{
 const f=fixture();
 for(const mutate of [(c:any)=>c.sourceOrigins.pop(),(c:any)=>c.legacyId=2,(c:any)=>c.source.work_plan_length='9',(c:any)=>c.blockers=['INVALID_SOURCE']]){
  const candidate=structuredClone(f.candidate);mutate(candidate);assert.throws(()=>verifyCandidate(candidate,f.rows,f.groups,users));
 }
 const r=prepareStructureWork(raw(1,{user_work_id:'777'}));const groups=canonicalWorkGroups(new Map([[r.businessHash,[1]]]),new Map([[777,[1]]]));
 assert.throws(()=>verifyCandidate({...f.candidate,...r,personal:reconcileUser(r,users)},new Map([[1,r]]),groups,users),/Персональная ссылка/);
});
test('stored data preserves zero vs null, 129 provenance and exact aliases; edits and deletions stop resume',()=>{
 const {item}=fixture(),s=stored(item);verifyStored(item,s,meta);assert.equal(s.hours,'0');assert.equal(s.factHours,null);assert.equal(s.createdById,null);assert.equal(s.importedById,7);assert.equal(s.legacyOrigins[0]!.sourceCode,'129');
 for(const change of [(w:any)=>w.factHours='0',(w:any)=>w.note='edited',(w:any)=>w.legacyOrigins.pop(),(w:any)=>w.deletedAt=new Date(),(w:any)=>w.legacyPersonalSource={id:'other'}]){const copy=structuredClone(s);change(copy);assert.throws(()=>verifyStored(item,copy,meta));}
});
test('two different approved works may share catalog code; foreign assignments or changed links block',async()=>{
 const first=fixture().item,second=fixture([raw(1,{work_note:'Другая работа'})]).item;
 second.row.legacyId=9;second.row.source.id='9';second.origins=[{...second.origins[0]!,legacyId:9,sourceIdRaw:'9'}];
 const all=new Map([[1,first],[9,second]]),saved=stored(first);
 const tx:any={diagnosticStructureWork:{findMany:async()=>[saved]}};
 const decision=await classifyBatch(tx,[first,second],all,meta,refs as any);assert.equal(decision.existing.length,1);assert.equal(decision.create.length,1);
 tx.diagnosticStructureWork.findMany=async()=>[{...saved,legacyCanonicalId:null,importSourceHash:null,legacyOrigins:[]}];await assert.rejects(classifyBatch(tx,[first],all,meta,refs as any),/EXISTING_TARGET/);
 tx.diagnosticStructureWork.findMany=async()=>[];await assert.rejects(classifyBatch(tx,[first],all,meta,{...refs,links:[]} as any),/Связи изменились/);
});
test('batch inserts works, aliases and audit together; rollback and retry do not duplicate',async()=>{
 const {item}=fixture(),all=new Map([[1,item]]);let state:{works:any[];origins:any[];audit:any[]}={works:[],origins:[],audit:[]},fail=true;
 const tx:any={
  $queryRaw:async()=>[],
  diagnosticStructureWork:{findMany:async()=>state.works.map(w=>({...w,legacyOrigins:state.origins.filter(o=>o.assignmentId===w.id)})),createManyAndReturn:async({data}:any)=>data.map((d:any)=>{const w={...d,id:state.works.length+1,deletedAt:null,legacyPersonalSource:d.legacyPersonalSource??null};state.works.push(w);return {id:w.id,legacyCanonicalId:w.legacyCanonicalId};})},
  diagnosticStructureWorkOrigin:{createMany:async({data}:any)=>state.origins.push(...data)},
  auditLog:{createMany:async({data}:any)=>{if(fail)throw Error('audit unavailable');state.audit.push(...data);}},
 };
 const db:any={$transaction:async(fn:any)=>{const before=structuredClone(state);try{return await fn(tx);}catch(e){state=before;throw e;}}};
 const actor={id:7,login:'tester',email:null,authType:'PASSWORD'};
 await assert.rejects(atomic(db,t=>insertBatch(t,[item],meta,refs as any,actor)),/audit unavailable/);assert.equal(state.works.length,0);assert.equal(state.origins.length,0);
 fail=false;await atomic(db,t=>insertBatch(t,[item],meta,refs as any,actor));assert.equal(state.works.length,1);assert.equal(state.origins.length,2);assert.equal(state.audit.length,1);
 const next=await classifyBatch(tx,[item],all,meta,refs as any);assert.equal(next.create.length,0);assert.equal(next.existing.length,1);
 let calls=0;const serial:any={$transaction:async(fn:any)=>{if(calls++===0)throw Object.assign(Error('retry'),{code:'P2034'});return fn(tx);}};
 await atomic(serial,async()=>true);assert.equal(calls,2);
});
test('schema installer preserves other modules, is idempotent and stops on changed ODIS models',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'odis-schema-')),file=join(dir,'schema.prisma'),run=promisify(execFile);
 try{
  const before=await readFile('prisma/patches/odis-structure-work-import-v1/before.prisma.txt','utf8');
  const other='\nmodel OtherDepartment {\n  id Int @id\n  preserveMe String\n}\n';await writeFile(file,before+other);
  await run(process.execPath,[resolve('scripts/install-odis-structure-work-schema.mjs'),file]);const after=await readFile(file,'utf8');assert(after.endsWith(other));assert(after.includes('model DiagnosticStructureWorkOrigin'));
  await run(process.execPath,[resolve('scripts/install-odis-structure-work-schema.mjs'),file]);assert.equal(await readFile(file,'utf8'),after);
  const changed=before.replace('  version Int','  customField String\n  version Int')+other;await writeFile(file,changed);await assert.rejects(run(process.execPath,[resolve('scripts/install-odis-structure-work-schema.mjs'),file]));assert.equal(await readFile(file,'utf8'),changed);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('migration scope rejects unrelated pending or modified migrations',()=>{
 const history=[{migration_name:'old',checksum:'a',finished_at:new Date(),rolled_back_at:null}];
 assert.deepEqual(checkMigrationScope(new Map([['old','a'],['odis','b']]),history,'odis'),['odis']);
 assert.throws(()=>checkMigrationScope(new Map([['old','a'],['odis','b'],['other','c']]),history,'odis'),/другие ожидающие/);
 assert.throws(()=>checkMigrationScope(new Map([['old','changed'],['odis','b']]),history,'odis'),/Изменён файл/);
 assert.throws(()=>checkMigrationScope(new Map([['odis','b']]),[{...history[0]!,finished_at:null}],'odis'),/незавершённая/);
});
