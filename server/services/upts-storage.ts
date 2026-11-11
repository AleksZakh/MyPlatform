import type {Prisma} from '@prisma/client';
import {objectFolderName,ensureUptsDirectory} from './work/file-storage';
/** The stable folder survives renaming an object; its ID prevents name collisions. */
export async function ensureObjectStorage(db:Prisma.TransactionClient,c:{id:number;number:string;name:string;storageFolder:string|null}){
 // Bind the existing UPTS namespace to a Space group, never to an AD department.
 const group=await db.spaceGroup.findFirst({where:{OR:[{storagePath:'upts'},{storagePath:null,name:{in:['УПТС','upts','Управление подготовки территории строительства'],mode:'insensitive'}}]},orderBy:{id:'asc'},select:{id:true,storagePath:true}});
 if(group&&!group.storagePath)await db.spaceGroup.updateMany({where:{id:group.id,storagePath:null},data:{storagePath:'upts'}});
 const folder=c.storageFolder||objectFolderName(c.id,c.number||c.name);
 if(!c.storageFolder)await db.uptsContract.updateMany({where:{id:c.id,storageFolder:null},data:{storageFolder:folder}});
 const current=await db.uptsContract.findUniqueOrThrow({where:{id:c.id},select:{storageFolder:true}});
 await ensureUptsDirectory(current.storageFolder!);return current.storageFolder!;
}
