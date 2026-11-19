import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,rm,lstat,realpath,stat,statfs,rename,open} from 'node:fs/promises';
import {createReadStream,createWriteStream} from 'node:fs';
import {finished} from 'node:stream/promises';
import {once} from 'node:events';
import {createError,setHeader,sendStream,type H3Event} from 'h3';
import {z} from 'zod';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import {prisma} from '../utils/prisma';
import {writeAuditEvent} from '../utils/auditLog';
import {uptsActor} from './upts-access';
import {notifyDialog} from './chat/notify';
import {snapshot} from './upts';
import {projectWhere} from './work/policy';
const userSelect={id:true,fullName:true,login:true,email:true} as const;
import {openProjectFile} from './work/file-storage';
import {EXPORT_ROOT,ensureExportRoot,acquireLock,writeJson} from './lab-export-store';
import {exportDocumentPath,EXPORT_OPEN_INSTRUCTIONS} from './upts-export-layout';
import {parseReport,resolveReport,reportRows,reportResult,reportSchema,type ReportFile} from './upts-reports-model';
import {REPORT_COLUMNS,REPORT_DATES,REPORT_SOURCES,reportDate,type ReportConfig,type ReportRow,type ReportJobView,type ReportTemplate} from '../../shared/types/upts-reports';
import {workUserName} from '../../shared/types/work';
const ROOT=path.join(EXPORT_ROOT,'upts-reports'),ROW_LIMIT=10000,DOC_LIMIT=500;
type Template=Omit<ReportTemplate,'canEdit'>;
type Job=Omit<ReportJobView,'rows'>&{ownerId:number;notificationId:string;notified?:boolean;totalRows:number;data:ReportRow[];files:ReportFile[];objectIds:number[]};
function fail(statusCode:number,message:string):never{throw createError({statusCode,message});}
async function root(){await ensureExportRoot();await mkdir(ROOT,{recursive:true,mode:0o700});if((await lstat(ROOT)).isSymbolicLink()||await realpath(ROOT)!==path.join(await realpath(EXPORT_ROOT),'upts-reports'))throw Error('Unsafe reports root');for(const sub of ['templates','jobs']){const p=path.join(ROOT,sub);await mkdir(p,{recursive:true,mode:0o700});if((await lstat(p)).isSymbolicLink())throw Error('Unsafe reports directory');}}
function templatePath(id:string){if(!/^[a-f0-9-]{36}$/.test(id))fail(404,'Шаблон не найден.');return path.join(ROOT,'templates',id+'.json');}
function jobPath(id:string){if(!/^[a-f0-9]{64}$/.test(id))fail(404,'Отчёт не найден.');return path.join(ROOT,'jobs',id);}
async function read<T>(file:string):Promise<T>{return JSON.parse(await readFile(file,'utf8'));}
async function audit(event:H3Event|undefined,ownerId:number,action:string,note:string,details:Record<string,unknown>={},result:'SUCCESS'|'FAILED'='SUCCESS'){
 const data={actorUserId:ownerId,category:'DATA' as const,result,resourceKey:'upts.exports',entityType:'UptsReport',action,note,afterData:details as any};if(event)await writeAuditEvent({event,...data});else await prisma.auditLog.create({data:{...data,actorEmail:'user:'+ownerId}});
}
async function templates(){await root();const list:Template[]=[];for(const f of await readdir(path.join(ROOT,'templates')))if(/^[a-f0-9-]{36}\.json$/.test(f)){const t=await read<Template>(path.join(ROOT,'templates',f)).catch(()=>null);if(t)list.push(t);}return list;}
export async function listReportTemplates(event:H3Event){const a=await uptsActor(event);return (await templates()).filter(t=>t.shared||t.ownerId===a.id).map(t=>({...t,canEdit:t.ownerId===a.id||a.isSystemAdmin})).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt));}
const templateInput=z.object({config:reportSchema,shared:z.boolean(),version:z.number().int().positive().optional()}).strict();
export async function saveReportTemplate(event:H3Event,raw:unknown,id?:string){const a=await uptsActor(event),v=templateInput.safeParse(raw);if(!v.success)fail(400,'Проверьте настройки шаблона.');await root();const unlock=await acquireLock('upts-report-templates');if(!unlock)fail(409,'Шаблоны обновляются. Повторите запрос.');try{
 let old:Template|null=null;if(id){old=await read<Template>(templatePath(id)).catch(()=>null);if(!old)fail(404,'Шаблон не найден.');if(old.ownerId!==a.id&&!a.isSystemAdmin)fail(403,'Изменить шаблон может его автор.');if(v.data.version!==old.version)fail(409,'Шаблон изменён другим пользователем. Обновите список.');}
 if(!id&&(await templates()).filter(t=>t.ownerId===a.id).length>=100)fail(422,'Не более 100 шаблонов на пользователя.');
 const t:Template={id:id||randomUUID(),ownerId:old?.ownerId||a.id,name:v.data.config.name,shared:v.data.shared,version:(old?.version||0)+1,updatedAt:new Date().toISOString(),config:v.data.config};await writeJson(templatePath(t.id),t);await audit(event,a.id,old?'REPORT_TPL_UPDATE':'REPORT_TPL_CREATE',`УПТС: ${old?'изменён':'создан'} шаблон «${t.name}»`,{templateId:t.id,shared:t.shared});return {...t,canEdit:true};
 }finally{await unlock();}}
