import test from 'node:test';
import assert from 'node:assert/strict';
import {columns, prepare, reconcile} from '../scripts/lib/odis-personal.mjs';
import {repairWeek, scheduledInWeek, repairDecisions} from '../scripts/lib/odis-planned-repair.mjs';

const source = {id:'210159',user_fio:'Иликаев А.В.',contragent:'ГК "Автодор"',contract_number:'ДСиР-2025-478',
  contract_date:'2025-05-13',work_id:'402',work_type:'dog_works',work_name:'АИС ИССО-Н. Внесение данных',
  work_plan_start:'2026-11-23',work_plan_finish:'2026-11-27',work_plan_length:'40',work_status:'scheduled',old_id:'new'};
const row = (extra={}) => ({...prepare({...Object.fromEntries(columns.map(c=>[c,''])),...source,...extra}),newAssignment:true});
const ilikaev = row(), komov = row({id:'210142',user_fio:'Комов С.Н.',work_plan_length:'2'});
const templates = [5789,5790,5791,5792,5800,5806].map(id => ({id, d:{...ilikaev.d, planExecutor:'',
  planStart:null,planFinish:null,planHours:'2',status:'unplanned'}}));
const decisions = (rows,targets) => repairDecisions(rows,targets).map(x => x.action);

test('210159 и 210142 имеют один шифр и шесть пустых заготовок; назначения раздельны',()=>{
  assert.deepEqual(reconcile([ilikaev,komov],templates,{separateTemplates:false}).map(x=>x.action),['review','review']);
  const fixed=repairDecisions([ilikaev,komov],templates);
  assert.deepEqual(fixed.map(x=>[x.action,x.r.d.planHours]),[['create','40'],['create','2']]);
  assert.ok(fixed.every(x=>!x.t));
});
test('Повтор, удалённая работа, конкурирующие цели и несовпадающие версии',()=>{
  const saved={id:8000,d:ilikaev.d};
  assert.deepEqual(decisions([{...ilikaev,bound:saved.id}],[...templates,saved]),['skip']);
  assert.deepEqual(decisions([ilikaev],[...templates,saved]),['skip']);
  assert.deepEqual(decisions([ilikaev],[...templates,{...saved,deleted:true}]),['review']);
  assert.deepEqual(decisions([ilikaev],[...templates,saved,{...saved,id:8001}]),['review']);
  assert.deepEqual(decisions([ilikaev],[...templates,{...saved,d:{...saved.d,planHours:'2'}}]),['review']);
  assert.deepEqual(decisions([ilikaev],[...templates,{...templates[0],id:9000,owner:52}]),['review']);
});
test('Область восстановления и дубли',()=>{
  assert.deepEqual(decisions([ilikaev],[]),['review']);
  assert.deepEqual(decisions([{...ilikaev,newAssignment:false}],templates),['review']);
  assert.deepEqual(decisions([ilikaev,{...ilikaev,id:8000}],templates),['create','alias']);
  assert.deepEqual(decisions([ilikaev,row({id:'8000',work_note:'Другие данные'})],templates),['review','review']);
});
test('Неделя старой формы включает обе границы',()=>{
  const week=repairWeek('2026-11-23');
  assert.deepEqual(week,{start:'2026-11-23',finish:'2026-11-27'});
  assert.ok(scheduledInWeek(source,week));
  assert.ok(scheduledInWeek({...source,work_plan_start:'2026-11-01',work_plan_finish:week.start},week));
  assert.ok(!scheduledInWeek({...source,work_plan_start:'2026-11-28'},week));
  assert.ok(!scheduledInWeek({...source,work_status:'completed'},week));
  assert.throws(()=>repairWeek('2026-11-24'));
});
