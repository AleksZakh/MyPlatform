import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newContractWorkIndex,indexContractWork,analyzeUserWork} from '../scripts/lib/diagnostic-user-work-analysis';
import {legacyColumns,type LegacyUserWork,parseUserWorksSql} from '../scripts/lib/legacy-user-work-sql';
import {legacyColumns as contractColumns,type LegacyContractWork} from '../scripts/lib/legacy-contract-work-sql';

const user=(patch:Partial<LegacyUserWork>={}):LegacyUserWork=>({...Object.fromEntries(legacyColumns.map(k=>[k,''])),id:'4',user_fio:'Иванов И.И.',contragent:'Заказчик',dog_number:'Д-1',date_dog:'2020-01-01',work_id:'105',work_name:'Договор',work_type:'dog_works',work_plan_length:'1.00',work_status:'completed',...patch} as LegacyUserWork);
const contract=(patch:Partial<LegacyContractWork>={}):LegacyContractWork=>({...Object.fromEntries(contractColumns.map(k=>[k,''])),id:'42',kontragent:'Заказчик',number_dog:'Д-1',date_dog:'2020-01-01',work_id:'105',work_name:'Договор',work_plan_exec:'Иванов И.И.',work_fact_exec:'Иванов И.И.',work_plan_length:'1',work_status:'completed',...patch} as LegacyContractWork);

test('same contract and code never auto-merges repeated assignments',()=>{
 const index=newContractWorkIndex();indexContractWork(index,contract());indexContractWork(index,contract({id:'43'}));
 const result=analyzeUserWork(user(),index);
 assert.equal(result.action,'CANDIDATE_REQUIRES_REVIEW');assert.equal(result.candidates.length,2);
 assert(result.warnings.some(w=>w.includes('неполном факте')));
});
test('direct links distinguish exact matches, conflicts and one-to-many duplicates',()=>{
 const index=newContractWorkIndex();indexContractWork(index,contract({user_work_id:'4'}));
 assert.equal(analyzeUserWork(user(),index).action,'DIRECT_LINK_MATCH');
 const conflict=analyzeUserWork(user({user_fio:'Петров П.П.',work_plan_length:'3'}),index);
 assert.equal(conflict.action,'DIRECT_LINK_CONFLICT');assert(conflict.candidates[0]!.differences.some(d=>d.field==='work_plan_length'));
 indexContractWork(index,contract({id:'43',user_work_id:'4'}));assert.equal(analyzeUserWork(user(),index).action,'AMBIGUOUS_DIRECT_LINK');
});
test('structure work keeps code, executor and zero hours, never becomes a contract work',()=>{
 const result=analyzeUserWork(user({work_type:'build_works',building:'00114',work_plan_length:'0'}),newContractWorkIndex());
 assert.equal(result.action,'NEEDS_STRUCTURE_SOURCE');assert.equal(result.source.building,'00114');assert.equal(result.source.work_plan_length,'0');
 assert.equal(analyzeUserWork(user({work_type:'build_works'}),newContractWorkIndex()).action,'INVALID_SOURCE');
 assert.equal(analyzeUserWork(user({building:'114'}),newContractWorkIndex()).action,'INVALID_SOURCE');
});
test('history is ignored, invalid business dates and unknown kinds are held',()=>{
 const index=newContractWorkIndex();
 assert.equal(analyzeUserWork(user({history:'\0'}),index).sourceHash,analyzeUserWork(user(),index).sourceHash);
 for(const patch of [{work_plan_start:'20201-07-09'},{work_plan_length:'-1'},{work_plan_length:'.'},{work_type:'unknown'},{work_plan_start:'2020-02-01',work_plan_finish:'2020-01-01'}])assert.equal(analyzeUserWork(user(patch),index).action,'INVALID_SOURCE');
});
test('full dump placeholders and translated kinds retain originals without inventing structure links',()=>{
 const index=newContractWorkIndex();indexContractWork(index,contract({user_work_id:'4'}));
 const result=analyzeUserWork(user({building:'--',work_type:'Работы с договором',work_plan_length:'1.'}),index);
 assert.equal(result.action,'DIRECT_LINK_MATCH');assert.equal(result.source.building,'--');assert.equal(result.source.work_type,'Работы с договором');
 assert.equal(analyzeUserWork(user({building:'--',work_type:'Работы по сооружению'}),index).action,'INVALID_SOURCE');
 assert.equal(analyzeUserWork(user({work_plan_length:'.5'}),index).candidates[0]!.differences.find(d=>d.field==='work_plan_length')!.userValue,'0.5');
 assert.equal(analyzeUserWork(user({work_plan_length:'2.6666666666667'}),index).action,'INVALID_SOURCE');
 assert(analyzeUserWork(user({work_plan_start:'0020-12-28'}),index).warnings.some(w=>w.includes('Подозрительный год')));
});
test('user SQL parser retains all business columns and rejects changed schemas',()=>{
 const raw=user({work_note:"Кавычка ' и ; точка"});
 const q=(s:string|null)=>s===null?'NULL':"'"+s.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
 const sql='INSERT INTO `dis_user_works` ('+legacyColumns.map(c=>'`'+c+'`').join(',')+') VALUES ('+legacyColumns.map(c=>q(raw[c])).join(',')+');';
 assert.deepEqual(parseUserWorksSql(sql),[raw]);
 assert.throws(()=>parseUserWorksSql(sql.replace('`building`','`wrong_column`')),/Столбцы/);
});
