import {Prisma} from '@prisma/client';
import {prisma} from '../../../utils/prisma';
import {requirePermission} from '../../../services/access-control.service';
import {contractAccess} from '../../../services/diagnostic/access';
import {id,invalid} from '../../../services/diagnostic/input';
import {journalKinds,type JournalRow} from '../../../../shared/types/diagnostic-journal';
import {tripDay} from '../../../../shared/utils/diagnostic-trips';

export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');
 const resources=['diagnostic.contracts'];
 for(const key of ['diagnostic.structures','diagnostic.works']){
   try{await requirePermission(event,key,'VIEW',{auditDenial:false});resources.push(key);}
   catch(e:any){if(e.statusCode!==403)throw e;}
 }
 const q=getQuery(event),page=id(q.page??1);
 const conditions=[Prisma.sql`e."resourceKey" IN (${Prisma.join(resources)}) AND e.category='DATA' AND e.result='SUCCESS' AND e."entityType" IN (${Prisma.join(Object.keys(journalKinds))})`];
 if(q.kind){if(typeof q.kind!=='string'||!Object.hasOwn(journalKinds,q.kind))return invalid('Неизвестный тип события.');conditions.push(Prisma.sql`e."entityType"=${q.kind}`);}
 if(q.entity!==undefined){if(!q.kind)return invalid('Укажите тип записи.');conditions.push(Prisma.sql`e."entityId"=${id(q.entity)}`);}
 if(q.entry!==undefined)conditions.push(Prisma.sql`e.id=${id(q.entry)}`);
 for(const field of ['from','to'] as const){
   const value=q[field];if(!value)continue;if(!tripDay(value))return invalid('Проверьте даты журнала.');
   const start=Prisma.sql`((${value}::date + ${field==='to'?1:0}::int)::timestamp AT TIME ZONE 'Europe/Moscow') AT TIME ZONE 'UTC'`;
   conditions.push(field==='to'?Prisma.sql`e.timestamp<(${start})`:Prisma.sql`e.timestamp>=(${start})`);
 }
 if(q.from&&q.to&&String(q.from)>String(q.to))return invalid('Окончание периода раньше начала.');
 const title=Prisma.sql`coalesce(c.number,t.number,s.code,w.name,cw.name,sw."workNameSnapshot",tpl.name,
   CASE WHEN e.note !~ '^[0-9a-f]{64}$' THEN nullif(e.note,'') END,e."changes"->'name'->>'after',e."entityType"||' #'||coalesce(e."entityId",e.id))`;
 const actor=Prisma.sql`coalesce(nullif(u."fullName",''),u.login,e."actorLogin",nullif(e."actorEmail",''))`;
 const author=Prisma.sql`coalesce(nullif(creator."fullName",''),creator.login)`;
 for(const [field,expr] of [['search',title],['person',Prisma.sql`concat_ws(' ',${actor},${author})`]] as const){
   const val=q[field];if(!val)continue;if(typeof val!=='string'||val.length>250)return invalid('Проверьте поисковую строку.');
   conditions.push(Prisma.sql`${expr} ILIKE ${'%'+val.replace(/[\\%_]/g,'\\$&')+'%'}`);
 }
 const from=Prisma.sql`FROM audit_logs e LEFT JOIN app_users u ON u.id=e."actorUserId"
 LEFT JOIN diagnostic_contracts c ON e."entityType" IN ('DiagnosticContract','DiagnosticWorkPlan') AND c.id=e."entityId"
 LEFT JOIN diagnostic_trips t ON e."entityType"='DiagnosticTrip' AND t.id=e."entityId"
 LEFT JOIN diagnostic_structures s ON e."entityType"='DiagnosticStructure' AND s.id=e."entityId"
 LEFT JOIN diagnostic_works w ON e."entityType"='DiagnosticWork' AND w.id=e."entityId"
 LEFT JOIN diagnostic_contract_works cw ON e."entityType"='DiagnosticContractWork' AND cw.id=e."entityId"
 LEFT JOIN diagnostic_structure_works sw ON e."entityType"='DiagnosticStructureWork' AND sw.id=e."entityId"
 LEFT JOIN odis.template tpl ON e."entityType"='DiagnosticWorkTemplate' AND tpl.id=e."entityId"
 LEFT JOIN odis.assignment_owner a ON a.kind=CASE e."entityType" WHEN 'DiagnosticContractWork' THEN 'contract' WHEN 'DiagnosticStructureWork' THEN 'structure' END AND a.work_id=e."entityId"
 LEFT JOIN app_users creator ON creator.id=CASE WHEN e."entityType" IN ('DiagnosticContractWork','DiagnosticStructureWork') THEN
 CASE WHEN a.employee<>a.planner THEN a.planner END WHEN e."entityType"='DiagnosticWorkPlan' THEN e."actorUserId"
 ELSE coalesce(tpl.creator,c."createdById",t."createdById",s."createdById",w."createdById",CASE WHEN e.action='CREATE' THEN e."actorUserId" END) END
 WHERE ${Prisma.join(conditions,' AND ')}`;
 const details=q.entry||q.entity?Prisma.sql`(SELECT jsonb_object_agg(field.key,field.value) FROM jsonb_each(
   CASE WHEN jsonb_typeof(e.changes)='object' THEN e.changes ELSE '{}'::jsonb END) field
   WHERE field.key IN ('name','number','status','planStart','planFinish','planHours','planExecutor','factStart','factFinish','factHours','factExecutor','note','start','finish','category','deletedAt'))`:Prisma.sql`NULL::jsonb`;
 const [count,rows]=await prisma.$transaction([
   prisma.$queryRaw<{n:number}[]>`SELECT count(*)::int n ${from}`,
   prisma.$queryRaw<JournalRow[]>`SELECT e.id,e."entityType" kind,e."entityId" entity,${title} title,
   coalesce(tpl.created_at AT TIME ZONE 'UTC',CASE WHEN e."entityType"='DiagnosticContract' THEN c."createdAt" END,t."createdAt",s."createdAt",w."createdAt",cw."createdAt",sw."createdAt",
   CASE WHEN e.action='CREATE' THEN e.timestamp END) created,${details} details,e.timestamp time,e.action,${author} author,${actor} editor,e."afterData"->>'status' status ${from}
   ORDER BY e.timestamp DESC,e.id DESC LIMIT 25 OFFSET ${(page-1)*25}`
 ],{isolationLevel:'RepeatableRead'});
 return {rows,total:count[0]?.n??0};
});
