import {Prisma} from '@prisma/client';
import type {H3Event} from 'h3';
import {prisma} from '../../utils/prisma';
import {writeAuditEvent} from '../../utils/auditLog';
import {id,invalid} from './input';
import {categoryNames,type Category} from '../../../shared/utils/diagnostic-planning';
import type {TemplateUse,WorkTemplate} from '../../../shared/types/diagnostic-templates';

export async function listTemplates(db:Prisma.TransactionClient=prisma,ids?:number[]){
  const usable=Prisma.sql`w."deletedAt" IS NULL AND cat.name=CASE t.category WHEN 'contract' THEN ${categoryNames.contract} WHEN 'structure' THEN ${categoryNames.structure} ELSE ${categoryNames.other} END`;
  return db.$queryRaw<WorkTemplate[]>`SELECT t.id,t.name,t.category,coalesce(nullif(u."fullName",''),u.login,'#'||u.id) author,
    count(*) FILTER(WHERE NOT (${usable}))::int unavailable,
    coalesce(jsonb_agg(jsonb_build_object('id',w.id,'name',w.name,'code',w.code) ORDER BY w.code) FILTER(WHERE ${usable}),'[]'::jsonb) items
    FROM odis.template t JOIN app_users u ON u.id=t.creator JOIN odis.template_item i ON i.template_id=t.id
    JOIN diagnostic_works w ON w.id=i.work_id JOIN diagnostic_work_categories cat ON cat.id=w."categoryId"
    ${ids?Prisma.sql`WHERE t.id IN (${Prisma.join(ids)})`:Prisma.empty} GROUP BY t.id,u.id ORDER BY t.name,t.id`;
}
function identifiers(raw:unknown):number[]{
  if(!Array.isArray(raw))return invalid('Некорректный список записей.');
  return [...new Set(raw.map(id))];
}
export async function createTemplate(event:H3Event,actor:number,body:any){
  const category:Category=body?.category;
  const name=typeof body?.name==='string'?body.name.trim():'';
  if(typeof category!=='string'||!Object.hasOwn(categoryNames,category)||!name||name.length>150)return invalid('Укажите название и категорию шаблона.');
  const ids=identifiers(body.items);
  if(!ids.length)return invalid('Выберите хотя бы одну работу.');
  return prisma.$transaction(async tx=>{
    const count=await tx.diagnosticWork.count({where:{id:{in:ids},deletedAt:null,category:{name:categoryNames[category]}}});
    if(count!==ids.length)return invalid('Все работы должны быть доступны в выбранной категории.');
    const [t]=await tx.$queryRaw<{id:number}[]>`INSERT INTO odis.template(name,category,creator) VALUES(${name},${category},${actor})
      ON CONFLICT(category,name) DO NOTHING RETURNING id`;
    if(!t)return invalid('В этой категории уже есть шаблон с таким названием.');
    await tx.$executeRaw`INSERT INTO odis.template_item(template_id,work_id) SELECT ${t.id},id FROM diagnostic_works WHERE id IN (${Prisma.join(ids)})`;
    await writeAuditEvent({event,db:tx,category:'DATA',result:'SUCCESS',action:'CREATE',resourceKey:'diagnostic.contracts',entityType:'DiagnosticWorkTemplate',entityId:t.id,actorUserId:actor,note:name,afterData:{category,items:ids}});
    return t;
  },{isolationLevel:'Serializable'});
}
export function templateUses(raw:unknown):TemplateUse[]{
  if(raw===undefined)return [];
  if(!Array.isArray(raw))return invalid('Некорректный выбор шаблонов.');
  return raw.map(x=>({templateId:id(x?.templateId),structureIds:identifiers(x?.structureIds)}));
}
export async function applyTemplates(tx:Prisma.TransactionClient,contractId:number,actor:number,uses:TemplateUse[]){
  if(!uses.length)return;
  const templates=await listTemplates(tx,[...new Set(uses.map(u=>u.templateId))]);
  const index=new Map(templates.map(t=>[t.id,t]));
  const byStructure=new Map<number,Set<number>>();
  for(const use of uses){
    const t=index.get(use.templateId);
    if(!t || (t.category==='structure')!==!!use.structureIds.length)return invalid('Категория шаблона не соответствует выбранному разделу.');
    const ids=t.items.map(w=>w.id);
    if(t.unavailable||!ids.length)return invalid('Состав библиотеки изменился. Создайте актуальный шаблон вместо «'+t.name+'».');
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
  const available=await tx.diagnosticStructure.findMany({where:{id:{in:sids},deletedAt:null},select:{id:true,code:true}});
  if(available.length!==sids.length)return invalid('Одно из сооружений больше недоступно.');
  const added=await tx.diagnosticContractStructure.createManyAndReturn({data:sids.map(structureId=>({contractId,structureId})),skipDuplicates:true,select:{id:true,structureId:true}});
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
