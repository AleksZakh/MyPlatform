import test from 'node:test';
import assert from 'node:assert/strict';
import sample from '../app/data/diagnostic/structures-preview.json';
import {blankStructureFilters,filterStructures,sortStructures,structureLocationMetres,planStructureImport} from '../shared/utils/diagnostic-structures';
const header=['Код ИССО','Название автодороги','Сооружение','Местоположение, км+м','Длина, м'];
test('The supplied example keeps 38 distinct structures and the source management value',()=>{
  assert.equal(sample.length,38);assert.equal(new Set(sample.map(row=>row.issoCode)).size,38);
  assert.equal(sample.find(row=>row.issoCode==='11401516')?.management,'Краснодарский филиал ГК "Автодор"');
});
test('Combined filters and inclusive metre boundaries',()=>{
  assert.equal(filterStructures(sample,{...blankStructureFilters(),locationFrom:'16+550',locationTo:'16+550'}).length,13);
  assert.equal(filterStructures(sample,{...blankStructureFilters(),search:'11503080 суходол'}).length,1);
  assert.equal(filterStructures(sample,{...blankStructureFilters(),locationFrom:'52',locationTo:'16'}).length,0);
  assert.equal(structureLocationMetres('0+005'),5);assert.equal(structureLocationMetres('1+1000'),null);
});
test('Location sorting is numeric, with missing locations last in either direction',()=>{
  const source=sample[0]!;
  const rows=[{...source,id:'a',location:'10+005'},{...source,id:'b',location:'2+999'},{...source,id:'c',location:''}];
  assert.deepEqual(sortStructures(rows,'location').map(r=>r.id),['b','a','c']);
  assert.deepEqual(sortStructures(rows,'location',true).map(r=>r.id),['a','b','c']);
});
test('Existing and duplicate codes are skipped without overwriting values',()=>{
  const matrix=[header,['11503080','Other road','Мост','1+000','99'],['000123','Road','Труба','2+001','18.489999999999998'],['000123','Road','Труба','3+000','0']];
  const before=JSON.stringify(sample), plan=planStructureImport(matrix,sample,'example.xlsx','Batch note');
  assert.equal(plan.records.length,1);assert.equal(plan.skipped.length,2);assert.equal(plan.errors.length,0);
  assert.equal(plan.records[0]?.issoCode,'000123');assert.equal(plan.records[0]?.lengthMetres,18.49);
  assert.equal(plan.records[0]?.note,'Batch note');assert.equal(JSON.stringify(sample),before);
});
test('Missing headers and invalid rows are reported rather than guessed',()=>{
  assert.throws(()=>planStructureImport([['Название автодороги']],[],'bad.xlsx'),/столбец/);
  const plan=planStructureImport([header,['','Road','Труба','1+000','1'],['1','Road','Труба','bad','1'],['2','Road','Труба','2+000','-1']],[],'bad.xlsx');
  assert.equal(plan.errors.length,3);assert.equal(plan.records.length,0);
});
