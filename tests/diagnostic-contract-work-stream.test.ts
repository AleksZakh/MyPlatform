import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {sqlStatements,readContractWorkRows,fileSha256} from '../scripts/lib/legacy-contract-work-stream';
import {parseContractWorksSql,legacyColumns} from '../scripts/lib/legacy-contract-work-sql';
import {prepareWorkRows,matchesContractWorkSource} from '../scripts/lib/legacy-contract-work';
import {createHash} from 'node:crypto';

async function* chunks(s:string,size:number){const b=Buffer.from(s);for(let i=0;i<b.length;i+=size)yield b.subarray(i,i+size);}
const quoted=(s:string)=>"'"+s.replace(/\\/g,'\\\\').replace(/'/g,"\\'")+"'";
const row={...Object.fromEntries(legacyColumns.map(c=>[c,''])),id:'42',kontragent:'ГК «А»',number_dog:'Д-1',date_dog:'2020-01-01',work_id:'130',work_name:'Работа',work_status:'scheduled',history:"Строка; -- # /* */ ' \" ` \\ \n Конец"};
const insert='INSERT INTO `dis_dog_works` ('+legacyColumns.map(c=>'`'+c+'`').join(',')+') VALUES ('+legacyColumns.map(c=>quoted(row[c]!)).join(',')+');';

test('stream boundaries preserve Unicode, quotes, escapes, comments and every history byte',async()=>{
 const input='-- comment ;\n/* comment ; */\nSET SQL_MODE="";\n'+insert+'\n# end';
 for(const size of [1,2,3,4,7,16,64,1024]){
  const statements=[];for await(const s of sqlStatements(chunks(input,size)))statements.push(s);
  assert.equal(statements.length,2,'chunk size '+size);
  assert.deepEqual(parseContractWorksSql(statements[1]!),[row]);
 }
});
test('doubled SQL quotes and backticks decode exactly',()=>{
 const sql=insert.replace(quoted(row.history),"'a''b\\nc\\%d\\_e'");
 assert.equal(parseContractWorksSql(sql)[0]!.history,"a'b\nc\\%d\\_e");
});
test('truncated SQL, broken UTF-8 and oversized statements fail closed',async()=>{
 for(const s of ["INSERT INTO t VALUES ('x",'/* unfinished',"INSERT INTO t VALUES (1)"]){
  await assert.rejects(async()=>{for await(const _ of sqlStatements(chunks(s,1))){};});
 }
 await assert.rejects(async()=>{for await(const _ of sqlStatements(chunks(insert,16),10)){};});
 async function* invalid(){yield new Uint8Array([0xc3,0x28]);}
 await assert.rejects(async()=>{for await(const _ of sqlStatements(invalid())){};});
});
test('file reader validates SQL mode, empty dump, hashes and preserved raw fields',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'dcw-test-'));const file=join(dir,'test.sql');
 try{
  await writeFile(file,insert);const rows=[];for await(const r of readContractWorkRows(file))rows.push(r);
  assert.deepEqual(rows,[row]);assert.equal(await fileSha256(file),createHash('sha256').update(insert).digest('hex'));
  const r=prepareWorkRows(rows).ready[0]!;
  assert.equal(Object.hasOwn(r.raw,'history'),false);assert.equal(r.data.status,'scheduled');assert.equal(r.data.planHours,null);
  await writeFile(file,'SET SQL_MODE="NO_BACKSLASH_ESCAPES";'+insert);
  await assert.rejects(async()=>{for await(const _ of readContractWorkRows(file)){};},/NO_BACKSLASH/);
  await writeFile(file,'-- empty\n');await assert.rejects(async()=>{for await(const _ of readContractWorkRows(file)){};},/нет INSERT/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('large history parses but is excluded from rawData and row checksum',async()=>{
 const history='повтор;'.repeat(100000);const sql=insert.replace(quoted(row.history),quoted(history));
 let last='';for await(const s of sqlStatements(chunks(sql,4096)))last=s;
 const rows=parseContractWorksSql(last);assert.equal(rows[0]!.history,history);
 const prepared=prepareWorkRows(rows).ready[0]!;
 const small=prepareWorkRows(parseContractWorksSql(insert)).ready[0]!;
 assert.equal(Object.hasOwn(prepared.raw,'history'),false);
 assert.equal(prepared.sourceHash,small.sourceHash);
 assert.equal(JSON.stringify(prepared.raw),JSON.stringify(small.raw));
});
test('ignored history does not invalidate rows; business changes remain detectable',()=>{
 const original=parseContractWorksSql(insert)[0]!;
 const ready=prepareWorkRows([original]).ready[0]!;
 assert.equal(prepareWorkRows([{...original,history:'\0'}]).ready[0]!.sourceHash,ready.sourceHash);
 assert.notEqual(prepareWorkRows([{...original,work_name:'Другая работа'}]).ready[0]!.sourceHash,ready.sourceHash);
 assert.equal(prepareWorkRows([{...original,work_name:'\0'}]).deferred.length,1);
 const jsonb=Object.fromEntries(Object.entries({...original,history:'старое содержимое'}).reverse());
 assert.equal(matchesContractWorkSource(jsonb,ready.sourceHash),true);
 assert.equal(matchesContractWorkSource({...jsonb,work_name:'Изменено'},ready.sourceHash),false);
 assert.equal(matchesContractWorkSource({},ready.sourceHash),false);
});