export async function deleteReportTemplate(event:H3Event,id:string,version:unknown){const a=await uptsActor(event);await root();const unlock=await acquireLock('upts-report-templates');if(!unlock)fail(409,'Шаблоны обновляются.');try{const t=await read<Template>(templatePath(id)).catch(()=>null);if(!t)fail(404,'Шаблон не найден.');if(t.ownerId!==a.id&&!a.isSystemAdmin)fail(403,'Удалить шаблон может его автор.');if(t.version!==version)fail(409,'Шаблон изменён. Обновите список.');await rm(templatePath(id));await audit(event,a.id,'REPORT_TPL_DELETE',`УПТС: удалён шаблон «${t.name}»`,{templateId:id});return {ok:true};}finally{await unlock();}}
async function selection(event:H3Event,raw:unknown){await uptsActor(event);const config=resolveReport(parseReport(raw)),f=config.filters;
 // Do not pass employee/search filters into snapshot: object totals include all works,
 // while document authors and task assignees are different filter dimensions.
 const data=await snapshot(event,{projectId:f.projectId,contractId:f.objectId,archived:f.archived?'1':'0'}),objects=data.projects.flatMap(p=>p.upts.contracts),ids=objects.map(o=>o.id);
 const files=await prisma.workProjectFile.findMany({where:{contractId:{in:ids},scope:'SHARED',deletedAt:null,OR:[{taskId:null},{task:{deletedAt:null}}]},include:{owner:{select:userSelect}},take:ROW_LIMIT+1,orderBy:{id:'asc'}});
 if(files.length>ROW_LIMIT)fail(422,'Более 10 000 документов. Выберите отдельный объект или проект.');
 const userIds=[...new Set(objects.flatMap(o=>[o.objectDetails?.curatorId,o.objectDetails?.engineerId]).filter((id):id is number=>!!id))];const people=await prisma.user.findMany({where:{id:{in:userIds}},select:userSelect});
 const rows=reportRows(data,files,new Map(people.map(p=>[p.id,workUserName(p)])),config);if(rows.length>ROW_LIMIT)fail(422,'Более 10 000 строк. Уточните фильтр.');if(Buffer.byteLength(JSON.stringify(rows),'utf8')>20*1024*1024)fail(422,'Объём данных отчёта превышает 20 МБ. Уточните фильтр.');return {config,rows,files,generatedAt:new Date().toISOString()};
}
export async function reportOptions(event:H3Event,archived:boolean){await uptsActor(event);const data=await snapshot(event,{archived:archived?'1':'0'});const objects=data.projects.flatMap(p=>p.upts.contracts),ids=objects.map(o=>o.id);
 const authors=await prisma.workProjectFile.findMany({where:{contractId:{in:ids},scope:'SHARED',deletedAt:null},distinct:['ownerId'],select:{owner:{select:userSelect}}});const people=new Map<number,string>();for(const t of data.tasks)if(t.assignee)people.set(t.assignee.id,workUserName(t.assignee));for(const f of authors)people.set(f.owner.id,workUserName(f.owner));const extra=await prisma.user.findMany({where:{id:{in:objects.flatMap(o=>[o.objectDetails?.curatorId,o.objectDetails?.engineerId]).filter((id):id is number=>!!id)}},select:userSelect});for(const p of extra)people.set(p.id,workUserName(p));
 return {objects:objects.map(o=>({id:o.id,name:o.number+' · '+o.name})),people:[...people].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,'ru')),documentTypes:[...new Set(objects.flatMap(o=>o.documentTypes||[]))].sort((a,b)=>a.localeCompare(b,'ru'))};
}
export async function previewReport(event:H3Event,raw:unknown,page=1){const s=await selection(event,raw);const a=await uptsActor(event);await audit(event,a.id,'REPORT_PREVIEW',`УПТС: просмотр выборки «${s.config.name}», строк ${s.rows.length}`,{page});return reportResult(s.rows,s.config,s.generatedAt,page);}
function view(j:Job):ReportJobView{return {id:j.id,name:j.name,status:Date.parse(j.expiresAt)<=Date.now()?'EXPIRED':j.status,createdAt:j.createdAt,expiresAt:j.expiresAt,rows:j.totalRows,processed:j.processed,documents:j.documents,attachments:j.attachments,error:j.error,config:j.config};}
async function jobs(){await root();const out:Job[]=[];for(const id of await readdir(path.join(ROOT,'jobs')))if(/^[a-f0-9]{64}$/.test(id)){const j=await read<Job>(path.join(jobPath(id),'job.json')).catch(()=>null);if(j)out.push(j);}return out;}
const saveJob=(j:Job)=>writeJson(path.join(jobPath(j.id),'job.json'),j);
async function authorized(event:H3Event,id:string,allowExpired=false){const a=await uptsActor(event);const j=await read<Job>(path.join(jobPath(id),'job.json')).catch(()=>null);if(!j||j.ownerId!==a.id)fail(404,'Отчёт не найден.');if(!allowExpired&&Date.parse(j.expiresAt)<=Date.now())fail(410,'Срок хранения истёк. Сформируйте отчёт повторно.');
 const available=await prisma.uptsContract.count({where:{id:{in:j.objectIds},deletedAt:null,project:{project:projectWhere(a)}}});if(available!==j.objectIds.length)fail(403,'Доступ к объектам изменился. Сформируйте новый отчёт.');
 const ids=j.files.map(f=>f.id);if(ids.length){const current=await prisma.workProjectFile.findMany({where:{id:{in:ids},scope:'SHARED',deletedAt:null,contractId:{in:j.objectIds},OR:[{taskId:null},{task:{deletedAt:null}}]},select:{id:true,sha256:true,size:true}});const byId=new Map(current.map(f=>[f.id,f]));if(j.files.some(f=>{const n=byId.get(f.id);return !n||n.sha256!==f.sha256||n.size!==f.size}))fail(409,'Документы изменены или удалены. Сформируйте новый отчёт.');}return j;
}
const runInput=z.object({config:reportSchema,attachments:z.boolean(),requestId:z.string().uuid()}).strict();
export async function createReportJob(event:H3Event,raw:unknown){const a=await uptsActor(event),v=runInput.safeParse(raw);if(!v.success)fail(400,'Проверьте параметры отчёта.');if(v.data.attachments&&v.data.config.source!=='documents')fail(400,'Документы можно приложить к реестру документов.');const id=createHash('sha256').update(`upts-report:${a.id}:${v.data.requestId}`).digest('hex');await root();const unlock=await acquireLock('upts-report-owner-'+a.id);if(!unlock)fail(409,'Запрос уже обрабатывается.');try{
 const old=await read<Job>(path.join(jobPath(id),'job.json')).catch(()=>null);if(old)return view(await authorized(event,id));const recent=(await jobs()).filter(j=>j.ownerId===a.id&&Date.parse(j.expiresAt)>Date.now());if(recent.some(j=>['QUEUED','RUNNING'].includes(j.status)))fail(409,'Дождитесь завершения предыдущего отчёта.');if(recent.length>=30)fail(429,'Достигнут лимит 30 отчётов в сутки.');
 const s=await selection(event,v.data.config),fileIds=new Set(s.rows.flatMap(r=>r.fileId?[r.fileId]:[])),files=s.files.filter(f=>fileIds.has(f.id));if(v.data.attachments&&files.length>DOC_LIMIT)fail(422,'В ZIP допускается не более 500 документов. Уточните фильтр.');
 const j:Job={id,ownerId:a.id,notificationId:randomUUID(),name:s.config.name,config:s.config,status:'QUEUED',createdAt:s.generatedAt,expiresAt:new Date(Date.now()+86400000).toISOString(),totalRows:s.rows.length,data:s.rows,files,objectIds:[...new Set(s.rows.map(r=>r.objectId))],processed:0,documents:files.length,attachments:v.data.attachments};await mkdir(jobPath(id),{mode:0o700});await saveJob(j);await audit(event,a.id,'REPORT_CREATE',`УПТС: формирование «${j.name}», строк ${j.data.length}`,{reportId:id,config:j.config,attachments:j.attachments});return view(j);
 }finally{await unlock();}}
