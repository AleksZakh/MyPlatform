import {z} from 'zod';
import {createError} from 'h3';
import {REPORT_COLUMNS,REPORT_DATES,reportDate,type ReportConfig,type ReportRow,type ReportResult} from '../../shared/types/upts-reports';
import type {UptsSnapshot} from '../../shared/types/upts';
import {workUserName,WORK_STATUSES} from '../../shared/types/work';
import {objectStages,objectTypeName,usedWorkKinds} from '../../shared/utils/upts-object-stages';
import {workKindNames} from '../../shared/utils/upts-work-kinds';
const day=z.string().refine(v=>!v||(/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v),'Неверная дата');
const id=z.number().int().positive().max(2147483647).nullable();
export const reportSchema=z.object({name:z.string().trim().min(1).max(150),source:z.enum(['works','objects','documents']),columns:z.array(z.string()).min(1).max(30),group:z.enum(['none','objectStage','person','kind']),mode:z.enum(['detail','summary']),sort:z.enum(['asc','desc']),period:z.enum(['fixed','month','previousMonth','ask']),filters:z.object({projectId:id,objectId:id,employeeId:id,kind:z.string().max(100),status:z.enum(['','TODO','IN_PROGRESS','REVIEW','DONE','CANCELLED']),documentType:z.string().max(100),q:z.string().trim().max(200),archived:z.boolean(),dateField:z.string(),from:day,to:day}).strict()}).strict().superRefine((c,ctx)=>{
 if(c.columns.some(key=>!REPORT_COLUMNS[c.source].some(col=>col.key===key))||new Set(c.columns).size!==c.columns.length)ctx.addIssue({code:'custom',message:'Неверный список столбцов.'});
 if(!REPORT_DATES[c.source].some(d=>d.key===c.filters.dateField))ctx.addIssue({code:'custom',message:'Неверное поле периода.'});
 if(c.filters.from&&c.filters.to&&c.filters.from>c.filters.to)ctx.addIssue({code:'custom',message:'Начало периода позже окончания.'});
 if(c.source!=='works'&&c.filters.status)ctx.addIssue({code:'custom',message:'Состояние доступно только для отчёта по работам.'});
});
export function parseReport(raw:unknown):ReportConfig{const v=reportSchema.safeParse(raw);if(!v.success)throw createError({statusCode:400,message:v.error.issues.map(i=>i.message).join(' ')});return v.data;}
export function resolveReport(raw:ReportConfig,now=new Date()):ReportConfig{const c=structuredClone(raw);if(['month','previousMonth'].includes(c.period)){const s=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);const [y,m]=s.split('-').map(Number);const offset=c.period==='previousMonth'?1:0;c.filters.from=new Date(Date.UTC(y!,m!-1-offset,1)).toISOString().slice(0,10);c.filters.to=new Date(Date.UTC(y!,m!-offset,0)).toISOString().slice(0,10);}if(c.period==='ask'&&(!c.filters.from||!c.filters.to))throw createError({statusCode:400,message:'Укажите начало и окончание периода перед формированием.'});return c;}
export type ReportFile={id:string;projectId:number;contractId:number|null;taskId:number|null;ownerId:number;name:string;documentType:string|null;documentDate:Date|string|null;createdAt:Date|string;documentComment:string;size:number;sha256:string;owner:{id:number;fullName:string|null;login:string|null;email:string|null}};
const iso=(v:unknown)=>v?new Date(v as string).toISOString():'';
function localDay(s:string){return s?new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Moscow',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(s)):'';}
export function reportRows(data:UptsSnapshot,files:ReportFile[],people:Map<number,string>,c:ReportConfig):ReportRow[]{
 const byTask=new Map(data.tasks.map(t=>[t.id,t]));const rows:ReportRow[]=[];
 for(const p of data.projects)for(const o of p.upts.contracts){
  const d=o.objectDetails||{},tasks=data.tasks.filter(t=>t.uptsContractId===o.id),of=files.filter(f=>f.contractId===o.id&&f.projectId===p.id),stages=objectStages(d,tasks);
  const object=(o.number+' · '+(d.road||o.name)).trim(),common={object,road:d.road||o.name,cadastral:d.sourceCadastralNumber||''};
  const live=tasks.filter(t=>t.status!=='CANCELLED'),done=live.filter(t=>t.status==='DONE').length;
  const isLate=(t:typeof tasks[number])=>!['DONE','CANCELLED'].includes(t.status)&&!!t.dueDate&&t.dueDate.slice(0,10)<data.today;
  function add(row:Omit<ReportRow,'objectId'|'projectId'|'group'>,dates:Record<string,string>,kinds:string[],employee:number|null,status='',docType=''){
   const f=c.filters;
   if(f.kind&&!kinds.includes(f.kind)||c.source==='works'&&f.status&&status!==f.status)return;
   if(c.source==='documents'&&f.employeeId&&employee!==f.employeeId)return;
   if(c.source==='documents'&&f.documentType&&docType!==f.documentType)return;
   const date=localDay(dates[f.dateField]||'');if((f.from||f.to)&&(!date||f.from&&date<f.from||f.to&&date>f.to))return;
   const q=f.q.toLocaleLowerCase('ru');if(q&&!Object.values(row.values).some(v=>String(v).toLocaleLowerCase('ru').includes(q)))return;
   const group=c.group==='none'?'Вся выборка':c.group==='person'?String(row.values.person||'Не назначен')+(employee?' [№'+employee+']':''):c.group==='kind'?String(row.values.kind||'Не указан'):c.source==='works'?`${object} [${o.id}] / Этап ${row.values.stage}`:c.source==='documents'?`${object} [${o.id}] / ${docType}`:object+` [${o.id}]`;
   rows.push({...row,objectId:o.id,projectId:p.id,group});
  }
  if(c.source==='objects'){
   if(c.filters.employeeId&&!tasks.some(t=>t.assigneeId===c.filters.employeeId)&&d.curatorId!==c.filters.employeeId&&d.engineerId!==c.filters.employeeId)continue;
   if(c.filters.documentType&&!of.some(f=>(f.documentType||'Иное')===c.filters.documentType))continue;
   const linear=o.contractType==='OKS'&&d.oksKind==='LINEAR';
   add({id:'o'+o.id,taskId:null,fileId:null,done,workCount:live.length,overdue:live.filter(isLate).length,values:{...common,type:objectTypeName(o.contractType,d),kind:workKindNames({workKindKeys:usedWorkKinds(d,tasks)}),person:d.curatorId?people.get(d.curatorId)||'Сотрудник #'+d.curatorId:'Не назначен',engineer:d.engineerId?people.get(d.engineerId)||'Сотрудник #'+d.engineerId:'Не назначен',stage:stages.length,start:reportDate(d.workStartDate),due:reportDate(o.dueDate),total:live.length,done,percent:live.length?Math.round(done/live.length*100):'—',area:linear?'':d.sourceArea||'',length:linear?d.sourceLength||'':'',files:of.length,created:reportDate(o.createdAt,true)}},{start:iso(d.workStartDate),due:iso(o.dueDate),created:iso(o.createdAt)},usedWorkKinds(d,tasks),d.curatorId||null);
  }else if(c.source==='works')for(const t of tasks){
   if(c.filters.employeeId&&t.assigneeId!==c.filters.employeeId)continue;
   const tf=of.filter(f=>f.taskId===t.id);if(c.filters.documentType&&!tf.some(f=>(f.documentType||'Иное')===c.filters.documentType))continue;
   const m=t.uptsWorkMeta||{},stage=stages.find(s=>s.number===(m.stageNumber||1));
   add({id:'w'+t.id,taskId:t.id,fileId:null,done:t.status==='DONE'?1:0,workCount:t.status==='CANCELLED'?0:1,overdue:isLate(t)?1:0,values:{...common,stage:m.stageNumber||1,kind:workKindNames(m),name:t.title,person:workUserName(t.assignee),status:WORK_STATUSES[t.status as keyof typeof WORK_STATUSES]||t.status,stageStart:reportDate(stage?.startDate),stageEnd:reportDate(stage?.endDate),start:reportDate(m.startedAt),finish:reportDate(m.completedAt),due:reportDate(t.dueDate),overdue:isLate(t)?'Да':'Нет',result:m.resultText||'',kuvd:(m.kuvdEntries||[]).map(k=>k.number+(k.date?' от '+reportDate(k.date):'')).join('; '),files:tf.length}},{stageStart:iso(stage?.startDate),stageEnd:iso(stage?.endDate),start:iso(m.startedAt),finish:iso(m.completedAt),due:iso(t.dueDate)},usedWorkKinds(m),t.assigneeId,t.status);
  }else for(const f of of){
   const t=f.taskId?byTask.get(f.taskId):null;if(f.taskId&&!t)continue;const m=t?.uptsWorkMeta||{};
   add({id:'f'+f.id,taskId:t?.id||null,fileId:f.id,done:0,workCount:0,overdue:0,values:{...common,stage:t?m.stageNumber||1:'',work:t?.title||'Документ объекта',kind:t?workKindNames(m):workKindNames(d),name:f.name,documentType:f.documentType||'Иное',documentDate:reportDate(f.documentDate),uploaded:reportDate(f.createdAt,true),person:workUserName(f.owner),size:f.size,comment:f.documentComment}},{uploaded:iso(f.createdAt),documentDate:iso(f.documentDate)},t?usedWorkKinds(m):usedWorkKinds(d,tasks),f.ownerId,'',f.documentType||'Иное');
  }
 }
 const sign=c.sort==='asc'?1:-1;return rows.sort((a,b)=>a.group.localeCompare(b.group,'ru',{numeric:true})||sign*String(a.values.name||a.values.object).localeCompare(String(b.values.name||b.values.object),'ru',{numeric:true})||a.id.localeCompare(b.id));
}
export function reportResult(rows:ReportRow[],config:ReportConfig,generatedAt:string,page=1,pageSize=50):ReportResult{
 const groups=new Map<string,{name:string;count:number;workCount:number;done:number;overdue:number;percent:number|null}>();
 for(const r of rows){const g=groups.get(r.group)||{name:r.group,count:0,workCount:0,done:0,overdue:0,percent:null};g.count++;g.workCount+=r.workCount;g.done+=r.done;g.overdue+=r.overdue;groups.set(r.group,g);}
 for(const g of groups.values())g.percent=g.workCount?Math.round(g.done/g.workCount*100):null;
 const sum=(key:'workCount'|'done'|'overdue')=>rows.reduce((n,r)=>n+r[key],0);
 return {config,generatedAt,total:rows.length,objectCount:new Set(rows.map(r=>r.objectId)).size,workCount:sum('workCount'),done:sum('done'),overdue:sum('overdue'),page,pageSize,rows:rows.slice((page-1)*pageSize,page*pageSize),groups:[...groups.values()]};
}
