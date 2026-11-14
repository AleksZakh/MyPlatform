import {prisma} from '../../utils/prisma';
import {sendDiagnosticTripMail} from '../../utils/diagnostic-trip-mail';
import {tripToday} from '../../../shared/utils/diagnostic-trip-lifecycle';
let running=false;
export async function processTripEmails(){
 if(running)return;running=true;
 try{
  // SMTP outcome after a process crash cannot be established: never blindly resend.
  await prisma.diagnosticTripEmail.updateMany({where:{status:'SENDING',updatedAt:{lt:new Date(Date.now()-10*60000)}},data:{status:'UNKNOWN',lastError:'Отправка прервана. Проверьте почтовый сервер перед повтором.'}});
  const pending=await prisma.diagnosticTripEmail.findMany({where:{status:'PENDING'},orderBy:{id:'asc'},take:10});
  for(const job of pending){
   const claimed=await prisma.diagnosticTripEmail.updateMany({where:{id:job.id,status:'PENDING'},data:{status:'SENDING',attempts:{increment:1},lastError:null}});if(!claimed.count)continue;
   const [trip,user]=await Promise.all([prisma.diagnosticTrip.findUnique({where:{id:job.tripId},select:{deletedAt:true,status:true,contentKey:true,finish:true}}),prisma.user.findUnique({where:{id:job.userId},select:{deletedAt:true}})]);
   if(!trip||trip.deletedAt||trip.status!=='PLANNED'||trip.contentKey!==job.contentKey||trip.finish.toISOString().slice(0,10)<tripToday()||!user||user.deletedAt){await prisma.diagnosticTripEmail.updateMany({where:{id:job.id,status:'SENDING'},data:{status:'CANCELLED',lastError:'Поездка или получатель больше не актуальны.'}});continue;}
   if(!job.email){await prisma.diagnosticTripEmail.updateMany({where:{id:job.id,status:'SENDING'},data:{status:'FAILED',lastError:'У сотрудника не указан email.'}});continue;}
   let messageId:string;
   try{messageId=await sendDiagnosticTripMail({...job,email:job.email});}catch(e:any){await prisma.diagnosticTripEmail.updateMany({where:{id:job.id,status:'SENDING'},data:{status:'FAILED',lastError:e?.code==='SMTP_NOT_CONFIGURED'?'SMTP не настроен. Проверьте настройки почты Space.':'Почтовый сервер не подтвердил отправку. Проверьте журнал SMTP перед повтором.'}});continue;}
   // A DB failure after SMTP acceptance leaves SENDING -> UNKNOWN; no automatic duplicate.
   await prisma.diagnosticTripEmail.updateMany({where:{id:job.id,status:'SENDING'},data:{status:'SENT',sentAt:new Date(),messageId,lastError:null}});
  }
 }finally{running=false;}
}
