import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, writeFile, readFile, access, rm, symlink, readdir } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const temp = await mkdtemp(path.join(os.tmpdir(), 'space-storage-'))
process.env.LAB_FILES_ROOT = path.join(temp,'files')
process.env.FILE_OPERATIONS_ROOT = path.join(temp,'journal')
await mkdir(process.env.LAB_FILES_ROOT)
const { prisma } = await import('../server/utils/prisma')
const { executeChanges, recoverStorageOperations, withStorageLock } = await import('../server/services/storage/operations')
const { checkedStoragePath, normalizeStoragePath } = await import('../server/services/storage/paths')
const root = process.env.LAB_FILES_ROOT
let qualityPath: string | null = null
let currentPath: string | null = 'old.pdf', markers = new Set<string>(), txMode = 'normal', readsFail = false
const ref: any = { model:'samplingTest',entity:'SamplingTest',id:1,field:'samplingDocumentPath',path:'old.pdf',type:'Акт',number:'1',date:null,samplingId:1,object:'',location:'',deleted:false }
const db = prisma as any
for (const model of ['receiptMaterial','testProtocol','aEng','fileAttachment']) db[model].findMany = async () => []
db.receiptMaterial.findMany = async () => qualityPath ? [{id:2,qualityDocumentPath:qualityPath,qualityDocumentNumber:'2',qualityDocumentDate:new Date('2025-01-01'),samplingTest:null}] : []
db.receiptMaterial.updateMany = async ({where,data}: any) => { if(qualityPath!==where.qualityDocumentPath)return {count:0};qualityPath=data.qualityDocumentPath;return {count:1} }
db.samplingTest.findMany = async () => currentPath ? [{id:1,samplingDocumentPath:currentPath,samplingActNumber:'1',samplingDate:new Date('2025-01-01'),testLocation:{name:'L',testObject:{name:'O'}}}] : []
db.samplingTest.updateMany = async ({where,data}: any) => { if (currentPath !== where.samplingDocumentPath) return {count:0}; currentPath = data.samplingDocumentPath; return {count:1} }
db.auditLog.create = async () => ({})
db.fileStorageOperation.create = async ({data}: any) => { markers.add(data.id); return data }
db.fileStorageOperation.findUnique = async ({where}: any) => { if(readsFail)throw new Error('DB offline');return markers.has(where.id)?{id:where.id}:null }
db.$transaction = async (callback: any) => {
  const original=currentPath, originalQuality=qualityPath, saved=new Set(markers)
  if(txMode==='rollback')throw new Error('transaction rejected')
  try { const result=await callback(db); if(txMode==='uncertain'){ readsFail=true; throw new Error('transport lost') } return result }
  catch(error){ if(txMode!=='uncertain'){currentPath=original;qualityPath=originalQuality;markers=saved}throw error }
}
beforeEach(async()=>{await rm(root,{recursive:true,force:true});await mkdir(root);await rm(process.env.FILE_OPERATIONS_ROOT!,{recursive:true,force:true});await writeFile(path.join(root,'old.pdf'),'original');currentPath='old.pdf';qualityPath=null;markers=new Set();txMode='normal';readsFail=false})
after(async()=>{await prisma.$disconnect();await rm(temp,{recursive:true,force:true})})
const exists=async(p:string)=>access(path.join(root,p)).then(()=>true,()=>false)
test('Reject traversal, absolute paths and symlinked parents',async()=>{for(const p of ['../x','a/../x','/etc/passwd','a\\b','.hidden/x'])assert.throws(()=>normalizeStoragePath(p));await symlink(temp,path.join(root,'escape'));await assert.rejects(checkedStoragePath('escape/x',true))})
test('Move updates DB, preserves backup and removes old file after commit',async()=>{await withStorageLock(()=>executeChanges(null,'move',[{source:'old.pdf',target:'new.pdf',refs:[ref]}]));assert.equal(currentPath,'new.pdf');assert.equal(await exists('old.pdf'),false);assert.equal(await readFile(path.join(root,'new.pdf'),'utf8'),'original');const dirs=await readdir(process.env.FILE_OPERATIONS_ROOT!);assert.equal(await readFile(path.join(process.env.FILE_OPERATIONS_ROOT!,dirs[0]!, '0.backup'),'utf8'),'original')})
test('Transaction failure restores original state and deletes only newly created file',async()=>{txMode='rollback';await assert.rejects(withStorageLock(()=>executeChanges(null,'move',[{source:'old.pdf',target:'new.pdf',refs:[ref]}])));assert.equal(currentPath,'old.pdf');assert.equal(await exists('old.pdf'),true);assert.equal(await exists('new.pdf'),false)})
test('Destination collision never deletes an existing unrelated file',async()=>{await writeFile(path.join(root,'new.pdf'),'other');await assert.rejects(withStorageLock(()=>executeChanges(null,'move',[{source:'old.pdf',target:'new.pdf',refs:[ref]}])));assert.equal(await readFile(path.join(root,'new.pdf'),'utf8'),'other');assert.equal(currentPath,'old.pdf')})
test('Concurrent reference change aborts operation without losing source',async()=>{currentPath='another.pdf';await assert.rejects(withStorageLock(()=>executeChanges(null,'move',[{source:'old.pdf',target:'new.pdf',refs:[ref]}])));assert.equal(await exists('old.pdf'),true);assert.equal(await exists('new.pdf'),false)})
test('Ambiguous commit retains files; recovery follows DB commit marker',async()=>{txMode='uncertain';await assert.rejects(withStorageLock(()=>executeChanges(null,'move',[{source:'old.pdf',target:'new.pdf',refs:[ref]}])));assert.equal(await exists('old.pdf'),true);assert.equal(await exists('new.pdf'),true);readsFail=false;txMode='normal';await withStorageLock(recoverStorageOperations);assert.equal(currentPath,'new.pdf');assert.equal(await exists('old.pdf'),false);assert.equal(await exists('new.pdf'),true)})
test('Deletion clears DB link and keeps recoverable backup',async()=>{await withStorageLock(()=>executeChanges(null,'delete',[{source:'old.pdf',target:null,refs:[ref]}]));assert.equal(currentPath,null);assert.equal(await exists('old.pdf'),false)})

test('Every DB reference to a shared file is updated together',async()=>{qualityPath='old.pdf';const second={...ref,model:'receiptMaterial',entity:'ReceiptMaterial',id:2,field:'qualityDocumentPath'};await withStorageLock(()=>executeChanges(null,'move',[{source:'old.pdf',target:'new.pdf',refs:[ref,second]}]));assert.equal(currentPath,'new.pdf');assert.equal(qualityPath,'new.pdf');assert.equal(await exists('old.pdf'),false)})
