import type {H3Event} from 'h3';
import {prisma} from '../../../utils/prisma';
import {calendarRoster} from '../calendar-roster';
export async function reportRecipients(event:H3Event){
  const roster=await calendarRoster(event);
  const users=await prisma.user.findMany({where:{id:{in:roster.employees.map(p=>p.id)},status:'ACTIVE',deletedAt:null,email:{not:null}},select:{id:true,email:true,fullName:true,login:true},orderBy:{fullName:'asc'}});
  return users.flatMap(p=>{
    const email=p.email?.trim();
    return email&&/^[^\s<>,;@]+@[^\s<>,;@]+$/.test(email)?[{id:p.id,name:p.fullName||p.login||email,email}]:[];
  });
}
