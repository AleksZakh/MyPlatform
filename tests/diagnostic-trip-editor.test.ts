import test from 'node:test';
import assert from 'node:assert/strict';
import {parseTripInput} from '../shared/utils/diagnostic-trips';
import {syncTripStructureWorks} from '../server/services/diagnostic/trip-structure-works';
const input={contractId:1,executorId:1,participantIds:[5],structureIds:[10,11],start:'2026-11-16',finish:'2026-11-20',noStructures:false,destination:'',assignment:'',equipment:'',transport:'',accommodation:'',note:''};
function db(){
 const rows:any[]=[];const links=[{id:100,structureId:10},{id:101,structureId:11}];let catalog:any={id:301,code:'301',name:'Командировка',criteria:'Отчёт',hours:'8'};
 const tx:any={diagnosticContractStructure:{findMany:async({where}:any)=>where.contractId===1?links.filter(l=>where.structureId.in.includes(l.structureId)):[]},diagnosticWork:{findFirst:async()=>catalog},diagnosticStructureWork:{findMany:async({where}:any)=>rows.filter(w=>w.tripId===where.tripId),createMany:async({data}:any)=>{for(const d of data){assert(!rows.some(r=>r.tripId===d.tripId&&r.structureId===d.structureId));rows.push({id:rows.length+1,deletedAt:null,factStart:null,factFinish:null,factHours:null,factExecutor:'',tripCompletion:null,version:1,...d});}},update:async({where,data}:any)=>{const w=rows.find(w=>w.id===where.id);Object.assign(w,{...data,version:w.version+1});return w;}}};
 return {tx,rows,links,setCatalog:(v:any)=>catalog=v};
}
test('Понятные ошибки полей, числовые значения select, запрет произвольных ID',()=>{
 for(const [key,message] of [['contractId','Номер договора'],['executorId','организацию-исполнителя']] as const)assert.throws(()=>parseTripInput({...input,[key]:0}),new RegExp(message));
 assert.equal(parseTripInput({...input,contractId:'1',participantIds:['5']}).contractId,1);
 assert.throws(()=>parseTripInput({...input,structureIds:['10abc']}),/сооружения/);
 assert.throws(()=>parseTripInput({...input,participantIds:[true]}),/участники/);
 assert.throws(()=>parseTripInput({...input,participantIds:[5,'5']}),/Повторяющиеся/);
});
test('Одна работа 301 на сооружение, даты, повторное сохранение без дублей',async()=>{
 const {tx,rows}=db();await syncTripStructureWorks(tx,7,input,4,null);assert.equal(rows.length,2);assert(rows.every(w=>w.tripId===7&&w.workId===301&&w.status==='planned'));assert.equal(rows[0].contractStructureId,100);assert.equal(rows[0].planStart.toISOString().slice(0,10),input.start);assert.equal(rows[0].planHours,undefined);
 await syncTripStructureWorks(tx,7,input,4,{contractId:1,start:new Date(input.start),finish:new Date(input.finish)});assert.equal(rows.length,2);assert.equal(rows[0].version,1);
});
test('Изменение дат, исключение и возвращение сооружения сохраняют ID работы',async()=>{
 const {tx,rows}=db();await syncTripStructureWorks(tx,7,input,4,null);const before={contractId:1,start:new Date(input.start),finish:new Date(input.finish)};
 const next={...input,structureIds:[10],finish:'2026-11-21'};await syncTripStructureWorks(tx,7,next,4,before);assert(rows[1].deletedAt);assert.equal(rows[0].planFinish.toISOString().slice(0,10),next.finish);
 await syncTripStructureWorks(tx,7,{...next,structureIds:[10,11]},4,{...before,finish:new Date(next.finish)});assert.equal(rows.length,2);assert.equal(rows[1].deletedAt,null);assert.equal(rows[1].id,2);assert.equal(rows[1].planFinish.toISOString().slice(0,10),next.finish);
});
test('Несвязанные/неоднозначные сооружения и отсутствующий каталог не записываются',async()=>{
 const d=db();await assert.rejects(syncTripStructureWorks(d.tx,7,{...input,contractId:2},4,null),/ровно одна/);assert.equal(d.rows.length,0);d.links.push({id:102,structureId:10});await assert.rejects(syncTripStructureWorks(d.tx,7,input,4,null),/ровно одна/);d.links.pop();d.setCatalog(null);await assert.rejects(syncTripStructureWorks(d.tx,7,input,4,null),/301/);assert.equal(d.rows.length,0);
});
test('Выполненные работы и отдельно изменённые даты не перезаписываются',async()=>{
 const d=db();await syncTripStructureWorks(d.tx,7,input,4,null);d.rows[0].factHours='1';const before={contractId:1,start:new Date(input.start),finish:new Date(input.finish)};
 await assert.rejects(syncTripStructureWorks(d.tx,7,{...input,finish:'2026-11-21'},4,before),/уже выполняется/);d.rows[0].factHours=null;d.rows[0].planFinish=new Date('2026-11-19');await assert.rejects(syncTripStructureWorks(d.tx,7,{...input,finish:'2026-11-21'},4,before),/изменены отдельно/);
});
test('Без сооружений не создаёт работ',async()=>{const d=db();await syncTripStructureWorks(d.tx,7,{...input,noStructures:true,structureIds:[]},4,null);assert.equal(d.rows.length,0);});
