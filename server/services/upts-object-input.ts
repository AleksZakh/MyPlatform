import { z } from 'zod';
import type { H3Event } from 'h3';
import type { UptsObjectDetails } from '../../shared/types/upts-object';
import { validWorkKind } from '../../shared/utils/upts-work-kinds';
import { uptsDay } from './upts-input';
import { uptsPeople } from './upts-people';
import { fail } from './work/service';
const text = z.string().trim().max(500);
const person = z.number().int().positive().max(2147483647).nullable().optional();
export const objectDetailsSchema = z.object({
  basisContractNumber: z.string().trim().max(250).optional(),
  basisContractDate: uptsDay.optional(),
  workStartDate: uptsDay.optional(),
  stageCount: z.number().int().positive().max(2147483647).nullable().optional(),
  road: text.optional(), address:text.optional(), stage: text.optional(),
  rightHolders: z.array(text.min(1)).max(30).optional(),
  region: text.optional(), dealType: text.optional(),
  sourceCadastralNumber: z.string().trim().max(100).optional(),
  sourceArea: z.string().trim().max(30).refine(v=>!v || /^\d+(?:[.,]\d+)?$/.test(v),'Площадь должна быть неотрицательным числом.').optional(),
  rightKind: text.optional(), permittedUses: z.array(text.min(1)).max(30).optional(),
  accountingType: text.optional(),
  kuvdEntries: z.array(z.object({number:z.string().trim().max(100),date:uptsDay}).strict()).max(30).optional(),
  curatorId: person, engineerId: person,
  workKindKey: z.string().max(40).nullable().optional(),
  workKindKeys:z.array(z.string().min(1).max(40)).max(18).refine(keys=>new Set(keys).size===keys.length).optional(),
  otherDescription: z.string().trim().max(2000).optional(),
}).strict();
export function checkObjectKind(type:string|null, details?:UptsObjectDetails){
  if(!validWorkKind(type,details?.workKindKey) || details?.workKindKeys?.some(key=>!validWorkKind(type,key))) fail(400,'Вид работ не соответствует типу объекта.');
}
export function checkObjectSchedule(details:UptsObjectDetails|undefined, dueDate:string|null){
  if(details?.workStartDate && dueDate && details.workStartDate>dueDate)
    fail(400,'Дата окончания работ не может быть раньше даты начала.');
}
// Roles in the card are business responsibilities. Access remains controlled by the object's team.
// Unchanged references are retained if a member later leaves UPTS; new assignments require current membership.
export async function checkObjectPeople(event:H3Event, next?:UptsObjectDetails, old?:UptsObjectDetails){
  const ids = (['curatorId','engineerId'] as const).map(k=>next?.[k]!==old?.[k]?next?.[k]:null).filter((id):id is number=>!!id);
  if(!ids.length)return;
  const staff=new Set((await uptsPeople(event)).map(p=>p.id));
  if(ids.some(id=>!staff.has(id)))fail(400,'Выберите активных сотрудников УПТС для ролей объекта.');
}