export async function listReportJobs(event:H3Event){const a=await uptsActor(event),out:ReportJobView[]=[];for(const j of (await jobs()).filter(j=>j.ownerId===a.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30)){try{out.push(view(await authorized(event,j.id,true)));}catch(e:any){if(![403,404,409].includes(e.statusCode))throw e;}}return out;}
export async function getReportJob(event:H3Event,id:string){return view(await authorized(event,id));}
export async function getReportResult(event:H3Event,id:string,page:number){const j=await authorized(event,id);if(j.status!=='READY')fail(409,'Отчёт ещё не готов.');await audit(event,j.ownerId,'REPORT_VIEW',`УПТС: просмотр «${j.name}»`,{reportId:id,page});return reportResult(j.data,j.config,j.createdAt,page);}
export async function cancelReport(event:H3Event,id:string){const j=await authorized(event,id);if(['QUEUED','RUNNING'].includes(j.status)){await writeJson(path.join(jobPath(id),'cancel'),true);await audit(event,j.ownerId,'REPORT_CANCEL',`УПТС: отменено формирование «${j.name}»`,{reportId:id});}return {ok:true};}
async function cancelled(j:Job){return stat(path.join(jobPath(j.id),'cancel')).then(()=>true,()=>false);}
export async function reportWorkbook(j:Pick<Job,'data'|'config'|'createdAt'|'name'|'files'>,links=new Map<string,string>()){
 const book=new ExcelJS.Workbook();book.creator='Space · УПТС';book.created=new Date(j.createdAt);
 const result=reportResult(j.data,j.config,j.createdAt);const cols=j.config.columns.map(key=>REPORT_COLUMNS[j.config.source].find(c=>c.key===key)!);
 function sheet(name:string,headers:string[]){const s=book.addWorksheet(name,{views:[{state:'frozen',ySplit:1}]});s.columns=headers.map(h=>({header:h,width:h.length>22?36:25}));return s;}
 const s=sheet('Отчёт',j.config.mode==='summary'?['Группа','Строк','Работ (без отменённых)','Выполнено','Просрочено','Готовность, %']:['Группа',...cols.map(c=>c.label)]);
 if(j.config.mode==='summary')for(const g of result.groups)s.addRow([g.name,g.count,g.workCount,g.done,g.overdue,g.percent??'']);
 else for(const r of j.data){const row=s.addRow([r.group,...cols.map(c=>c.key==='name'&&r.fileId&&links.has(r.fileId)?{text:String(r.values[c.key]),hyperlink:links.get(r.fileId)!}:r.values[c.key]??'')]);if(r.fileId&&links.has(r.fileId)){const index=cols.findIndex(c=>c.key==='name');if(index>=0)row.getCell(index+2).font={color:{argb:'FF0563C1'},underline:true};}}
 const totals=sheet('Итоги',['Группа','Строк','Работ (без отменённых)','Выполнено','Просрочено','Готовность, %']);for(const g of result.groups)totals.addRow([g.name,g.count,g.workCount,g.done,g.overdue,g.percent??'']);
 const param=sheet('Параметры',['Параметр','Значение']);param.addRows([['Название',j.name],['Сформирован (МСК)',reportDate(j.createdAt,true)],['Строка отчёта',REPORT_SOURCES[j.config.source]],['Объектов',result.objectCount],['Поле периода',REPORT_DATES[j.config.source].find(d=>d.key===j.config.filters.dateField)?.label],['С',reportDate(j.config.filters.from)],['По',reportDate(j.config.filters.to)],['Область','Только доступные пользователю объекты. Только общие документы; корзина исключена.'],['Готовность','Выполненные / все работы без отменённых. Несколько документов не увеличивают количество работ.'],['Просрочка','По сроку работы, не по сроку этапа. Выполненные и отменённые работы исключены.'],['Единицы','Площадь — кв. м; протяжённость — км. Не суммируются между собой.'],...Object.entries(j.config.filters).filter(([k])=>!['from','to','dateField'].includes(k)).map(([k,v])=>[({projectId:'Проект (ID)',objectId:'Объект (ID)',employeeId:'Сотрудник (ID)',kind:'Ключ вида работ',status:'Код состояния',documentType:'Тип документа',q:'Поиск',archived:'Архив'} as Record<string,string>)[k]||k,v===null?'Все':String(v)])]);
 if(links.size){const docs=sheet('Документы',['Объект','Тип документа','Документ','Путь в архиве']);for(const r of j.data)if(r.fileId&&links.has(r.fileId)){const row=docs.addRow([r.values.object,r.values.documentType,{text:String(r.values.name),hyperlink:links.get(r.fileId)!},links.get(r.fileId)]);row.getCell(3).font={color:{argb:'FF0563C1'},underline:true};}const help=sheet('Как открыть',['Инструкция']);help.getColumn(1).width=110;for(const text of EXPORT_OPEN_INSTRUCTIONS)help.addRow([text]);}
 for(const ws of book.worksheets){ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF33526E'}};ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:ws.columnCount}};ws.eachRow(r=>{r.alignment={vertical:'top',wrapText:true};});}
 return Buffer.from(await book.xlsx.writeBuffer());
}
async function buildReport(j:Job){j.status='RUNNING';j.processed=0;j.error=undefined;await saveJob(j);const dir=jobPath(j.id),check=async()=>{if(await cancelled(j))throw Error('Формирование отменено.');};await check();
 const workbook=await reportWorkbook(j);const handle=await open(path.join(dir,'report.partial'),'w',0o600);try{await handle.writeFile(workbook);}finally{await handle.close();}await check();await rename(path.join(dir,'report.partial'),path.join(dir,'report.xlsx'));
 if(j.attachments){const bytes=j.files.reduce((n,f)=>n+f.size,0),disk=await statfs(dir);if(disk.bavail*disk.bsize<bytes+Math.max(0,...j.files.map(f=>f.size))+64*1024**2)throw Error('Недостаточно свободного места для ZIP.');
  const folder='UPTS-report-'+j.createdAt.slice(0,10).replaceAll('-','')+'-'+j.id.slice(0,6),links=new Map(j.files.map((f,i)=>[f.id,exportDocumentPath({contractId:f.contractId!,number:j.data.find(r=>r.fileId===f.id)?.values.object as string||'',type:f.documentType||'Иное',name:f.name},i)]));
  const output=createWriteStream(path.join(dir,'archive.partial'),{mode:0o600}),zip=archiver('zip',{store:true,forceZip64:true}),done=finished(output);void done.catch(()=>{});zip.on('error',(e:Error)=>output.destroy(e));zip.on('warning',(e:Error)=>{output.destroy(e);zip.abort();});output.on('error',()=>zip.abort());zip.pipe(output);
  async function append(source:Buffer|ReturnType<typeof createReadStream>,name:string){const entry=once(zip,'entry');zip.append(source,{name:folder+'/'+name});await Promise.race([entry,done.then(()=>{throw Error('Архив закрылся до завершения.');})]);}
  try{for(const f of j.files){await check();const current=await prisma.workProjectFile.findFirst({where:{id:f.id,contractId:f.contractId,scope:'SHARED',deletedAt:null,OR:[{taskId:null},{task:{deletedAt:null}}]}});if(!current||current.sha256!==f.sha256||current.size!==f.size)throw Error('Документ изменён или удалён. Сформируйте отчёт повторно.');const source=await openProjectFile(current);let copy;const temp=path.join(dir,'document.tmp');try{copy=await open(temp,'w',0o600);const hash=createHash('sha256');let size=0;for await(const chunk of source.createReadStream({autoClose:false})){await check();const b=Buffer.from(chunk);hash.update(b);size+=b.length;let at=0;while(at<b.length)at+=(await copy.write(b,at,b.length-at)).bytesWritten;}await copy.sync();if(size!==f.size||hash.digest('hex')!==f.sha256)throw Error('Не пройдена проверка целостности документа.');}finally{await source.close();await copy?.close();}const stream=createReadStream(temp);stream.on('error',e=>zip.emit('error',e));try{await append(stream,links.get(f.id)!);}finally{stream.destroy();}await rm(temp,{force:true});j.processed++;await saveJob(j);}
   await append(await reportWorkbook(j,links),'Реестр.xlsx');await append(Buffer.from('\ufeff'+EXPORT_OPEN_INSTRUCTIONS.join('\r\n')),'Прочитайте.txt');await check();await zip.finalize();await done;await rename(path.join(dir,'archive.partial'),path.join(dir,'archive.zip'));
  }catch(e){zip.abort();output.destroy();await done.catch(()=>{});throw e;}finally{await rm(path.join(dir,'document.tmp'),{force:true});}
 }
 await check();j.status='READY';await saveJob(j);await audit(undefined,j.ownerId,'REPORT_READY',`УПТС: готов отчёт «${j.name}»`,{reportId:j.id});
}
async function reportReadyNotification(j:Job){
 if(j.notified)return;
 const user=await prisma.user.findFirst({where:{id:j.ownerId,status:'ACTIVE',deletedAt:null},select:{id:true}});if(!user)return;
 const conversationId=await prisma.$transaction(async tx=>{
  const key=`upts:self:${j.ownerId}`;
  const c=await tx.chatConversation.upsert({where:{pairKey:key},create:{pairKey:key,kind:'GROUP',name:'УПТС · Уведомления'},update:{}});
  if(c.archivedAt)return null;
  await tx.chatMember.createMany({data:[{conversationId:c.id,userId:j.ownerId}],skipDuplicates:true});
  const old=await tx.chatMessage.findUnique({where:{senderId_clientId:{senderId:j.ownerId,clientId:j.notificationId}}});
  if(!old){await tx.chatMessage.create({data:{senderId:j.ownerId,conversationId:c.id,clientId:j.notificationId,body:`[Space · УПТС, автоматически]\nОтчёт «${j.name}» готов. Результат доступен до ${reportDate(j.expiresAt,true)} МСК.\n/departments/upts?reports=1&reportId=${j.id}`}});await tx.chatConversation.update({where:{id:c.id},data:{updatedAt:new Date(),messageVersion:{increment:1}}});}
  return c.id;
 });
 if(conversationId){j.notified=true;await saveJob(j);await notifyDialog(conversationId);}
}
export async function runReports(){const unlock=await acquireLock('upts-report-worker');if(!unlock)return;try{for(const j of (await jobs()).sort((a,b)=>a.createdAt.localeCompare(b.createdAt))){if(Date.parse(j.expiresAt)<=Date.now()){if(j.status!=='EXPIRED'){j.status='EXPIRED';j.data=[];j.files=[];await saveJob(j);for(const f of ['report.xlsx','archive.zip','report.partial','archive.partial','document.tmp'])await rm(path.join(jobPath(j.id),f),{force:true});}if(Date.now()-Date.parse(j.expiresAt)>29*86400000)await rm(jobPath(j.id),{force:true,recursive:true});continue;}if(await cancelled(j)){if(j.status!=='CANCELLED'){j.status='CANCELLED';await saveJob(j);for(const f of ['report.xlsx','archive.zip'])await rm(path.join(jobPath(j.id),f),{force:true});}continue;}if(j.status==='READY'&&!j.notified){try{await reportReadyNotification(j);}catch{console.warn('[upts-reports] notification will retry');}}if(!['QUEUED','RUNNING'].includes(j.status))continue;
 try{await buildReport(j);try{await reportReadyNotification(j);}catch{console.warn('[upts-reports] notification will retry');}}catch(e){j.status=await cancelled(j)?'CANCELLED':'FAILED';j.error=e instanceof Error?e.message:'Не удалось сформировать отчёт.';await saveJob(j);for(const f of ['report.xlsx','archive.zip','report.partial','archive.partial','document.tmp'])await rm(path.join(jobPath(j.id),f),{force:true});await audit(undefined,j.ownerId,'REPORT_FAILED',`УПТС: ошибка формирования «${j.name}»`,{reportId:j.id},'FAILED');}break;
 }}finally{await unlock();}}
export async function downloadReport(event:H3Event,id:string,zip:boolean){const j=await authorized(event,id);if(j.status!=='READY'||await cancelled(j))fail(409,'Отчёт не готов.');if(zip&&!j.attachments)fail(400,'Документы не включены в этот отчёт.');const file=path.join(jobPath(id),zip?'archive.zip':'report.xlsx');const info=await stat(file);await audit(event,j.ownerId,'REPORT_DOWNLOAD',`УПТС: скачан ${zip?'ZIP':'Excel'} «${j.name}»`,{reportId:id});setHeader(event,'Content-Type',zip?'application/zip':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');setHeader(event,'Content-Disposition',`attachment; filename="Space-UPTS-report-${j.createdAt.slice(0,10)}.${zip?'zip':'xlsx'}"`);setHeader(event,'Content-Length',info.size);setHeader(event,'Cache-Control','private, no-store');setHeader(event,'X-Content-Type-Options','nosniff');return sendStream(event,createReadStream(file));}
