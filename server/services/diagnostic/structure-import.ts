import type {H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent,computeAuditDelta} from '../../utils/auditLog';
import type {parseStructureImportBatch} from '../../../shared/utils/diagnostic-structure-import';
export async function importStructureBatch(event:H3Event,actorId:number,input:ReturnType<typeof parseStructureImportBatch>){
  for(let attempt=0;;attempt++){
    try{return await prisma.$transaction(async tx=>{
      // Shared with the legacy migration: no overlapping structure import batches.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(28102026, 1)`;
      const created:string[]=[],skipped:string[]=[];
      for(const item of input.records){
        // Unique code also protects against other writers and reserves soft-deleted codes.
        const added=await tx.diagnosticStructure.createMany({data:[{...item.data,createdById:actorId,updatedById:actorId}],skipDuplicates:true});
        if(!added.count){skipped.push(item.data.code);continue;}
        const row=await tx.diagnosticStructure.findUniqueOrThrow({where:{code:item.data.code},select:{id:true}});
        await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:'CREATE',resourceKey:'diagnostic.structures',entityType:'DiagnosticStructure',entityId:row.id,actorUserId:actorId,
          note:`Импорт Excel: ${input.fileName}, строка ${item.sourceRow}, код ${item.data.code}`,
          changes:computeAuditDelta({},item.data)});
        created.push(item.data.code);
      }
      return {created,skipped};
    },{isolationLevel:'Serializable',timeout:30000,maxWait:10000});}
    catch(error){if(attempt<2 && (error as {code?:string})?.code==='P2034')continue;throw error;}
  }
}
