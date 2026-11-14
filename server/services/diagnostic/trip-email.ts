import type {Prisma} from '@prisma/client';
import type {TripInput} from '../../../shared/types/diagnostic-trips';
import {tripDateLabel} from '../../../shared/utils/diagnostic-trips';
import {tripToday} from '../../../shared/utils/diagnostic-trip-lifecycle';
export async function queueTripEmails(tx:Prisma.TransactionClient,trip:{id:number;version:number;number:string;contentKey:string},input:TripInput){
 await tx.diagnosticTripEmail.updateMany({where:{tripId:trip.id,status:{in:['PENDING','FAILED']}},data:{status:'CANCELLED',lastError:'Данные поездки изменены.'}});
 // Historical entry does not announce an upcoming trip.
 if(input.finish<tripToday())return;
 const [people,contract,structures]=await Promise.all([
  tx.user.findMany({where:{id:{in:input.participantIds}},select:{id:true,fullName:true,login:true,email:true,deletedAt:true}}),
  tx.diagnosticContract.findUniqueOrThrow({where:{id:input.contractId},select:{number:true}}),
  tx.diagnosticStructure.findMany({where:{id:{in:input.structureIds}},select:{code:true,roadName:true,location:true},orderBy:{id:'asc'}}),
 ]);
 const route=input.noStructures?input.destination||'Без указания сооружений':structures.map(s=>`${s.code} · ${s.roadName} · ${s.location}`).join('\n');
 await tx.diagnosticTripEmail.createMany({data:people.map(p=>({tripId:trip.id,userId:p.id,tripVersion:trip.version,contentKey:trip.contentKey,email:p.email?.trim()||null,subject:`Space — командировка ${trip.number}`,body:`${p.fullName||p.login||'Участник'}, вам запланирована командировка ${trip.number}.\n\nПериод: ${tripDateLabel(input.start)} — ${tripDateLabel(input.finish)}.\nДоговор: ${contract.number}.\nМаршрут / сооружения:\n${route}\n\nЗадание: ${input.assignment||'Не указано'}\nТранспорт: ${input.transport||'Не указан'}\nПроживание: ${input.accommodation||'Не указано'}\n\nПодробности — Space, ОДИС → Командировки.`,status:p.email&&!p.deletedAt?'PENDING':'FAILED',lastError:p.email&&!p.deletedAt?null:'У сотрудника не указан email.'}))});
}
