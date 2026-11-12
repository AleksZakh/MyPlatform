import {defineEventHandler,getQuery,createError} from 'h3';
import type {Prisma} from '@prisma/client';
import {prisma} from '../../utils/prisma';
import {uptsActor} from '../../services/upts-access';
import {projectWhere} from '../../services/work/policy';
export default defineEventHandler(async event=>{
 const a=await uptsActor(event),q=getQuery(event),page=Math.min(100000,Math.max(1,Math.floor(Number(q.page)||1))),pageSize=50;
 const projects=await prisma.workProject.findMany({where:{...projectWhere(a),upts:{isNot:null}},select:{id:true}}),ids=projects.map(p=>p.id);
 const contracts=await prisma.uptsContract.findMany({where:{projectId:{in:ids}},select:{id:true}}),cids=contracts.map(c=>c.id);
 const tasks=await prisma.workTask.findMany({where:{uptsContractId:{in:cids}},select:{id:true}});
 const links=await prisma.uptsProjectObject.findMany({where:{projectId:{in:ids}},select:{id:true,objectId:true}});
 const scope:Prisma.AuditLogWhereInput={OR:[
  {entityType:'UptsContract',entityId:{in:cids}},
  {entityType:'WorkTask',entityId:{in:tasks.map(t=>t.id)}},
  {entityType:{in:['WorkProject','UptsProject']},entityId:{in:ids}},
  {entityType:'UptsProjectObject',entityId:{in:links.map(l=>l.id)}},
  {entityType:'UptsObject',entityId:{in:links.flatMap(l=>l.objectId?[l.objectId]:[])}},
  {entityType:'WorkProjectFile',entityId:{in:ids},afterData:{path:['scope'],equals:'SHARED'}},
  {entityType:'UptsExport',actorUserId:a.id},
  {entityType:{in:['UptsWorkDefinition','UptsWorkTemplate','UptsLibraryWork','UptsTemplate']}}
 ]};
 const and:Prisma.AuditLogWhereInput[]=[scope];
 if(q.action)and.push({action:String(q.action).slice(0,60)});
 const search=String(q.search||'').trim().slice(0,200);if(search)and.push({OR:[{note:{contains:search,mode:'insensitive'}},{actorEmail:{contains:search,mode:'insensitive'}},{actorLogin:{contains:search,mode:'insensitive'}}]});
 const day=(v:unknown,end=false)=>{if(!v)return undefined;const s=String(v);if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||Number.isNaN(Date.parse(s)))throw createError({statusCode:400,message:'Неверная дата.'});return new Date(s+(end?'T23:59:59.999+03:00':'T00:00:00+03:00'));};
 const from=day(q.from),to=day(q.to,true);if(from&&to&&from>to)throw createError({statusCode:400,message:'Начало периода позже окончания.'});if(from||to)and.push({timestamp:{gte:from,lte:to}});
 const where={AND:and};const [total,items]=await prisma.$transaction([prisma.auditLog.count({where}),prisma.auditLog.findMany({where,orderBy:[{timestamp:'desc'},{id:'desc'}],skip:(page-1)*pageSize,take:pageSize,select:{id:true,timestamp:true,actorEmail:true,actorLogin:true,actorUserId:true,action:true,result:true,entityType:true,entityId:true,note:true}})]);
 const users=await prisma.user.findMany({where:{id:{in:items.flatMap(i=>i.actorUserId?[i.actorUserId]:[])}},select:{id:true,fullName:true}}),names=new Map(users.map(u=>[u.id,u.fullName]));
 return {items:items.map(i=>({...i,actorName:(i.actorUserId?names.get(i.actorUserId):null)||i.actorLogin||i.actorEmail})),total,page,pageSize};
});
