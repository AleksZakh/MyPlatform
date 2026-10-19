import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,rm,readdir,writeFile } from 'node:fs/promises';
import os from 'node:os';import path from 'node:path';import sharp from 'sharp';
import { handleFileUpload } from '../../server/utils/fileUploadHandler';
import { LAB_DOCUMENT_ACCEPT,documentSelectionError } from '../../shared/utils/document-selection';
import { formatWorkDate,timeBucket } from '../../shared/utils/work-board';
test('Dates display as dd.mm.yyyy while ISO comparisons remain unchanged',()=>{
 assert.equal(formatWorkDate('2026-10-20T00:00:00.000Z'),'20.10.2026');assert.equal(formatWorkDate('2026-01-02'),'02.01.2026');assert.equal(formatWorkDate(null),'');assert.equal(formatWorkDate('broken'),'');
 assert.equal(timeBucket({status:'TODO',plannedDate:'2026-10-20',dueDate:'2026-10-21'},'2026-10-19'),'tomorrow');
});
test('Picker/drop share extension rules, reject multiple files and keep JPEG MIME optional for JFIF',()=>{
 for(const type of ['','image/jpeg','application/octet-stream'])assert.equal(documentSelectionError([{name:'Документ.JFIF',type,size:42}],LAB_DOCUMENT_ACCEPT),null);
 assert.match(documentSelectionError([{name:'x.exe',type:'image/jpeg',size:42}],LAB_DOCUMENT_ACCEPT)!,/формат/);
 assert.match(documentSelectionError([{name:'x.pdf',type:'',size:0}],LAB_DOCUMENT_ACCEPT)!,/пуст/);
 assert.match(documentSelectionError([{name:'a.pdf',type:'',size:1},{name:'b.pdf',type:'',size:1}],LAB_DOCUMENT_ACCEPT)!,/один файл/);
});
test('Real JFIF/JPEG bytes upload for each lab field, normalize extension without conversion, reject fake JFIF and clean partial writes',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'space-lab-upload-test-'));
 try{
 const bytes=await sharp({create:{width:2,height:3,channels:3,background:'white'}}).jpeg().toBuffer();
 const fields=['samplingDocumentFile','qualityDocumentFile','protocolDocumentFile'];
 const options={baseUploadDir:dir,fileFields:fields,storageFolder:{objectName:'Объект',locationName:'Место',samplingDate:new Date('2026-10-19T00:00:00Z')}};
 const files=fields.map(name=>({name,filename:'sample.JFIF',type:'application/octet-stream',data:bytes}));
 const first=await handleFileUpload(files,options);assert.equal(first.createdFilePaths.length,3);
 for(const name of fields){assert.match(first.fileDbPaths[name]!,/^lab\/Объект\/Место\/2026-10-19\/.+\.jpg$/);assert.deepEqual(await readFile(path.join(dir,first.fileDbPaths[name]!)),bytes);}
 const second=await handleFileUpload([files[0]],{...options,oldFilePaths:{samplingDocumentFile:first.fileDbPaths[fields[0]!]}});assert.notEqual(second.fileDbPaths[fields[0]!],first.fileDbPaths[fields[0]!]);assert.deepEqual(await readFile(first.createdFilePaths[0]!),bytes);
 const prior=(await readdir(first.targetDir)).sort();
 await assert.rejects(handleFileUpload([files[0],{name:fields[1],filename:'fake.jfif',data:Buffer.from('not a jpeg')}],options),(e:any)=>e.statusCode===415);
 assert.deepEqual((await readdir(first.targetDir)).sort(),prior);
 const pdf=await handleFileUpload([{name:fields[2],filename:'protocol.pdf',data:Buffer.from('%PDF-1.7 test')}],options);assert.match(pdf.fileDbPaths[fields[2]!]!,/\.pdf$/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
