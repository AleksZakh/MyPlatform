import {Prisma} from '@prisma/client';
import {createError,type H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {computeAuditDelta,writeAuditEvent} from '../../utils/auditLog';
import {lockStructuresForAssignment} from './structure-availability';
import {id,invalid} from './input';
import {categoryNames,type Category} from '../../../shared/utils/diagnostic-planning';
import type {ContractAdditions,TemplateUse,WorkTemplate} from '../../../shared/types/diagnostic-templates';

export async function listTemplates(db:Prisma.TransactionClient=prisma,ids?:number[]){
  const usable=Prisma.sql`w."deletedAt" IS NULL AND cat.name=CASE t.category WHEN 'contract' THEN ${categoryNames.contract} WHEN 'structure' THEN ${categoryNames.structure} ELSE ${categoryNames.other} END`;
  return db.$queryRaw<WorkTemplate[]>`SELECT t.id,t.version,t.name,t.category,coalesce(nullif(u."fullName",''),u.login,'#'||u.id) author,
    count(*) FILTER(WHERE NOT (${usable}))::int unavailable,
    coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'code',w.code,'note',w.note) ORDER BY w.code) FILTER(WHERE ${usable}),'[]'::jsonb) items
    FROM odis.template t JOIN app_users u ON u.id=t.creator JOIN odis.template_item i ON i.template_id=t.id
    JOIN diagnostic_works w ON w.id=i.work_id JOIN diagnostic_work_categories cat ON cat.id=w."categoryId"
    WHERE t.deleted_at IS NULL ${ids?Prisma.sql`AND t.id IN (${Prisma.join(ids)})`:Prisma.empty} GROUP BY t.id,u.id ORDER BY t.name,t.id`;
}
function identifiers(raw:unknown):number[]{
  if(!Array.isArray(raw))return invalid('Некорректный список записей.');
  return [...new Set(raw.map(id))];
}
function parseTemplate(body:any){
  const category:Category=body?.category;
  const name=typeof body?.name==='string'?body.name.trim():'';
  if(typeof category!=='string'||!Object.hasOwn(categoryNames,category)||!name||name.length>150)return invalid('Укажите название и категорию шаблона.');
  const items=identifiers(body.items).sort((a,b)=>a-b);
  if(!items.length)return invalid('Выберите хотя бы одну работу.');
  return {category,name,items};
}

function conflict(){
  return createError({statusCode:409,message:'Шаблон изменён или удалён другим пользователем. Откройте актуальную версию.'});
}

async function templateTransaction<T>(write:(tx:Prisma.TransactionClient)=>Promise<T>){
  try{return await prisma.$transaction(write,{isolationLevel:'Serializable'});}
  catch(e){
    if(e instanceof Prisma.PrismaClientKnownRequestError){
      if(e.code==='P2034'||e.meta?.code==='40001')throw conflict();
      if(e.meta?.code==='23505')return invalid('В этой категории уже есть шаблон с таким названием.');
    }
    throw e;
  }
}

async function currentTemplate(tx:Prisma.TransactionClient,templateId:number,version:number){
  const [before]=await listTemplates(tx,[templateId]);
  if(!before||before.version!==version)throw conflict();
  return before;
}

export async function saveTemplate(event:H3Event,actor:number,body:any,templateId?:number){
  const next=parseTemplate(body);
  const version=templateId?id(body.version):undefined;
  return templateTransaction(async tx=>{
    const count=await tx.diagnosticWork.count({where:{id:{in:next.items},deletedAt:null,category:{name:categoryNames[next.category]}}});
    if(count!==next.items.length)return invalid('Все работы должны быть доступны в выбранной категории.');
    const before=templateId?await currentTemplate(tx,templateId,version!):null;
    let savedId:number;
    if(before){
      const duplicate=await tx.$queryRaw<{id:number}[]>`SELECT id FROM odis.template WHERE deleted_at IS NULL AND category=${next.category} AND name=${next.name} AND id<>${before.id}`;
      if(duplicate.length)return invalid('В этой категории уже есть шаблон с таким названием.');
      const updated=await tx.$executeRaw`UPDATE odis.template SET name=${next.name},category=${next.category},version=version+1
        WHERE id=${before.id} AND version=${before.version} AND deleted_at IS NULL`;
      if(updated!==1)throw conflict();
      savedId=before.id;
    }else{
      const [created]=await tx.$queryRaw<{id:number}[]>`INSERT INTO odis.template(name,category,creator) VALUES(${next.name},${next.category},${actor})
        ON CONFLICT DO NOTHING RETURNING id`;
      if(!created)return invalid('В этой категории уже есть шаблон с таким названием.');
      savedId=created.id;
    }
    const prior=before?await tx.$queryRaw<{work_id:number}[]>`SELECT work_id FROM odis.template_item WHERE template_id=${savedId} ORDER BY work_id`:[];
    if(before)await tx.$executeRaw`DELETE FROM odis.template_item WHERE template_id=${savedId}`;
    await tx.$executeRaw`INSERT INTO odis.template_item(template_id,work_id) SELECT ${savedId},id FROM diagnostic_works WHERE id IN (${Prisma.join(next.items)})`;
    const changes=before?computeAuditDelta({name:before.name,category:before.category,items:prior.map(w=>w.work_id)},next):undefined;
    await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:before?'UPDATE':'CREATE',resourceKey:'diagnostic.contracts',
      entityType:'DiagnosticWorkTemplate',entityId:savedId,actorUserId:actor,note:next.name,afterData:next,changes});
    return {id:savedId};
  });
}

