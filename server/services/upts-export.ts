import path from 'node:path';
import {exportFolder,exportDocumentPath,EXPORT_OPEN_INSTRUCTIONS} from './upts-export-layout';
import {createHash} from 'node:crypto';
import {mkdir,readFile,rm,stat,statfs,rename,open,lstat,realpath,readdir} from 'node:fs/promises';
import {createWriteStream,createReadStream} from 'node:fs';
import {finished} from 'node:stream/promises';
import {once} from 'node:events';
import ExcelJS from 'exceljs';
import archiver from 'archiver';
import {z} from 'zod';
import {createError,getQuery,setHeader,sendStream,type H3Event} from 'h3';
import {prisma} from '../utils/prisma';
import {writeAuditEvent} from '../utils/auditLog';
import {snapshot} from './upts';
import {uptsActor} from './upts-access';
import {projectWhere} from './work/policy';
import {openProjectFile} from './work/file-storage';
import {parse} from './work/input';
import {EXPORT_ROOT,ensureExportRoot,acquireLock,writeJson} from './lab-export-store';
import type {UptsExportView,UptsExportPreview} from '../../shared/types/upts-export';

const ROOT=path.join(EXPORT_ROOT,'upts');
const LIMIT=500;
type ExportFile={id:string;contractId:number;name:string;type:string;size:number;sha256:string;object:string;number:string;cadastral:string;createdAt:string;documentDate:string|null;comment:string;entry:string};
type Job=UptsExportView&{ownerId:number;files:ExportFile[];contractIds:number[]};
function fail(code:number,message:string):never{throw createError({statusCode:code,message});}
function directory(id:string){if(!/^[a-f0-9]{64}$/.test(id))fail(404,'Выгрузка не найдена.');return path.join(ROOT,id);}
async function root(){await ensureExportRoot();await mkdir(ROOT,{recursive:true,mode:0o700});if((await lstat(ROOT)).isSymbolicLink()||await realpath(ROOT)!==path.join(await realpath(EXPORT_ROOT),'upts'))throw Error('Unsafe export root');}
function view(j:Job):UptsExportView{const {ownerId,files,contractIds,...v}=j;return v;}
async function save(j:Job){await writeJson(path.join(directory(j.id),'job.json'),j);}
async function read(id:string):Promise<Job>{try{return JSON.parse(await readFile(path.join(directory(id),'job.json'),'utf8'))}catch{return fail(404,'Выгрузка не найдена.')}}
async function cancelled(id:string){return stat(path.join(directory(id),'cancel')).then(()=>true,()=>false);}
async function audit(event:H3Event|undefined,ownerId:number,id:string,action:string,note:string,result:'SUCCESS'|'FAILED'='SUCCESS'){
 const data={actorUserId:ownerId,category:'DATA' as const,result,resourceKey:'upts.exports',entityType:'UptsExport',action,note,afterData:{exportId:id}};
 if(event)await writeAuditEvent({event,...data});else await prisma.auditLog.create({data:{...data,actorEmail:'user:'+ownerId}});
}
async function selection(event:H3Event){
 const data=await snapshot(event),objects=data.projects.flatMap(p=>p.upts.contracts),byId=new Map(objects.map(c=>[c.id,c]));
 const type=String(getQuery(event).documentType||'').slice(0,100);
 const where={contractId:{in:objects.map(c=>c.id)},scope:'SHARED',deletedAt:null,...(type?{OR:type==='Иное'?[{documentType:type},{documentType:null}]:[{documentType:type}]}:{})};
 return {objects,byId,where};
}
export async function previewUptsExport(event:H3Event):Promise<UptsExportPreview>{
 const {objects,where}=await selection(event);
 const types=await prisma.workProjectFile.groupBy({by:['documentType'],where,_count:{_all:true},_sum:{size:true}});
 const merged=new Map<string,number>();let bytes=0,documents=0;
 for(const t of types){const name=t.documentType||'Иное';merged.set(name,(merged.get(name)||0)+t._count._all);documents+=t._count._all;bytes+=t._sum.size||0;}
 return {objects:objects.length,documents,bytes,limit:LIMIT,types:[...merged].map(([name,count])=>({name,count})).sort((a,b)=>a.name.localeCompare(b.name,'ru'))};
}
const options=z.object({registry:z.boolean(),types:z.array(z.string().min(1).max(100)).max(100),requestId:z.string().uuid()}).strict().refine(v=>v.registry||v.types.length>0,'Выберите содержимое выгрузки.');
export async function prepareUptsExport(event:H3Event,raw:unknown){
 const a=await uptsActor(event),v=parse(options,raw),id=createHash('sha256').update(`upts:${a.id}:${v.requestId}`).digest('hex');
 const release=await acquireLock('upts-owner-'+a.id);if(!release)fail(409,'Предыдущий запрос ещё обрабатывается.');
 try{
  await root();const existing=await read(id).catch(()=>null);if(existing)return view(await authorized(event,id));
  const active=await jobs();if(active.filter(j=>j.ownerId===a.id&&j.status==='PREPARED'&&Date.parse(j.expiresAt)>Date.now()).length>=10)fail(429,'Слишком много подготовленных выгрузок. Отмените ненужные.');
  if(active.some(j=>j.ownerId===a.id&&['QUEUED','RUNNING'].includes(j.status)&&Date.parse(j.expiresAt)>Date.now()))fail(409,'Дождитесь завершения текущей выгрузки.');
  const {objects,byId,where}=await selection(event);
  const rows=await prisma.workProjectFile.findMany({where:{...where,...(v.types.length?{AND:[{OR:v.types.includes('Иное')?[{documentType:{in:v.types}},{documentType:null}]:[{documentType:{in:v.types}}]}]}:{})},orderBy:[{contractId:'asc'},{documentType:'asc'},{createdAt:'asc'},{id:'asc'}],take:LIMIT+1});
  if(rows.length>LIMIT)fail(422,`Более ${LIMIT} документов. Уточните фильтры или сократите список типов.`);
  if(!rows.length)fail(422,'В выборке нет документов.');
  if(v.types.some(t=>!rows.some(f=>(f.documentType||'Иное')===t)))fail(409,'Состав документов изменился. Обновите настройки выгрузки.');
  const files:ExportFile[]=rows.map(f=>{const c=byId.get(f.contractId!)!;return {id:f.id,contractId:c.id,name:f.name,type:f.documentType||'Иное',size:f.size,sha256:f.sha256,object:c.name,number:c.number,cadastral:c.objectDetails?.sourceCadastralNumber||'',createdAt:f.createdAt.toISOString(),documentDate:f.documentDate?.toISOString()||null,comment:f.documentComment||'',entry:''};});
  files.sort((a,b)=>a.contractId-b.contractId||a.type.localeCompare(b.type,'ru')||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));
  files.forEach((f,i)=>{f.entry=exportDocumentPath(f,i)});
  const now=new Date(),j:Job={id,ownerId:a.id,status:'PREPARED',createdAt:now.toISOString(),expiresAt:new Date(+now+86400000).toISOString(),objects:new Set(files.map(f=>f.contractId)).size,documents:files.length,bytes:v.types.length?files.reduce((n,f)=>n+f.size,0):0,processed:0,registry:v.registry,types:[...new Set(v.types)],files,contractIds:[...new Set(files.map(f=>f.contractId))]};
  await mkdir(directory(id),{recursive:true,mode:0o700});await save(j);await audit(event,a.id,id,'EXPORT_PREPARE',`УПТС: подготовлена выгрузка, объектов ${j.objects}, документов ${j.documents}`);return view(j);
 }finally{await release();}
}
async function jobs(){await root();const out:Job[]=[];for(const id of await readdir(ROOT)){if(/^[a-f0-9]{64}$/.test(id)){const j=await read(id).catch(()=>null);if(j)out.push(j);}}return out;}
async function authorized(event:H3Event,id:string){
 const a=await uptsActor(event),j=await read(id);if(j.ownerId!==a.id)fail(404,'Выгрузка не найдена.');if(Date.parse(j.expiresAt)<=Date.now())fail(410,'Срок хранения выгрузки истёк.');
 const available=await prisma.uptsContract.count({where:{id:{in:j.contractIds},deletedAt:null,project:{project:projectWhere(a)}}});
 if(available!==j.contractIds.length)fail(403,'Доступ к объектам изменился. Создайте новую выгрузку.');
 const count=await prisma.workProjectFile.count({where:{id:{in:j.files.map(f=>f.id)},contractId:{in:j.contractIds},scope:'SHARED',deletedAt:null}});
 if(count!==j.files.length)fail(409,'Состав документов изменился. Создайте новую выгрузку.');
 return j;
}
export async function getUptsExport(event:H3Event,id:string){return view(await authorized(event,id));}
export async function listUptsExports(event:H3Event){const a=await uptsActor(event),out:UptsExportView[]=[];for(const j of (await jobs()).filter(j=>j.ownerId===a.id&&Date.parse(j.expiresAt)>Date.now()).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,10)){try{out.push(view(await authorized(event,j.id)));}catch(e:any){if(![403,404,409].includes(e.statusCode))throw e;}}return out;}
export async function confirmUptsExport(event:H3Event,id:string){
 directory(id);const lock=await acquireLock('upts-job-'+id);if(!lock)fail(409,'Выгрузка обрабатывается.');try{const j=await authorized(event,id);if(j.status==='PREPARED'){if(await cancelled(id))fail(409,'Выгрузка отменена.');j.status='QUEUED';await save(j);await audit(event,j.ownerId,id,'EXPORT_CONFIRM','УПТС: подтверждена сборка ZIP');}return view(j);}finally{await lock();}
}
export async function cancelUptsExport(event:H3Event,id:string){const j=await authorized(event,id);await writeJson(path.join(directory(id),'cancel'),true);await audit(event,j.ownerId,id,'EXPORT_CANCEL','УПТС: отменена выгрузка');return {ok:true};}
function date(s:string|null,time=false){return s?new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',day:'2-digit',month:'2-digit',year:'numeric',...(time?{hour:'2-digit',minute:'2-digit',second:'2-digit'}:{})}).format(new Date(s)):'';}
export async function buildUptsArchive(j:Job){
 const dir=directory(j.id),folder=exportFolder(j.createdAt,j.id);
 // Recalculate paths for queued jobs prepared by an earlier release too.
 j.files.forEach((f,i)=>{f.entry=exportDocumentPath(f,i)});
 j.status='RUNNING';j.processed=0;j.error=undefined;await save(j);
 const disk=await statfs(ROOT),largest=Math.max(0,...j.files.map(f=>f.size));if(disk.bavail*disk.bsize<j.bytes+largest+64*1024*1024)throw Error('Недостаточно свободного места для выгрузки.');
 const output=createWriteStream(path.join(dir,'archive.partial'),{mode:0o600});const zip=archiver('zip',{store:true,forceZip64:true});const done=finished(output);void done.catch(()=>{});let zipError:Error|null=null;
 zip.on('error',(e:Error)=>{zipError=e;output.destroy(e)});zip.on('warning',(e:Error)=>{zipError=e;output.destroy(e);zip.abort()});output.on('error',e=>{zipError=e;zip.abort()});zip.pipe(output);
 const check=async()=>{if(zipError)throw zipError;if(await cancelled(j.id))throw Error('Выгрузка отменена.');};
 try{
  for(const f of j.files){await check();
   const current=await prisma.workProjectFile.findFirst({where:{id:f.id,contractId:f.contractId,scope:'SHARED',deletedAt:null}});
   if(!current||current.sha256!==f.sha256||current.size!==f.size)throw Error(`Документ изменён или удалён: ${f.name}. Создайте новую выгрузку.`);
   if(j.types.length){
    const source=await openProjectFile(current),tmp=path.join(dir,'document.tmp');let copy;
    try{copy=await open(tmp,'w',0o600);const hash=createHash('sha256');let size=0;for await(const chunk of source.createReadStream({autoClose:false})){await check();const b=Buffer.from(chunk);hash.update(b);size+=b.length;let at=0;while(at<b.length)at+=(await copy.write(b,at,b.length-at)).bytesWritten;}await copy.sync();if(size!==f.size||hash.digest('hex')!==f.sha256)throw Error(`Не пройдена проверка целостности: ${f.name}`);}finally{await source.close();await copy?.close();}
    const entry=once(zip,'entry'),stream=createReadStream(tmp);stream.on('error',e=>zip.emit('error',e));zip.append(stream,{name:folder+'/'+f.entry});try{await Promise.race([entry,done.then(()=>{throw Error('Архив закрыт до завершения записи.');})]);}finally{stream.destroy();}await rm(tmp,{force:true});
   }
   j.processed++;await save(j);
  }
  if(j.registry){
   const book=new ExcelJS.Workbook();book.creator='Space УПТС';const sheet=book.addWorksheet('Реестр',{views:[{state:'frozen',ySplit:1}]});
   sheet.columns=[{header:'Объект',key:'object',width:28},{header:'Кадастровый номер',key:'cadastral',width:24},{header:'Тип документа',key:'type',width:28},{header:'Документ',key:'name',width:50},{header:'Дата документа',key:'date',width:18},{header:'Загружен (МСК)',key:'created',width:24},{header:'Размер, байт',key:'size',width:18},{header:'Комментарии',key:'comment',width:45},{header:'Файл в архиве',key:'path',width:70}];
   let group='';for(const f of j.files){const row=sheet.addRow({object:f.number||f.object,cadastral:f.cadastral,type:f.type,name:j.types.length?{text:f.name,hyperlink:f.entry}:f.name,date:date(f.documentDate),created:date(f.createdAt,true),size:f.size,comment:f.comment,path:j.types.length?f.entry:'Не включён: выгружен только реестр'});if(j.types.length)row.getCell('name').font={color:{argb:'FF0563C1'},underline:true};if(group!==`${f.contractId}:${f.type}`){row.getCell('object').font={bold:true};row.getCell('type').font={bold:true};group=`${f.contractId}:${f.type}`;}row.alignment={vertical:'top',wrapText:true};}
   sheet.getRow(1).font={bold:true};sheet.autoFilter={from:'A1',to:'I1'};const help=book.addWorksheet('Как открыть');help.getColumn(1).width=110;for(const line of EXPORT_OPEN_INSTRUCTIONS){const row=help.addRow([line]);row.alignment={wrapText:true,vertical:'top'};row.height=32;}help.getRow(1).font={bold:true,size:14};
   const entry=once(zip,'entry');zip.append(Buffer.from(await book.xlsx.writeBuffer()),{name:folder+'/Реестр.xlsx'});await Promise.race([entry,done.then(()=>{throw Error('Архив закрыт до завершения записи.');})]);
  }
  const helpEntry=once(zip,'entry');zip.append(Buffer.from('\ufeff'+EXPORT_OPEN_INSTRUCTIONS.join('\r\n'),'utf8'),{name:folder+'/Прочитайте.txt'});await Promise.race([helpEntry,done.then(()=>{throw Error('Архив закрыт до завершения записи.');})]);
  await check();await zip.finalize();await done;await rename(path.join(dir,'archive.partial'),path.join(dir,'archive.zip'));j.archiveBytes=(await stat(path.join(dir,'archive.zip'))).size;j.status='READY';await save(j);await audit(undefined,j.ownerId,j.id,'EXPORT_READY','УПТС: ZIP-архив подготовлен');
 }catch(e){zip.abort();output.destroy();await done.catch(()=>{});throw e;}finally{await rm(path.join(dir,'document.tmp'),{force:true});}
}
export async function runUptsExports(){
 const release=await acquireLock('upts-export-worker');if(!release)return;
 try{for(const j of await jobs()){
  if(Date.parse(j.expiresAt)<=Date.now()){await rm(directory(j.id),{recursive:true,force:true});continue;}
  if(await cancelled(j.id)){if(j.status!=='CANCELLED'){j.status='CANCELLED';await save(j);await rm(path.join(directory(j.id),'archive.zip'),{force:true});}continue;}
  if(!['QUEUED','RUNNING'].includes(j.status))continue;
  const lock=await acquireLock('upts-job-'+j.id);if(!lock)continue;
  try{await buildUptsArchive(j);}catch(e){j.status=await cancelled(j.id)?'CANCELLED':'FAILED';j.error=e instanceof Error?e.message:'Не удалось собрать архив.';await save(j);await rm(path.join(directory(j.id),'archive.partial'),{force:true});await audit(undefined,j.ownerId,j.id,'EXPORT_FAILED',`УПТС: ${j.error}`,'FAILED');}finally{await lock();}
  break; // At most one archive per tick.
 }}finally{await release();}
}
export async function downloadUptsExport(event:H3Event,id:string){
 const j=await authorized(event,id);if(j.status!=='READY'||await cancelled(id))fail(409,'Архив ещё не готов или отменён.');
 const file=path.join(directory(id),'archive.zip');const s=await stat(file);await audit(event,j.ownerId,id,'EXPORT_DOWNLOAD','УПТС: скачан ZIP-архив документов');
 setHeader(event,'Content-Type','application/zip');setHeader(event,'Content-Disposition',`attachment; filename="Space-UPTS-documents-${j.createdAt.slice(0,10)}.zip"`);setHeader(event,'Content-Length',s.size);setHeader(event,'Cache-Control','private, no-store');setHeader(event,'X-Content-Type-Options','nosniff');return sendStream(event,createReadStream(file));
}
