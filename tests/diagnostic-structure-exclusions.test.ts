import {test} from 'node:test';
import assert from 'node:assert/strict';
import {legacyColumns,type LegacyStructure} from '../scripts/lib/legacy-structures';
import {partitionStructureRows,exclusionHtml} from '../scripts/lib/structure-import-exclusions';
const row=(id:string,code:string|null,patch:Partial<LegacyStructure>={}):LegacyStructure=>({...Object.fromEntries(legacyColumns.map(k=>[k,''])),id,cod_isso:code,...patch} as LegacyStructure);
test('exclude all occurrences, including identical passports and codes after normalization',()=>{
  const rows=[row('1','001'),row('2','001'),row('3','Ab'),row('4',' AB ',{note:'changed'}),row('5',''),row('6',null),row('7','007')];
  const result=partitionStructureRows(rows);
  assert.deepEqual(result.included,[rows[6]]);
  assert.deepEqual(result.summary,{sourceRows:7,eligibleRows:1,excludedRows:6,excludedDuplicateCodes:2,excludedDuplicateRows:4,excludedEmptyCodeRows:2});
  assert.equal(result.excluded.flatMap(g=>g.rows).length,6);
});
test('deferred rows preserve all original fields, contracts and executors',()=>{
  const original=row('1','',{id_dog:'customer|number|date||odd text',executor:'A||A',note:'<script>test</script>'});
  const result=partitionStructureRows([original]);
  assert.deepEqual(result.excluded[0]!.rows[0],original);
  const html=exclusionHtml(result.excluded,'source.sql','hash');
  assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));assert(html.includes('customer|number|date||odd text'));
});
test('same legacy ID remains an error, even in excluded rows',()=>{
  assert.throws(()=>partitionStructureRows([row('1',''),row('1','')]),/Повторяется старый ID/);
});
test('three occurrences excluded, leading zero codes distinct, no eligible rows supported',()=>{
  assert.equal(partitionStructureRows([row('1','X'),row('2','X'),row('3','X')]).included.length,0);
  assert.equal(partitionStructureRows([row('1','001'),row('2','1')]).included.length,2);
});
