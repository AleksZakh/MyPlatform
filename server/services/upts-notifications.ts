import nodemailer from 'nodemailer';
import {prisma} from '../utils/prisma';
import {notifyDialog} from './chat/notify';
import {pairKey} from './chat/validation';
// Durable outbox: transaction writes intent; this worker retries delivery independently.
export async function deliverUptsNotifications(){
 const now=new Date();
 const jobs=await prisma.uptsNotification.findMany({where:{nextAttemptAt:{lte:now},AND:[{OR:[{lockedUntil:null},{lockedUntil:{lt:now}}]},{OR:[{chatSentAt:null},{emailSentAt:null}]}]},orderBy:{createdAt:'asc'},take:20});
 for(const candidate of jobs){
  const lease=await prisma.uptsNotification.updateMany({where:{id:candidate.id,nextAttemptAt:{lte:new Date()},AND:[{OR:[{lockedUntil:null},{lockedUntil:{lt:new Date()}}]},{OR:[{chatSentAt:null},{emailSentAt:null}]}]},data:{lockedUntil:new Date(Date.now()+120000),attempts:{increment:1}}});if(!lease.count)continue;
  const job=await prisma.uptsNotification.findUniqueOrThrow({where:{id:candidate.id}});
  let error='';
  const recipient=await prisma.user.findUnique({where:{id:job.recipientId},select:{email:true,status:true,deletedAt:true}});
  const task=await prisma.workTask.findUnique({where:{id:job.taskId},include:{uptsContract:true}});
  if(!recipient||recipient.status!=='ACTIVE'||recipient.deletedAt||!task||task.deletedAt||task.uptsContract?.deletedAt||task.assigneeId!==job.recipientId){await prisma.uptsNotification.update({where:{id:job.id},data:{lockedUntil:null,nextAttemptAt:new Date(Date.now()+86400000),lastError:'Получатель или объект недоступен. Доставка отложена.'}});continue;}
  const urlPath=`/departments/upts?contractId=${task.uptsContractId}`;
  if(!job.chatSentAt)try{
   const conversationId=await prisma.$transaction(async tx=>{
    const key=job.actorId===job.recipientId?`upts:self:${job.recipientId}`:pairKey(job.actorId,job.recipientId);
    const c=await tx.chatConversation.upsert({where:{pairKey:key},create:{pairKey:key,kind:job.actorId===job.recipientId?'GROUP':'DIRECT',name:job.actorId===job.recipientId?'УПТС · Уведомления':null},update:{}});
    if(c.archivedAt)throw Error('Диалог в архиве');
    await tx.chatMember.createMany({data:[...new Set([job.actorId,job.recipientId])].map(userId=>({conversationId:c.id,userId})),skipDuplicates:true});
    await tx.chatMessage.upsert({where:{senderId_clientId:{senderId:job.actorId,clientId:job.id}},create:{senderId:job.actorId,conversationId:c.id,clientId:job.id,body:`[Space · УПТС, автоматически]\n${job.body}\n${urlPath}`},update:{}});
    await tx.chatConversation.update({where:{id:c.id},data:{updatedAt:new Date(),messageVersion:{increment:1}}});
    await tx.uptsNotification.update({where:{id:job.id},data:{chatSentAt:new Date()}});return c.id;
   });await notifyDialog(conversationId);
  }catch{error='Не удалось доставить уведомление в чат.';}
  if(!job.emailSentAt)try{
   if(!recipient.email)throw Error('Нет адреса email');
   const cfg=useRuntimeConfig(),smtp=cfg.smtp;
   if(!smtp?.host||!smtp.from)throw Error('SMTP не настроен');
   const site=new URL(String(cfg.siteUrl));if(!['http:','https:'].includes(site.protocol))throw Error('Неверный адрес Space');
   const transport=nodemailer.createTransport({host:String(smtp.host),port:Number(smtp.port||587),secure:smtp.secure===true||String(smtp.secure)==='true',connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,...(smtp.user&&smtp.password?{auth:{user:String(smtp.user),pass:String(smtp.password)}}:{})});
   try{const sent=await transport.sendMail({from:String(smtp.from),to:recipient.email,subject:'Space · УПТС: работа по объекту',messageId:`<upts-${job.id}@${site.hostname}>`,text:job.body+'\n\n'+new URL(urlPath,site).href});if(!sent.accepted?.length)throw Error('SMTP отклонил получателя');}finally{transport.close();}
   await prisma.uptsNotification.update({where:{id:job.id},data:{emailSentAt:new Date()}});
  }catch{error+=(error?' ':'')+'Не удалось отправить email. Проверьте адрес сотрудника и настройки SMTP.';}
  await prisma.uptsNotification.update({where:{id:job.id},data:{lockedUntil:null,lastError:error||null,nextAttemptAt:new Date(Date.now()+Math.min(3600000,30000*2**Math.min(job.attempts,7)))}});
 }
}