export async function removeTemplate(event:H3Event,actor:number,templateId:number,version:number){
  return templateTransaction(async tx=>{
    const before=await currentTemplate(tx,templateId,version);
    const removed=await tx.$executeRaw`UPDATE odis.template SET deleted_at=now(),version=version+1 WHERE id=${templateId} AND version=${version} AND deleted_at IS NULL`;
    if(removed!==1)throw conflict();
    await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:'DELETE',resourceKey:'diagnostic.contracts',
      entityType:'DiagnosticWorkTemplate',entityId:templateId,actorUserId:actor,note:before.name});
    return {id:templateId};
  });
}
export function templateUses(raw:unknown):TemplateUse[]{
  if(raw===undefined)return [];
  if(!Array.isArray(raw))return invalid('Некорректный выбор шаблонов.');
  return raw.map(x=>({templateId:id(x?.templateId),version:x?.version===undefined?undefined:id(x.version),workIds:x?.workIds===undefined?undefined:identifiers(x.workIds),structureIds:identifiers(x?.structureIds)}));
}
export function contractAdditions(raw:unknown):ContractAdditions {
  if(raw===undefined)return {workIds:[],structureIds:[]};
  if(!raw||typeof raw!=='object'||!('workIds' in raw)||!('structureIds' in raw))
    return invalid('Некорректный состав договора.');
  return {workIds:identifiers(raw.workIds),structureIds:identifiers(raw.structureIds)};
}
export async function applyTemplates(tx:Prisma.TransactionClient,contractId:number,actor:number,uses:TemplateUse[],manual:ContractAdditions={workIds:[],structureIds:[]}){
  if(!uses.length&&!manual.workIds.length&&!manual.structureIds.length)return;
  const templates=uses.length?await listTemplates(tx,[...new Set(uses.map(u=>u.templateId))]):[];
  const index=new Map(templates.map(t=>[t.id,t]));
  const byStructure=new Map<number,Set<number>>();
  if(manual.workIds.length){
    const available=await tx.diagnosticWork.count({where:{id:{in:manual.workIds},deletedAt:null,category:{name:{in:[categoryNames.contract,categoryNames.other]}}}});
    if(available!==manual.workIds.length)return invalid('Работа недоступна или относится к другой категории.');
    byStructure.set(0,new Set(manual.workIds));
  }
  for(const sid of manual.structureIds)byStructure.set(sid,new Set());
  for(const use of uses){
    const t=index.get(use.templateId);
    if(!t||(use.version!==undefined&&use.version!==t.version))throw createError({statusCode:409,message:'Шаблон изменён или удалён. Уберите его из состава договора и выберите заново.'});
    if((t.category==='structure')!==!!use.structureIds.length)return invalid('Категория шаблона не соответствует выбранному разделу.');
    const availableIds=new Set(t.items.map(w=>w.id));
    const ids=use.workIds??[...availableIds];
    if(ids.some(workId=>!availableIds.has(workId)))return invalid('Работа отсутствует в выбранном шаблоне.');
    if(t.unavailable||!ids.length)return invalid('Состав библиотеки изменился. Обновите состав шаблона «'+t.name+'».');
    for(const sid of (use.structureIds.length?use.structureIds:[0])){
      const selected=byStructure.get(sid)??new Set<number>();ids.forEach(w=>selected.add(w));byStructure.set(sid,selected);
    }
  }
  const workIds=[...new Set([...byStructure.values()].flatMap(s=>[...s]))];
  const works=await tx.diagnosticWork.findMany({where:{id:{in:workIds},deletedAt:null}});
  const contractWorks=byStructure.get(0);
  if(contractWorks){
    const existing=await tx.diagnosticContractWork.findMany({where:{contractId,workId:{in:[...contractWorks]},deletedAt:null},select:{workId:true}});
    existing.forEach(w=>contractWorks.delete(w.workId));
    const records=works.filter(w=>contractWorks.has(w.id)).map(w=>({contractId,workId:w.id,code:w.code,name:w.name,criteria:w.criteria,note:w.note,planHours:w.hours,status:'unplanned',createdById:actor,updatedById:actor}));
    if(records.length)await tx.diagnosticContractWork.createMany({data:records});
  }
  const sids=[...byStructure.keys()].filter(Boolean);
  if(!sids.length)return;
  const available=await lockStructuresForAssignment(tx,sids);
  const added=await tx.diagnosticContractStructure.createManyAndReturn({data:sids.map(structureId=>({contractId,structureId})),skipDuplicates:true,select:{id:true,structureId:true}});
  const restored=await tx.diagnosticContractStructure.updateManyAndReturn({where:{contractId,structureId:{in:sids},deletedAt:{not:null}},
    data:{deletedAt:null,stage:1},select:{id:true,structureId:true}});
  added.push(...restored);
  if(added.length){
    const codes=new Map(available.map(s=>[s.id,s.code]));
    await tx.auditLog.createMany({data:added.map(l=>({category:'DATA',result:'SUCCESS',action:'CREATE',resourceKey:'diagnostic.contracts',
      entityType:'DiagnosticContractStructure',entityId:l.id,actorUserId:actor,actorEmail:'',note:'Код ИССО '+codes.get(l.structureId),afterData:{contractId,structureId:l.structureId}}))});
  }
  const links=await tx.diagnosticContractStructure.findMany({where:{contractId,structureId:{in:sids},deletedAt:null},select:{id:true,structureId:true}});
  if(links.length!==sids.length)return invalid('Одна из связей с сооружением была удалена. Восстановите её перед применением шаблона.');
  const existing=await tx.diagnosticStructureWork.findMany({where:{contractStructureId:{in:links.map(l=>l.id)},workId:{in:workIds},deletedAt:null},select:{structureId:true,workId:true}});
  existing.forEach(r=>byStructure.get(r.structureId)?.delete(r.workId));
  for(let i=0;i<links.length;i+=50){
    const records=links.slice(i,i+50).flatMap(l=>works.filter(w=>byStructure.get(l.structureId)!.has(w.id)).map(w=>({
      contractStructureId:l.id,structureId:l.structureId,workId:w.id,workCodeSnapshot:w.code,workNameSnapshot:w.name,criteriaSnapshot:w.criteria,
      catalogHoursSnapshot:w.hours,hours:w.hours,planHours:w.hours,note:w.note,status:'unplanned',createdById:actor,updatedById:actor})));
    if(records.length)await tx.diagnosticStructureWork.createMany({data:records});
  }
}
