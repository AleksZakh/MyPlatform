import {createHash,randomUUID} from 'node:crypto';
import {open,unlink,link} from 'node:fs/promises';
import {constants} from 'node:fs';
import path from 'node:path';
import type {PrismaClient} from '@prisma/client';
import {ensureObjectStorage} from './upts-storage';
import {openProjectFile,objectFolderName,uptsStoragePath,ensureUptsFileParent,documentFolderName} from './work/file-storage';
import {checkedStoragePath,storageRoot} from './storage/paths';
async function digest(relative:string){
 const file=await open(await checkedStoragePath(relative),constants.O_RDONLY|constants.O_NOFOLLOW);
 try{const st=await file.stat();if(!st.isFile())throw new Error('Not a regular file');const hash=createHash('sha256');for await(const chunk of file.createReadStream({autoClose:false}))hash.update(chunk);return {size:st.size,sha256:hash.digest('hex')};}finally{await file.close();}
}
/** Copy + SHA-256 verify + DB switch. Originals remain untouched; retries reuse verified copies. */
export async function migrateUptsStorage(db:PrismaClient,apply=false,report:(row:unknown)=>void=()=>{}){
 const result={objects:0,planned:0,migrated:0,verified:0,failed:0};
 const objects=await db.uptsContract.findMany({orderBy:{id:'asc'}});
 for(const c of objects){
  const folder=c.storageFolder||objectFolderName(c.id,c.number||c.name);result.objects++;
  if(apply){try{await ensureObjectStorage(db,c);}catch(e){result.failed++;report({objectId:c.id,error:String(e)});continue;}}
  const files=await db.workProjectFile.findMany({where:{contractId:c.id,scope:'SHARED'},orderBy:{createdAt:'asc'}});
  for(const f of files){
   const target=f.storagePath||uptsStoragePath(folder,f.documentType||'Иное',f.storageKey,f.name);
   if(!apply){result.planned+=Number(!f.storagePath);report({fileId:f.id,objectId:c.id,name:f.name,target,action:f.storagePath?'verify':'copy'});continue;}
   let temporary:string|null=null;
   try{
    if(!f.storagePath){
     const directory=await ensureUptsFileParent(target);
     let exists=false;
     try{const check=await digest(target);if(check.size!==f.size||check.sha256!==f.sha256)throw new Error('Existing destination has different contents');exists=true;}catch(e:any){if(e.code!=='ENOENT')throw e;}
     if(!exists){
      const source=await openProjectFile(f);temporary=path.join(directory,'.transfer-'+randomUUID());
      let output;try{output=await open(temporary,'wx',0o640);const hash=createHash('sha256');let size=0;
       for await(const chunk of source.createReadStream({autoClose:false})){const bytes=Buffer.from(chunk);hash.update(bytes);size+=bytes.length;let pos=0;while(pos<bytes.length)pos+=(await output.write(bytes,pos,bytes.length-pos)).bytesWritten;}
       await output.sync();if(size!==f.size||hash.digest('hex')!==f.sha256)throw new Error('Source checksum or size mismatch');
      }finally{await source.close();await output?.close();}
      // link is atomic and never replaces an existing target; both paths are on the same filesystem.
      try{await link(temporary,path.join(storageRoot,target));}catch(e:any){if(e.code!=='EEXIST')throw e;}
      await unlink(temporary);temporary=null;
     }
    }
    const checked=await digest(target);if(checked.size!==f.size||checked.sha256!==f.sha256)throw new Error('Destination checksum or size mismatch');
    if(!f.storagePath){
     await db.$transaction(async tx=>{
      const updated=await tx.workProjectFile.updateMany({where:{id:f.id,storagePath:null,storageKey:f.storageKey,sha256:f.sha256},data:{storagePath:target,storageFolder:documentFolderName(f.documentType||'Иное')}});
      if(!updated.count){const current=await tx.workProjectFile.findUnique({where:{id:f.id}});if(current?.storagePath!==target)throw new Error('File changed during migration');}
      else await tx.auditLog.create({data:{entityType:'WorkProjectFile',entityId:c.id,action:'UPDATE',category:'DATA',result:'SUCCESS',resourceKey:'system.file-storage',actorEmail:'upts-storage-migration',note:'Документ УПТС скопирован в общий каталог; SHA-256 проверен',afterData:{fileId:f.id,storagePath:target}}});
     });result.migrated++;
    }else result.verified++;
    report({fileId:f.id,target,ok:true});
   }catch(e){result.failed++;report({fileId:f.id,error:String(e)});}finally{if(temporary)await unlink(temporary).catch(()=>{});}
  }
 }
 return result;
}
