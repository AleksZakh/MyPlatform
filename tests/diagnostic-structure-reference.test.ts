import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyColumns,type LegacyStructure} from '../scripts/lib/legacy-structures';
import {parseReferenceCsv,reconcileStructures,fieldChanges} from '../scripts/lib/structure-reference';
import {planGroup} from '../scripts/lib/structure-reference-db';
const row=(id:string,code:string,patch:Partial<LegacyStructure>={}):LegacyStructure=>({...Object.fromEntries(legacyColumns.map(k=>[k,''])),id,cod_isso:code,...patch} as LegacyStructure);
test('master overrides its fields; highest legacy ID supplies other fields; histories from all duplicates survive',()=>{
 const master=parseReferenceCsv('Код ИССО;Сооружение;Эксплуатирующая организация\n001;Мост;Новое');
 const result=reconcileStructures([row('2','001',{note:'first',id_dog:'A|1|2020-01-01',executor:'A'}),row('10','001',{note:'last',id_dog:'A|2|2020-01-01',executor:'B'})],master);
 const g=result.groups[0]!;assert.equal(g.representativeLegacyId,10);assert.equal(g.fields.note,'last');assert.equal(g.fields.operator,'Новое');assert.equal(g.contracts.length,2);assert.equal(g.executors.length,2);assert.equal(g.rows.length,2);
 const plan=planGroup(g,{structure:{id:1,code:'001',version:1,deletedAt:null,note:'DB'},archived:[],contractKeys:[],executorKeys:[]},true);
 assert(!('note'in plan.changes));
});
test('duplicate reference codes, absent codes and empty legacy codes do not produce records',()=>{
 const result=reconcileStructures([row('1','001'),row('2','002'),row('3','')],parseReferenceCsv('Код ИССО;Сооружение\n001;A\n001;B'));
 assert.equal(result.groups.length,0);assert.equal(result.summary.deferredRows,3);
});
test('empty present cells clear values; absent columns preserve them; codes remain strings',()=>{
 const m=parseReferenceCsv('\uFEFFКод ИССО;Сооружение;\r\n0001;;\r\n');assert.equal(m.rows[0]!.code,'0001');assert.equal(m.rows[0]!.fields.structureName,'');assert(!('operator'in m.rows[0]!.fields));
 assert.deepEqual(fieldChanges({structureName:'A',note:'B'},m.rows[0]!.fields),{structureName:{before:'A',after:''}});
});
test('parse quoted semicolons/multiline values; reject malformed CSV',()=>{
 assert.equal(parseReferenceCsv('Код ИССО;Сооружение\n1;"A;\nB"').rows[0]!.fields.structureName,'A;\nB');
 for(const s of ['Код ИССО;Сооружение\n1;"A','Код ИССО;Сооружение\n1;A;B','Код ИССО;Код ИССО\n1;2'])assert.throws(()=>parseReferenceCsv(s));
});

test('condition assessment also corrects the previously imported expert_rating destination',()=>{
 const m=parseReferenceCsv('Код ИССО;Оценка ТС\n001;хорошее');
 assert.equal(m.rows[0]!.fields.conditionRating,'хорошее');assert.equal(m.rows[0]!.fields.expertOpinion,'хорошее');
});
