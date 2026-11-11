import {prisma} from '../utils/prisma';
import {migratePendingUptsStorage} from '../services/upts-storage-migration';

/** Old attachments are copied outside HTTP requests; originals and download IDs survive. */
export default defineNitroPlugin(nitro=>{
 let stopped=false, cursor:string|null=null;
 let timer:ReturnType<typeof setTimeout>;
 const schedule=(delay:number)=>{if(!stopped){timer=setTimeout(run,delay);timer.unref();}};
 const run=async()=>{
  let delay=300000;
  try{
   const result=await migratePendingUptsStorage(prisma,cursor,row=>{
    if(row && typeof row==='object' && 'error' in row)console.warn('[upts-storage-recovery]',JSON.stringify(row));
   });
   cursor=result.hasMore?result.cursor:null;
   if(result.hasMore)delay=5000;
   if(result.migrated||result.failed)console.info('[upts-storage-recovery]',JSON.stringify(result));
  }catch(error){cursor=null;console.warn('[upts-storage-recovery] retry in 5 minutes',String(error));}
  finally{schedule(delay);}
 };
 schedule(5000);
 nitro.hooks.hook('close',()=>{stopped=true;clearTimeout(timer);});
});
