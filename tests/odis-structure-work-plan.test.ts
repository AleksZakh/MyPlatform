import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLegacyRows} from '../scripts/lib/odis-stream-sql';
import {structureWorkColumns,userWorkColumns,prepareStructureWork,databaseIndex,resolveDatabase,userIndex,addUser,reconcileUser,type Raw} from '../scripts/lib/odis-structure-work-plan';
import {canonicalWorkGroups,plannedWorkAction} from '../scripts/lib/odis-canonical-work-groups';

const source=(patch:Raw={}):Raw=>({...Object.fromEntries(structureWorkColumns.map(k=>[k,''])),id:'1',kontragent:'ГК «Заказчик»',number_dog:'Д-1',date_dog:'2020-12-04',build_cod_isso_work:'00115',work_name:'Выезд',work_id:'302',work_status:'completed',work_plan_length:'1.5',work_plan_exec:'Иванов И.И.',work_fact_exec:'Иванов И.И.',...patch});
const personal=(patch:Raw={}):Raw=>({...Object.fromEntries(userWorkColumns.map(k=>[k,''])),id:'5',contragent:'ГК "Заказчик"',dog_number:'Д-1',date_dog:'2020-12-04',building:'00115',work_name:'Выезд',work_id:'302',work_type:'build_works',work_status:'completed',work_plan_length:'1.50',user_fio:'Иванов И.И.',...patch});
function sql(raw:Raw,columns:readonly string[]=structureWorkColumns){const quote=(s:string|null|undefined)=>s==null?'NULL':"'"+s.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";return 'INSERT INTO `old`.`dis_dog_build_works` ('+columns.map(c=>'`'+c+'`').join(',')+') VALUES ('+columns.map(c=>quote(raw[c])).join(',')+');';}
async function* chunks(text:string,size=7){const bytes=Buffer.from(text);for(let i=0;i<bytes.length;i+=size)yield bytes.subarray(i,i+size);}
async function collect(text:string,size=7){const rows=[];for await(const row of parseLegacyRows(chunks(text,size),'dis_dog_build_works',structureWorkColumns))rows.push(row);return rows;}

test('streaming parser survives every UTF-8 boundary, escaped delimiters and reordered columns; history is omitted',async()=>{
 const raw=source({work_note:"Запись ' ; \\ и \n перенос",history:"' ; ) VALUES \\ "+'история'.repeat(500),work_warning:'Согласовать'});
 const text='-- Комментарий\nSET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";\n'+sql(raw,[...structureWorkColumns].reverse());
 for(const size of [1,2,7,1024]){
  const rows=await collect(text,size);assert.equal(rows.length,1);assert.equal(rows[0]!.work_note,raw.work_note);assert.equal(rows[0]!.work_warning,'Согласовать');assert(!Object.hasOwn(rows[0]!,'history'));
  assert.equal(prepareStructureWork(rows[0]!).sourceHash,prepareStructureWork(raw).sourceHash);
 }
});
test('a long ignored history never triggers the business field limit',async()=>{
 const text=sql(source({history:'x'.repeat(9*1024*1024)}));
 assert.equal((await collect(text,65536)).length,1);
});
test('rejects damaged/truncated SQL, unsupported modes, wrong schemas and malformed target INSERT',async()=>{
 await assert.rejects(collect(sql(source()).slice(0,-2)),/конец|Ожидал|Незаверш/);
 await assert.rejects(collect(sql(source()).replace('`work_warning`','`unknown`')),/Столбцы/);
 await assert.rejects(collect('SET SQL_MODE="NO_BACKSLASH_ESCAPES";'+sql(source())),/SQL_MODE/);
 await assert.rejects(collect('/*!40101 SET SQL_MODE="ANSI_QUOTES" */;'+sql(source())),/SQL_MODE/);
 await assert.rejects(collect('INSERT INTO dis_dog_build_works VALUES (1);'),/списком столбцов/);
 async function* broken(){yield Uint8Array.from([0xff]);}
 await assert.rejects(async()=>{for await(const row of parseLegacyRows(broken(),'dis_dog_build_works',structureWorkColumns))void row;});
});
test('accepts multirow inserts, multiple inserts and doubled SQL quotes, ignores unrelated data',async()=>{
 const first=sql(source({work_note:"O'Brien"}));
 const double=first.replace("O\\'Brien","O''Brien");assert.equal((await collect(double))[0]!.work_note,"O'Brien");
 const second=sql(source({id:'2'}));const start=second.indexOf(' VALUES ')+8;
 const joined=first.slice(0,-1)+','+second.slice(start);
 assert.equal((await collect('CREATE TABLE x (note text); INSERT INTO x VALUES (\'other;\');'+joined+sql(source({id:'3'})))).length,3);
});
test('preserves hours, warnings, criteria, executors and source code; never repairs bad business data',()=>{
 const row=prepareStructureWork(source({work_plan_length:'.5',work_fact_length:'0',work_warning:'Предупреждение',work_accept_type:'Принято'}));
 assert.equal(row.data.planHours,'0.5');assert.equal(row.data.factHours,'0');assert.equal(row.data.warning,'Предупреждение');assert.equal(row.data.criteria,'Принято');assert.equal(row.structureCode,'00115');
 const invalid:Raw[]=[{work_plan_length:'2022-10-11'},{work_plan_length:'2.6666666666667'},{work_plan_length:'.'},{work_plan_start:'0002-07-18'},{work_fact_start:'2021-02-02',work_fact_finish:'2021-02-01'},{user_work_id:'5,6'},{build_cod_isso_work:'--'}];
 for(const patch of invalid)assert(prepareStructureWork(source(patch)).errors.length);
 assert.equal(prepareStructureWork(source({number_dog:'111-тест_1'})).excluded,true);
 assert.equal(prepareStructureWork(source({history:'obsolete'})).sourceHash,prepareStructureWork(source()).sourceHash);
});
const snapshot=()=>({contracts:[{id:10,number:'Д-1',date:new Date('2020-12-04'),deletedAt:null,counterparty:{name:'ГК "Заказчик"'}}],structures:[{id:20,code:'00115',deletedAt:null}],links:[{id:30,contractId:10,structureId:20,deletedAt:null}],catalog:[{id:40,code:'302',name:'Выезд',deletedAt:null}],works:[] as {id:number;contractStructureId:number;workCodeSnapshot:string;deletedAt:Date|null}[]});
test('database resolution scopes contract + structure links and holds existing/deleted assignments',()=>{
 const row=prepareStructureWork(source()),db=snapshot();
 const result=resolveDatabase(row,databaseIndex(db));assert.equal(result.status,'RESOLVED');assert.deepEqual(result.target,{contractId:10,structureId:20,contractStructureId:30,workId:40});
 db.links[0]!.contractId=999;assert(resolveDatabase(row,databaseIndex(db)).issues.includes('NO_UNIQUE_ACTIVE_CONTRACT_STRUCTURE_LINK'));
 db.links[0]!.contractId=10;db.works.push({id:55,contractStructureId:30,workCodeSnapshot:'302',deletedAt:new Date()});assert(resolveDatabase(row,databaseIndex(db)).issues.includes('EXISTING_TARGET_REQUIRES_REVIEW'));
 db.contracts.push({...db.contracts[0]!,id:11});assert(resolveDatabase(row,databaseIndex(db)).issues.includes('NO_UNIQUE_ACTIVE_CONTRACT'));
});
test('personal direct links detect conflicts and do not silently merge fallback candidates',()=>{
 const users=userIndex();addUser(users,personal());
 const row=prepareStructureWork(source({user_work_id:'5'}));assert.equal(reconcileUser(row,users).status,'DIRECT_MATCH');
 assert.equal(reconcileUser(prepareStructureWork(source()),users).status,'CANDIDATES_REVIEW');
 assert.equal(reconcileUser(prepareStructureWork(source({user_work_id:'6'})),users).status,'DIRECT_MISSING');
 assert.equal(reconcileUser(row,null).issues[0],'PERSONAL_SOURCE_NOT_CHECKED');
 const wrong=userIndex();addUser(wrong,personal({building:'999',work_type:'dog_works'}));assert.equal(reconcileUser(row,wrong).status,'DIRECT_CONFLICT');
 assert.throws(()=>addUser(users,personal()),/Повторный ID/);
});
test('empty actual data does not require an actual executor or fill it from the planned assignee',()=>{
 const users=userIndex();addUser(users,personal({work_status:'overdue'}));
 const row=prepareStructureWork(source({user_work_id:'5',work_status:'overdue',work_fact_exec:''}));
 const result=reconcileUser(row,users);assert.equal(result.status,'DIRECT_MATCH');assert.equal(result.factExecutorCompared,false);
 assert.equal(row.data.factExecutor,'');assert.equal(row.data.factHours,null);assert.equal(row.data.factStart,null);
 const zero=prepareStructureWork(source({user_work_id:'5',work_status:'overdue',work_fact_exec:'',work_fact_length:'0'}));
 assert.equal(reconcileUser(zero,users).status,'DIRECT_CONFLICT');assert.equal(reconcileUser(zero,users).factExecutorCompared,true);
 const completed=prepareStructureWork(source({user_work_id:'5',work_status:'completed',work_fact_exec:''}));
 assert.equal(reconcileUser(completed,users).factExecutorCompared,true);
 const different=userIndex();addUser(different,personal({work_status:'overdue',work_fact_finish:'2021-01-01'}));
 assert.equal(reconcileUser(row,different).status,'DIRECT_CONFLICT');
});
test('approved code mapping retains source values/hashes, checks catalog name and compares personal codes',()=>{
 const raw=source({work_id:'129',work_name:'Обработка результатов испытаний',user_work_id:'5'}),row=prepareStructureWork(raw);
 assert.equal(row.sourceCode,'129');assert.equal(row.source.work_id,'129');assert.equal(row.data.code,'324');assert.deepEqual(row.codeMapping,{from:'129',to:'324',rule:'ODIS-129-324-20261113'});
 assert.notEqual(row.businessHash,prepareStructureWork({...raw,work_id:'324'}).businessHash);
 const db=snapshot();db.catalog=[{id:99,code:'324',name:'Обработка результатов испытаний',deletedAt:null}];
 assert.equal(resolveDatabase(row,databaseIndex(db)).target.workId,99);
 db.catalog[0]!.name='Другая работа';assert(resolveDatabase(row,databaseIndex(db)).issues.includes('CATALOG_MAPPING_NAME_MISMATCH'));
 assert(prepareStructureWork({...raw,work_name:'Другая работа'}).errors.length);
 const users=userIndex();addUser(users,personal({work_id:'324',work_name:'Обработка результатов испытаний'}));assert.equal(reconcileUser(row,users).status,'DIRECT_MATCH');
 const old=userIndex();addUser(old,personal({work_id:'129',work_name:'Обработка результатов испытаний'}));assert.equal(reconcileUser(row,old).status,'DIRECT_MATCH');assert.equal(old.byId.get(5)!.work_id,'129');
 const differs=userIndex();addUser(differs,personal({work_id:'324',work_name:'Обработка результатов испытаний',work_fact_length:'9'}));assert.equal(reconcileUser(row,differs).status,'DIRECT_CONFLICT');
});
test('exact aliases have one stable primary ID; repeated references across different works still conflict',()=>{
 const a=prepareStructureWork(source({id:'9',user_work_id:'5'})),b=prepareStructureWork(source({id:'2',user_work_id:'5',history:'old history'})),c=prepareStructureWork(source({id:'12',user_work_id:'5',work_note:'Другая запись'}));
 assert.equal(a.businessHash,b.businessHash);assert.notEqual(a.businessHash,c.businessHash);
 const merged=canonicalWorkGroups(new Map([[a.businessHash,[9,2]]]),new Map([[5,[9,2]]]));
 assert.equal(merged.canonicalById.get(9),2);assert.deepEqual(merged.aliasesByCanonical.get(2),[2,9]);assert.deepEqual(merged.canonicalByUser.get(5),[2]);
 assert.equal(plannedWorkAction(false,[],9,2,false),'MERGED_ALIAS');assert.equal(plannedWorkAction(false,[],2,2,false),'LINKS_RESOLVED_SCHEMA_PENDING');
 assert.equal(plannedWorkAction(false,['INVALID_SOURCE'],9,2,false),'DEFERRED');
 const separate=canonicalWorkGroups(new Map([[a.businessHash,[9,2]],[c.businessHash,[12]]]),new Map([[5,[9,2,12]]]));assert.deepEqual(separate.canonicalByUser.get(5),[2,12]);
 assert.equal(plannedWorkAction(true,[],9,null,false),'EXCLUDED_TEST');
});
