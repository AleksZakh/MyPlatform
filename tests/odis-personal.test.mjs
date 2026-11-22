import test from 'node:test';
import assert from 'node:assert/strict';
import { readLegacyRows } from '../scripts/lib/odis-stream-sql.ts';
import { columns, prepare, reconcile } from '../scripts/lib/odis-personal.mjs';

const sample={id:'1',work_type:'dog_works',work_name:'АИС ИССО-Н. Внесение данных',work_id:'402',
  contract_date:'2025-05-13',contract_number:'ДСиР-2025-478',contragent:'ГК "Автодор"',user_fio:'Комов С.Н.',
  work_plan_start:'2026-11-16',work_plan_finish:'2026-11-20',work_plan_length:'2.00',work_status:'scheduled'};
const row=(overrides={})=>prepare({...Object.fromEntries(columns.map(c=>[c,''])),...sample,...overrides});
const base=row(), t=(d={},extra={})=>({id:55,d:{...base.d,...d},...extra});
const action=(r,targets)=>reconcile([r],targets)[0].action;

test('Полное совпадение, изменение и повтор после записи',()=>{
  assert.equal(action(base,[]),'create');
  assert.equal(action(base,[t()]),'skip');
  const r=row({work_note:'Уточнено',work_plan_length:'3'});
  const found=reconcile([r],[t()])[0];
  assert.equal(found.action,'update');
  assert.deepEqual(found.diff,{note:'Уточнено',planHours:'3'});
  assert.equal(action(r,[t(found.diff)]),'skip');
});
test('Независимые недели одного исполнителя и пересекающиеся сроки',()=>{
  assert.equal(action(row({work_plan_start:'2026-11-23',work_plan_finish:'2026-11-27'}),[t()]),'create');
  assert.equal(action(row({work_plan_start:'2026-11-15',work_plan_finish:'2026-11-18'}),[t()]),'review');
});
test('Тип договора при заполненном ИССО; отсутствие факта не стирает данные',()=>{
  assert.equal(row({building:'11501620'}).kind,'contract');
  assert.equal(action(base,[t({factHours:'4',note:'Из Space'})]),'skip');
  assert.throws(()=>row({work_type:'build_works',building:'--'}));
  assert.throws(()=>row({work_fact_start:'2026-02-30'}));
});
test('Конфликт происхождения, неоднозначность, удаление и разные исполнители',()=>{
  assert.equal(action({...base,bound:99},[t()]),'review');
  assert.equal(action({...base,bound:55},[t({planExecutor:'Иванов И.И.'})]),'review');
  assert.equal(action(base,[t({}, {deleted:true})]),'review');
  assert.equal(action(base,[t(),t({},{id:56})]),'review');
  assert.equal(action(row({user_fio:'Петров П.П.'}),[t()]),'create');
});
test('Точные дубли в файле и конкурирующие новые строки',()=>{
  assert.deepEqual(reconcile([base,row({id:'9'})],[]).map(a=>a.action),['create','alias']);
  assert.deepEqual(reconcile([base,row({id:'9',work_note:'Уточнить'})],[]).map(a=>a.action),['review','review']);
});
test('Одна заготовка не присваивается двум разным неделям',()=>{
  const blank=t({planStart:null,planFinish:null,planExecutor:''});
  const second=row({id:'2',work_plan_start:'2026-11-23',work_plan_finish:'2026-11-27'});
  assert.deepEqual(reconcile([base,second],[blank]).map(x=>x.action),['review','review']);
});
if(process.env.ODIS_SAMPLE)test('Реальный образец phpMyAdmin, 10 назначений',async()=>{
  const all=[];
  for await(const r of readLegacyRows(process.env.ODIS_SAMPLE,'odis_user_works',columns))all.push(prepare(r));
  assert.equal(all.length,10);assert.equal(all.filter(x=>x.kind==='structure').length,8);
  assert.equal(all[3].kind,'contract');
  assert.equal(all[8].oldId,1616);assert.equal(all[8].d.factHours,'3');
  for(const r of all){
    assert.equal(action(r,[]),'create');
    assert.equal(action(r,[{id:999,d:r.d}]),'skip');
  }
});
