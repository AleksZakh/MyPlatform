import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseStructuresSql,prepareStructures,contractsFromText,executorsFromText,canonicalDate,legacyColumns} from '../scripts/lib/legacy-structures';
const rows=parseStructuresSql(readFileSync(new URL('./fixtures/dis-build-sample.sql',import.meta.url),'utf8'));
test('All ten rows survive parsing; contract and executor duplicates are removed',()=>{
  const p=prepareStructures(rows);assert.equal(p.total,10);assert.equal(p.groups.length,10);assert.deepEqual(p.conflicts,[]);
  assert.equal(p.contractDuplicates,60);assert.equal(p.executorDuplicates,23);
  assert.equal(p.groups.reduce((n,g)=>n+g.contracts.length,0),9);
  assert.equal(p.groups.reduce((n,g)=>n+g.executors.length,0),4);
  assert.equal(p.groups[0]!.fields.lengthMetres,'154.98');assert.equal(p.groups[0]!.fields.locationMetres,22100);
  assert.equal(p.groups[0]!.rows[0]!.raw.id_dog,rows[0]!.id_dog);
});
test('One code merges identical source rows but rejects conflicting properties',()=>{
  const p=prepareStructures([...rows,{...rows[0]!,id:'11'}]);assert.equal(p.groups.length,10);assert.equal(p.groups[0]!.rows.length,2);assert.deepEqual(p.conflicts,[]);
  assert.equal(prepareStructures([...rows,{...rows[0]!,id:'11',road_name:'Другая дорога'}]).conflicts.length,1);
  assert.equal(prepareStructures([...rows,rows[0]!]).conflicts.length,1);
});
test('Empty delimiters, date formats, quote styles and executor casing are handled',()=>{
  assert.equal(contractsFromText('||ГК «Автодор» | 1 | 2022-12-30 || ГК "Автодор"|1|30.12.2022||').contracts.length,1);
  assert.equal(executorsFromText('||ОДИС||||одис||ООО «А»||ООО "А"').names.length,2);
  assert.equal(canonicalDate('2022-02-30'),null);assert.equal(canonicalDate('29.02.2024'),'2024-02-29');
  assert.equal(contractsFromText('Неизвестный формат').unparsed.length,1);
});
test('Text identifiers and unparseable numerical values are preserved',()=>{
  const p=prepareStructures([{...rows[0]!,cod_isso:'000123',const_length:'нет сведений',location:'участок №1'}]);
  assert.equal(p.groups[0]!.code,'000123');assert.equal(p.groups[0]!.fields.lengthMetres,null);
  assert.equal(p.groups[0]!.fields.lengthRaw,'нет сведений');assert.equal(p.groups[0]!.fields.location,'участок №1');assert.equal(p.warnings.length,2);
});
test('Escaped SQL literals cannot become commands; NULL and delimiters survive',()=>{
  const row={...rows[0]!,note:"O'Brien; INSERT \\ строка\nвторая строка",dop_info:null};
  const literal=(s:string|null)=>s===null?'NULL':"'"+s.replaceAll('\\','\\\\').replaceAll("'","\\'").replaceAll('\n','\\n')+"'";
  const sql='INSERT INTO `dis_build` ('+legacyColumns.map(c=>'`'+c+'`').join(',')+') VALUES ('+legacyColumns.map(c=>literal(row[c])).join(',')+');;';
  assert.deepEqual(parseStructuresSql(sql)[0],row);assert.throws(()=>parseStructuresSql(sql.slice(0,-4)));
});

test('Legacy integer IDs, including zero, are preserved independently of new IDs',()=>{
  for(const id of ['0','-1','2147483647']) {
    const p=prepareStructures([{...rows[0]!,id}]);assert.deepEqual(p.conflicts,[]);assert.equal(p.groups[0]!.rows[0]!.legacyId,Number(id));
  }
});
