import { createError, getHeader, setHeader, type H3Event } from 'h3';
import { getAccessActor, requirePermission } from '../access-control.service';
export async function workActor(event:H3Event) {
 setHeader(event,'Cache-Control','private, no-store');
 if(event.context.externalSessionRevoked) throw createError({statusCode:401});
 const actor=await getAccessActor(event);
 return {id:actor.user.id,departmentId:actor.user.department?.isActive ? actor.user.department.id : null,
 department:actor.user.department?.isActive ? actor.user.department : null,isSystemAdmin:actor.isSystemAdmin};
}
export async function hasWorkGrant(event:H3Event, action:'CREATE'|'UPDATE') {
 try { await requirePermission(event,'projects.shared',action,{auditDenial:false}); return true; }
 catch(e:any) {if(e.statusCode===403)return false;throw e;}
}
export async function workBody(event:H3Event) {
 if(getHeader(event,'x-space-work')!=='1' || !getHeader(event,'content-type')?.startsWith('application/json'))
 throw createError({statusCode:403,message:'Запрос должен быть отправлен из Space.'});
 const chunks:Buffer[]=[]; let size=0;
 for await(const c of event.node.req){const b=Buffer.from(c);size+=b.length;if(size>100000)throw createError({statusCode:413});chunks.push(b);}
 try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw createError({statusCode:400,message:'Неверный JSON.'});}
}
