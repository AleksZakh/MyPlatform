import {Prisma} from '@prisma/client';
import {prisma} from '../../utils/prisma';
import {calendarResolver} from '../../../shared/utils/diagnostic-calendar';
import {tripDateLabel} from '../../../shared/utils/diagnostic-trips';
import {sendDiagnosticTripMail} from '../../utils/diagnostic-trip-mail';

type Work={kind:string;id:number;executor:string;finish:string|null;name:string;number:string;automatic:boolean;due:boolean;employee:number|null;assigned_version:number|null};
type Job={id:number;kind:string;work_id:number;employee:number;reason:string;token:string};
const today=Prisma.sql`(now() AT TIME ZONE 'Europe/Moscow')::date`;
const base=Prisma.sql`SELECT w.kind,w.id,w.executor,w.finish::text,w.name,w.number,w.automatic,
  w.finish BETWEEN ${today} AND ${today}+1 AS due, a.employee,a.assigned_version
  FROM odis.live_assignment w LEFT JOIN odis.assignment_owner a ON a.kind=w.kind AND a.work_id=w.id
  WHERE w.fact_finish IS NULL AND lower(trim(w.status)) IN ('planned','active','scheduled','performed','in_progress','overdue')`;
export async function processWorkMail(discover:boolean,send=sendDiagnosticTripMail){
  const pending=await prisma.$queryRaw<{id:number}[]>`SELECT id FROM odis.mail WHERE state='pending' AND available_at<=now() LIMIT 1`;
  await prisma.$executeRaw`UPDATE odis.mail SET state='unknown',detail='Отправка прервана' WHERE state='sending' AND changed_at<now()-interval '10 minutes'`;
  if(!discover && !pending.length)return;
  const users=await prisma.user.findMany({where:{deletedAt:null},select:{id:true,login:true,fullName:true,email:true,status:true,authType:true}});
  const resolve=calendarResolver(users.map(u=>({...u,name:u.fullName||u.login||String(u.id)})));
  const byId=new Map(users.map(u=>[u.id,u]));
  const recipients=(w:Work)=>w.employee!==null?[w.employee]:resolve(w.executor).ids;
  if(discover){
    let lastKind='',lastId=0;
    for(;;){
      const batch:Work[]=await prisma.$queryRaw`${base} AND NOT w.automatic AND w.finish BETWEEN ${today} AND ${today}+1
        AND (w.kind,w.id)>(${lastKind},${lastId}) ORDER BY w.kind,w.id LIMIT 250`;
      const values=batch.flatMap(w=>recipients(w).map(id=>Prisma.sql`(${w.kind},${w.id},${id},'due',${w.finish})`));
      if(values.length) await prisma.$executeRaw`INSERT INTO odis.mail(kind,work_id,employee,reason,token) VALUES ${Prisma.join(values)} ON CONFLICT DO NOTHING`;
      if(batch.length<250)break;
      const last=batch[batch.length-1]!;lastKind=last.kind;lastId=last.id;
    }
  }
  for(let i=0;i<20;i++){
    const [job]=await prisma.$queryRaw<Job[]>`UPDATE odis.mail SET state='sending',changed_at=now() WHERE id=(
      SELECT id FROM odis.mail WHERE state='pending' AND available_at<=now() ORDER BY available_at,id LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *`;
    if(!job)break;
    const [work]=await prisma.$queryRaw<Work[]>`${base} AND w.kind=${job.kind} AND w.id=${job.work_id}`;
    const user=byId.get(job.employee);
    let state='cancelled',detail='';
    if(work && user && (user.status==='ACTIVE'||user.authType==='DOMAIN'&&user.status==='PENDING_ACTIVATION') && recipients(work).includes(job.employee) &&
      (job.reason==='assigned'?String(work.assigned_version)===job.token:!work.automatic && work.due && work.finish===job.token)){
      if(!user.email){state='pending';detail='Не указан адрес сотрудника';}
      else {
        const reason=job.reason==='assigned'?'Назначена работа':'Подходит срок работы';
        try{detail=await send({id:job.id,source:'work',email:user.email,subject:reason+' · '+work.name,
          body:[reason,work.name,'Договор: '+work.number,'Окончание: '+tripDateLabel(work.finish),'Space → Диагностика → Планы и отчёты'].join('\n')});state='sent';}
        catch(e:any){state=['SMTP_NOT_CONFIGURED','EAUTH','EDNS','ECONNECTION','ECONNREFUSED'].includes(e?.code)||Number(e?.responseCode)>=400?'pending':'unknown';detail=e?.code==='SMTP_NOT_CONFIGURED'?'SMTP не настроен':'Проверьте подтверждение SMTP';}
      }
    }
    await prisma.$executeRaw`UPDATE odis.mail SET state=${state},detail=${detail},changed_at=now(),available_at=now()+interval '30 minutes' WHERE id=${job.id} AND state='sending'`;
  }
}
