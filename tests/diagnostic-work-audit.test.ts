import {test} from 'node:test';
import assert from 'node:assert/strict';
import {auditContractWork,type WorkExpectation,type WorkSnapshot} from '../scripts/lib/diagnostic-work-audit';
import {legacyColumns,type LegacyContractWork} from '../scripts/lib/legacy-contract-work-sql';
import {prepareWorkRows} from '../scripts/lib/legacy-contract-work';
const raw={...Object.fromEntries(legacyColumns.map(k=>[k,''])),id:'42',kontragent:'Заказчик',number_dog:'Д-1',date_dog:'2020-01-01',work_id:'105',work_name:'Договор',work_plan_length:'1.00',work_plan_start:'2020-01-01'} as LegacyContractWork;
const ready=prepareWorkRows([raw]).ready[0]!;
const expected:WorkExpectation={id:10,legacyId:42,contractId:1,workId:2,sourceHash:ready.sourceHash,contractKey:ready.contractKey,data:ready.data};
const actual:WorkSnapshot={...expected,rawData:ready.raw,deletedAt:null,parentDeleted:false,data:{...ready.data,planHours:{toString:()=> '1'},planStart:new Date('2020-01-01')}};
test('audit compares live fields even when sourceHash and rawData are unchanged',()=>{
 assert.equal(auditContractWork(expected,actual).status,'EXACT');
 assert.equal(auditContractWork({...expected,data:{...expected.data,planHours:'01.000'}},actual).status,'EXACT');
 const changed=auditContractWork(expected,{...actual,data:{...actual.data,planHours:'2'}});
 assert.equal(changed.status,'CHANGED');assert.deepEqual(changed.differences,['planHours']);
 assert.equal(auditContractWork(expected,{...actual,rawData:{}}).status,'CHANGED');
});
test('audit distinguishes missing, deleted and changed parent/identity records',()=>{
 assert.equal(auditContractWork(expected,undefined).status,'MISSING');
 assert.equal(auditContractWork(expected,{...actual,deletedAt:new Date()}).status,'DELETED');
 assert.deepEqual(auditContractWork(expected,{...actual,id:11,parentDeleted:true}).differences,['id','deletedContractOrCatalogWork']);
});
