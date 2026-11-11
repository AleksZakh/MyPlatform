import type {Prisma} from '@prisma/client';
import {objectFolderName,ensureUptsDirectory} from './work/file-storage';
/** The stable folder survives renaming an object; its ID prevents name collisions. */
export async function ensureObjectStorage(db:Prisma.TransactionClient,c:{id:number;number:string;name:string;storageFolder:string|null}){
 const folder=c.storageFolder||objectFolderName(c.id,c.number||c.name);
 if(!c.storageFolder)await db.uptsContract.updateMany({where:{id:c.id,storageFolder:null},data:{storageFolder:folder}});
 const current=await db.uptsContract.findUniqueOrThrow({where:{id:c.id},select:{storageFolder:true}});
 await ensureUptsDirectory(current.storageFolder!);return current.storageFolder!;
}
