
import {Prisma} from '@prisma/client';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent} from '../../utils/auditLog';
import {normalizeCounterparty} from '../../../shared/utils/diagnostic-contracts';
import {diagnosticSupervisors} from './supervisors';
export async function readCatalog(event:H3Event){
 const [counterparties,projectTypes,income,supervisors]=await Promise.all([
 prisma.diagnosticCounterparty.findMany({orderBy:{name:'asc'},select:{id:true,name:true}}),
 prisma.diagnosticProjectType.findMany({where:{isActive:true},orderBy:{id:'asc'},select:{id:true,name:true}}),
 prisma.diagnosticContract.findMany({where:{direction:'INCOME',deletedAt:null},orderBy:{number:'asc'},select:{id:true,number:true,counterparty:{select:{name:true}}}}),
 diagnosticSupervisors(event)]);
 return {counterparties,projectTypes,supervisors:supervisors.items,supervisorWarning:supervisors.warning,incomeContracts:income.map(c=>({id:c.id,number:c.number,counterparty:c.counterparty.name}))};
}
export async function addCatalog(event:H3Event,actorId:number,kind:'counterparty'|'projectType',name:unknown){
 if(typeof name!=='string'||!name.trim()||name.trim().length>255)throw createError({statusCode:400,message:'Укажите название длиной до 255 символов.'});
 const label=name.trim().replace(/\s+/g,' '),normalizedName=normalizeCounterparty(label);
 if(!normalizedName)throw createError({statusCode:400,message:'Укажите название.'});
 const lookup=()=>kind==='counterparty'?prisma.diagnosticCounterparty.findUnique({where:{normalizedName},select:{id:true,name:true}}):prisma.diagnosticProjectType.findUnique({where:{name:label},select:{id:true,name:true}});
 const existing=await lookup();if(existing)return existing;
 try{return await prisma.$transaction(async tx=>{
  const item=kind==='counterparty'?await tx.diagnosticCounterparty.create({data:{name:label,normalizedName}}):await tx.diagnosticProjectType.create({data:{name:label}});
  await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:'CREATE',resourceKey:'diagnostic.contracts',entityType:kind==='counterparty'?'DiagnosticCounterparty':'DiagnosticProjectType',entityId:item.id,actorUserId:actorId,changes:{name:{before:null,after:label}}});
  return {id:item.id,name:item.name};
 });}catch(e){if(e instanceof Prisma.PrismaClientKnownRequestError&&e.code==='P2002'){const item=await lookup();if(item)return item;}throw e;}
}
