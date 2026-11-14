import nodemailer from 'nodemailer';
export async function sendDiagnosticTripMail(job:{id:number;email:string;subject:string;body:string}){
 const smtp=useRuntimeConfig().smtp;
 if(!smtp.host||!smtp.from)throw Object.assign(new Error('SMTP не настроен.'),{code:'SMTP_NOT_CONFIGURED'});
 const transport=nodemailer.createTransport({host:String(smtp.host),port:Number(smtp.port||587),secure:smtp.secure===true||String(smtp.secure)==='true',connectionTimeout:10000,greetingTimeout:10000,socketTimeout:15000,...(smtp.user&&smtp.password?{auth:{user:String(smtp.user),pass:String(smtp.password)}}:{})});
 try{const info=await transport.sendMail({from:String(smtp.from),to:job.email,subject:job.subject,text:job.body,messageId:`<space-odis-trip-${job.id}@space.local>`});if(!info.accepted?.length)throw Error('Адресат не принят почтовым сервером.');return String(info.messageId||'').slice(0,255);}finally{transport.close();}
}
