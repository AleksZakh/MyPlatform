import {z} from 'zod';
import type {Prisma} from '@prisma/client';
import type {H3Event} from 'h3';
import type {Actor} from './work/policy';
import type {UptsObjectDetails,UptsWorkMeta} from '../../shared/types/upts-object';
import {fail,version} from './work/service';
import {writeAuditEvent,computeAuditDelta} from '../utils/auditLog';
const stage=z.number().int().positive().max(2147483647);
export const workStagesSchema=z.array(stage).max(50).optional();
export const taskStagesSchema=z.array(z.object({id:stage,version:stage,stageNumber:stage}).strict()).max(5000)
  .refine(rows=>new Set(rows.map(r=>r.id)).size===rows.length,'Работы не должны повторяться.').optional();
export function workStageCount(details?:UptsObjectDetails|null){return details?.stageCount ?? 1;}
export function checkNewWorkStages(stages:number[]|undefined,count:number,details?:UptsObjectDetails){
  if(stages && (stages.length!==count || stages.some(n=>n>workStageCount(details))))
    fail(400,'Укажите для каждой работы этап в пределах количества этапов объекта.');
}
// Called under the shared work transaction lock, together with the object update.
export async function saveTaskStages(tx:Prisma.TransactionClient,event:H3Event,actor:Actor,contractId:number,details:UptsObjectDetails|undefined,changes:z.infer<typeof taskStagesSchema>){
  const tasks=await tx.workTask.findMany({where:{uptsContractId:contractId,deletedAt:null},select:{id:true,version:true,uptsWorkMeta:true}});
  const selected=new Map((changes || []).map(r=>[r.id,r]));
  if([...selected.keys()].some(id=>!tasks.some(t=>t.id===id)))fail(400,'Работа не принадлежит этому объекту или удалена.');
  for(const task of tasks){
    const change=selected.get(task.id),meta=task.uptsWorkMeta as UptsWorkMeta|null;
    if(change)version(task.version,change.version);
    const number=change?.stageNumber ?? meta?.stageNumber ?? 1;
    if(number>workStageCount(details))fail(400,'Есть работы вне нового количества этапов. Переназначьте их этапы перед сохранением.');
    if(!change || number===(meta?.stageNumber ?? 1))continue;
    const after={...(meta || {}),stageNumber:number};
    await tx.workTask.update({where:{id:task.id},data:{uptsWorkMeta:after,version:{increment:1}}});
    await writeAuditEvent({event,db:tx,actorUserId:actor.id,category:'DATA',result:'SUCCESS',resourceKey:'projects.shared',entityType:'WorkTask',entityId:task.id,action:'UPDATE',changes:computeAuditDelta({uptsWorkMeta:meta},{uptsWorkMeta:after}),afterData:{uptsWorkMeta:after},note:'УПТС: изменение этапа работы'});
  }
}
