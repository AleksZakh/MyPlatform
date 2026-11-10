import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {contractDetailCounts,contractStructureWorks} from '../server/services/diagnostic/contract-details';

// Query/handler tests with a Prisma double, not PostgreSQL integration.
test('counts exclude deleted records and return 404 for missing contract',async()=>{
 let query:any;
 const db:any={diagnosticContract:{findFirst:async(q:any)=>{query=q;return {_count:{contractWorks:403,structures:10}}}}};
 assert.deepEqual(await contractDetailCounts(db,12),{works:403,structures:10});
 assert.deepEqual(query.where,{id:12,deletedAt:null});
 assert.deepEqual(query.select._count.select.contractWorks.where,{deletedAt:null});
 assert.deepEqual(query.select._count.select.structures.where,{deletedAt:null,structure:{deletedAt:null}});
 db.diagnosticContract.findFirst=async()=>null;
 await assert.rejects(()=>contractDetailCounts(db,12),(e:any)=>e.statusCode===404);
});
test('work query scopes by contract/link and preserves snapshots and decimals',async()=>{
 let query:any;
 const db:any={diagnosticContractStructure:{findFirst:async(q:any)=>{query=q;return {id:5001,structureId:101,workAssignments:[{id:7,workCodeSnapshot:'305',workNameSnapshot:'Историческое название',criteriaSnapshot:'Критерий',hours:{toString:()=> '0.0001'},note:'Примечание'}]}}}};
 const response=await contractStructureWorks(db,12,5001);
 assert.deepEqual(query.where,{id:5001,contractId:12,deletedAt:null,contract:{deletedAt:null},structure:{deletedAt:null}});
 assert.deepEqual(query.select.workAssignments.where,{deletedAt:null});
 assert.deepEqual(response,{linkId:5001,structureId:101,works:[{id:7,code:'305',name:'Историческое название',criteria:'Критерий',hours:'0.0001',note:'Примечание'}]});
 assert.equal('planHours' in response.works[0]!,false);
 db.diagnosticContractStructure.findFirst=async()=>null;
 await assert.rejects(()=>contractStructureWorks(db,99,5001),(e:any)=>e.statusCode===404);
});
test('both endpoints require VIEW before reads and reject malformed IDs',async()=>{
 const dir=await mkdtemp(resolve('tests/.contract-detail-test-'));
 const globals=globalThis as any;
 const oldAccess=globals.qaContractAccess,oldDb=globals.qaContractDb;
 let reads=0,denied=true;
 globals.qaContractAccess=async(_e:any,action:string)=>{assert.equal(action,'VIEW');if(denied)throw Object.assign(Error('Denied'),{statusCode:403});};
 globals.qaContractDb={diagnosticContract:{findFirst:async()=>{reads++;return {_count:{contractWorks:0,structures:0}}}},diagnosticContractStructure:{findFirst:async()=>{reads++;return null}}};
 try{
  const paths=['server/api/diagnostic/contracts/[id]/summary.get.ts','server/api/diagnostic/contracts/[id]/structures/[linkId]/works.get.ts'];
  for(const [i,file] of paths.entries()){
   const result=await build({entryPoints:[file],bundle:true,write:false,platform:'node',format:'esm',packages:'external',plugins:[{name:'mocks',setup(b){
    b.onResolve({filter:/services\/diagnostic\/access$/},()=>({path:'access',namespace:'mock'}));
    b.onResolve({filter:/utils\/prisma$/},()=>({path:'db',namespace:'mock'}));
    b.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path==='access'?'export const contractAccess=(...args)=>globalThis.qaContractAccess(...args);':'export const prisma=globalThis.qaContractDb;',loader:'js'}));
   }}]});
   const output=join(dir,String(i)+'.mjs');await writeFile(output,result.outputFiles[0]!.text);
   const handler=(await import(pathToFileURL(output).href)).default;
   denied=true;const before=reads;
   await assert.rejects(()=>handler({context:{params:{id:'12',linkId:'5001'}}}),(e:any)=>e.statusCode===403);assert.equal(reads,before);
   denied=false;
   await assert.rejects(()=>handler({context:{params:{id:'bad',linkId:'5001'}}}),(e:any)=>e.statusCode===400);assert.equal(reads,before);
   if(i===0)assert.deepEqual(await handler({context:{params:{id:'12'}}}),{works:0,structures:0});
   else await assert.rejects(()=>handler({context:{params:{id:'12',linkId:'5001'}}}),(e:any)=>e.statusCode===404);
  }
 }finally{globals.qaContractAccess=oldAccess;globals.qaContractDb=oldDb;await rm(dir,{recursive:true,force:true});}
});
