import test from 'node:test';
import assert from 'node:assert/strict';
import {columns, prepare, reconcile} from '../scripts/lib/odis-personal.mjs';
import {diagnosticWorkStatus} from '../shared/utils/diagnostic-contract-table.ts';
import {buildCalendar, calendarRows} from '../shared/utils/diagnostic-calendar.ts';
import {parsePlansPeriod, matchesPlansPeriod} from '../shared/utils/diagnostic-plans-period.ts';

const employees=[{id:48,name:'Иликаев Андрей Владимирович'},{id:49,name:'Комов Сергей Николаевич'}];
const raw={...Object.fromEntries(columns.map(k=>[k,''])), id:'210159', old_id:'new',
  work_name:'АИС ИССО-Н. Внесение данных', work_id:'402', contract_date:'2025-05-13',
  contract_number:'ДСиР-2025-478', contragent:'ГК "Автодор"', user_fio:'Иликаев А.В.',
  work_type:'dog_works', building:'123', work_plan_length:'40'};
const monday='2026-11-23', friday='2026-11-27';
const week=parsePlansPeriod({periodMode:'worklist'},'2026-11-22');
const range=parsePlansPeriod({periodMode:'period',from:monday,to:friday});
const all=parsePlansPeriod({periodMode:'all'});
const blank=prepare({...raw,user_fio:'',work_status:'unplanned'}).d;
const slots=[{id:5789,d:blank},{id:5790,d:blank}];
const make=(status,extra={})=>prepare({...raw,work_plan_start:monday,work_plan_finish:friday,work_status:status,...extra});
const statusLabels={scheduled:'planned',performed:'in_progress',completed:'completed',overdue:'overdue'};

for(const [status,label] of Object.entries(statusLabels)) {
  test('Импорт и выборка работ: '+status,()=>{
    for(const work_type of ['dog_works','build_works']){
      const completed=status==='completed';
      const source=make(status,{work_type,work_fact_start:completed?monday:'',work_fact_finish:completed?friday:''});
      const [decision]=reconcile([source],slots);
      assert.equal(decision.action,'create');
      const saved={id:9000,d:decision.r.d,owner:source.id};
      assert.equal(reconcile([{...source,bound:saved.id}],[...slots,saved])[0].action,'skip');
      const work={...saved.d,id:saved.id,code:source.code,kind:source.kind,contractId:162,
        contractNumber:raw.contract_number,structureCode:source.isso,status:diagnosticWorkStatus(saved.d.status).key};
      const {rows}=buildCalendar(null,employees,employees,[work],[]);
      const filtered=calendarRows(rows,{employeeId:48,search:'ИССО',status:label,sort:'planStart',descending:true});
      assert.equal(filtered.length,1);
      assert.equal(rows.length,1);
      assert.equal(filtered[0].planHours,'40');
      for(const period of [week,range,all])assert.ok(matchesPlansPeriod(filtered[0],period));
      const old={...filtered[0],planStart:'2026-10-01',planFinish:'2026-10-02',factStart:null,factFinish:null};
      assert.equal(matchesPlansPeriod(old,week),!completed);
      assert.equal(matchesPlansPeriod(old,range),false);
      assert.equal(matchesPlansPeriod({...old,factFinish:monday},range),true);
      const undated={...old,planStart:null,planFinish:null};
      assert.equal(matchesPlansPeriod(undated,week),!completed);
      assert.equal(matchesPlansPeriod(undated,range),false);
      assert.equal(matchesPlansPeriod(undated,all),true);
      assert.equal(matchesPlansPeriod({...old,planFinish:week.from},week),true);
    }
    assert.equal(diagnosticWorkStatus(' '+status.toUpperCase()+' ').key,label);
  });
}
test('Спорные назначения и записи с историей требуют проверки',()=>{
  const source=make('performed');
  for(const protectedSlot of [{deleted:true},{owner:9},{oldId:9}]){
    assert.equal(reconcile([source],[slots[0],{...slots[1],...protectedSlot}])[0].action,'review');
  }
  assert.equal(reconcile([{...source,bound:99}],slots)[0].action,'review');
  assert.equal(reconcile([source,make('performed',{id:'210160',work_note:'Иное задание'})],slots)[0].action,'review');
  assert.deepEqual(reconcile([source,{...source,id:210161}],slots).map(x=>x.action),['create','alias']);
  const other=make('scheduled',{id:'210142',user_fio:'Комов С.Н.'});
  assert.deepEqual(reconcile([source,other],[slots[0]]).map(x=>x.action),['create','create']);
});
test('Выбранный период проверяет план и факт именно выбранного исполнителя',()=>{
  const d=make('completed').d;
  const work={...d,id:103,code:'402',kind:'contract',contractId:162,contractNumber:raw.contract_number,
    structureCode:'',status:'completed',planStart:'2026-11-10',planFinish:'2026-11-12',
    factExecutor:'Комов С.Н.',factStart:monday,factFinish:friday};
  const {rows}=buildCalendar(null,employees,employees,[work],[]);
  assert.deepEqual(rows.filter(x=>matchesPlansPeriod(x,range)).map(x=>x.employeeId),[49]);
  assert.deepEqual(rows.filter(x=>matchesPlansPeriod(x,all)).map(x=>x.employeeId).sort(),[48,49]);
});
