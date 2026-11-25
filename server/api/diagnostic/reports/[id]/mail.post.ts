import nodemailer from 'nodemailer';
import {reportAction} from '../../../../services/diagnostic/reports/access';
import {reportAttachment} from '../../../../services/diagnostic/reports/archive';
import {reportRecipients} from '../../../../services/diagnostic/reports/recipients';
export default defineEventHandler(async event=>{
  await reportAction(event);
  const body=await readBody(event),ids:unknown=body?.recipientIds;
  if(!Array.isArray(ids)||!ids.length||!ids.every(Number.isSafeInteger))throw createError({statusCode:400,message:'Выберите получателей отчёта.'});
  const people=await reportRecipients(event);
  const selected=people.filter(p=>ids.includes(p.id));
  if(selected.length!==new Set(ids).size)throw createError({statusCode:400,message:'Список получателей изменился. Откройте окно отправки заново.'});
  const file=await reportAttachment(getRouterParam(event,'id')||'');
  const {smtp}=useRuntimeConfig();
  if(!smtp.host||!smtp.from)throw createError({statusCode:503,message:'Почта Space не настроена.'});
  const transport=nodemailer.createTransport({host:String(smtp.host),port:Number(smtp.port||587),secure:String(smtp.secure)==='true',
    connectionTimeout:10000,greetingTimeout:10000,socketTimeout:30000,...(smtp.user&&smtp.password?{auth:{user:String(smtp.user),pass:String(smtp.password)}}:{})});
  try{
    const info=await transport.sendMail({from:String(smtp.from),bcc:[...new Set(selected.map(p=>p.email))],subject:'ОДИС · '+file.title,
      text:'Во вложении отчёт «'+file.title+'».',attachments:[{filename:file.filename,path:file.path}]});
    const accepted=new Set((info.accepted||[]).map(String).map(v=>v.toLowerCase()));
    return {sent:selected.filter(p=>accepted.has(p.email.toLowerCase())).map(p=>p.id)};
  }catch{throw createError({statusCode:502,message:'Не получено подтверждение SMTP. Проверьте доставку перед повторной отправкой.'});}
  finally{transport.close();}
});
