import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseStructureQuery} from '../shared/utils/diagnostic-structure-query';
import {structureValue} from '../shared/utils/diagnostic-structures';
import type {StructureRecord} from '../shared/types/diagnostic-structures';
test('server query accepts multiple filters, preserves leading zeros and exact catalog strings',()=>{
 const q=parseStructureQuery({code:'001',management:[' A ','B','B'],locationFrom:'16',locationTo:'17+500',page:'2',pageSize:'50'});
 assert.equal(q.filters.code,'001');assert.deepEqual(q.filters.management,[' A ','B']);assert.equal(q.page,2);assert.equal(q.pageSize,50);
});
test('reject invalid ranges, sort keys, oversize pages, repeated scalars and excessive search terms',()=>{
 for(const q of [{locationFrom:'272+1083'},{locationFrom:'5',locationTo:'4'},{sortKey:'rawData'},{pageSize:'1000'},{page:['1','2']},{search:'x '.repeat(13)}])assert.throws(()=>parseStructureQuery(q));
});
test('preserve ambiguous source length instead of displaying a missing value',()=>{
 assert.equal(structureValue({lengthRaw:'88,41 (95,94)',lengthMetres:null} as StructureRecord,'lengthMetres'),'88,41 (95,94)');
});
