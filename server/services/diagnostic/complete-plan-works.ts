import { createError, type H3Event } from 'h3';
import { prisma } from '../../utils/prisma';
import { writeAuditEvent } from '../../utils/auditLog';
import { calendarRoster } from './calendar-roster';
import { calendarResolver } from '../../../shared/utils/diagnostic-calendar';
import { diagnosticWorkStatus } from '../../../shared/utils/diagnostic-contract-table';
import { tripDay } from '../../../shared/utils/diagnostic-trips';
import { hourLabel, hourUnits, tripToday } from '../../../shared/utils/diagnostic-trip-lifecycle';
import { id, invalid } from './input';
import { PLAN_PAGE } from './plans-page';

type Kind = 'contract' | 'structure';
type Target = {kind: Kind; id: number; version: number; contractId: number};
const conflict = () => createError({statusCode:409, message:'Состав, статус или версия выбранных работ изменились. Обновите список.'});
const key = (kind:Kind, id:number) => kind + ':' + id;

export async function completePlanWorks(event:H3Event, actorId:number, body:any) {
  const employeeId = id(body?.employeeId);
  if (!Array.isArray(body.rows) || !body.rows.length || body.rows.length > PLAN_PAGE)
    return invalid('Выберите работы на текущей странице.');
  const targets:Target[] = body.rows.map((row:any) => {
    if (row?.kind !== 'contract' && row?.kind !== 'structure') return invalid('Выберите работы с договором или по сооружению.');
    return {kind:row.kind, id:id(row.id), version:id(row.version), contractId:id(row.contractId)};
  });
  targets.sort((a,b)=>a.kind.localeCompare(b.kind)||a.id-b.id);
  if (new Set(targets.map(t=>key(t.kind,t.id))).size !== targets.length) return invalid('Работа выбрана дважды.');
  const {start='', finish='', hours=''} = body;
  const manual = start!=='' || finish!=='' || hours!=='';
  let total = BigInt(0);
  if (manual) {
    if (!tripDay(start) || !tripDay(finish) || start>finish || finish>tripToday())
      return invalid('Укажите обе фактические даты по порядку, не позднее сегодняшнего дня.');
    try { total = hourUnits(hours); } catch { return invalid('Укажите общее время, до четырёх знаков после запятой.'); }
  }
  const roster = await calendarRoster(event);
  const person = roster.employees.find(p=>p.id===employeeId);
  if (!person) return invalid('Выберите сотрудника группы ОДИС.');
  const resolve = calendarResolver(roster.users);
  const executor = [person.name, roster.users.find(u=>u.id===employeeId)?.login].find(s=>s && resolve(s).ids.includes(employeeId));
  if (!executor) return invalid('Не удалось однозначно определить сотрудника.');
  const common = {deletedAt:null, tripCompletion:null};
  const contracts = {...common, contract:{deletedAt:null}};
  const structures = {...common, tripId:null, contractStructure:{deletedAt:null, contract:{deletedAt:null}, structure:{deletedAt:null}}};
  const select = {id:true,version:true,status:true,planStart:true,planFinish:true,planHours:true,planExecutor:true,factExecutor:true} as const;
  const ids = (kind:Kind) => targets.filter(t=>t.kind===kind).map(t=>t.id);
  return prisma.$transaction(async tx=>{
    const cw = await tx.diagnosticContractWork.findMany({where:{...contracts,id:{in:ids('contract')}},select:{...select,contractId:true}});
    const sw = await tx.diagnosticStructureWork.findMany({where:{...structures,id:{in:ids('structure')}},select:{...select,contractStructure:{select:{contractId:true}}}});
    const rows = new Map(cw.map(r=>[key('contract',r.id),r]));
    for (const r of sw) rows.set(key('structure',r.id),{...r,contractId:r.contractStructure.contractId});
    type Group = {kind:Kind; factStart:Date; factFinish:Date; factHours:string; matches:{id:number; version:number; status:string}[]};
    const groups = new Map<string,Group>();
    const n = BigInt(targets.length);
    for (const [i,t] of targets.entries()) {
      const r = rows.get(key(t.kind,t.id));
      if (!r || r.contractId!==t.contractId || r.version!==t.version || diagnosticWorkStatus(r.status).key!=='in_progress' ||
        ![r.planExecutor,r.factExecutor].some(s=>resolve(s).ids.includes(employeeId))) throw conflict();
      const factStart = manual ? new Date(start) : r.planStart;
      const factFinish = manual ? new Date(finish) : r.planFinish;
      const factHours = manual ? hourLabel(total/n+BigInt(BigInt(i)<total%n ? 1 : 0)) : r.planHours?.toString();
      if (!factStart || !factFinish || factFinish<factStart || !factHours || Number(factHours)<0)
        return invalid('У выбранной работы отсутствует полный корректный план. Введите фактические даты и общее время.');
      const groupKey = JSON.stringify([t.kind,factStart,factFinish,factHours]);
      const group = groups.get(groupKey) ?? {kind:t.kind,factStart,factFinish,factHours,matches:[]};
      group.matches.push({id:r.id,version:r.version,status:r.status});
      groups.set(groupKey,group);
    }
    for (const group of groups.values()) {
      const {kind,matches,...facts} = group;
      const data = {...facts,status:'completed',factExecutor:executor,updatedById:actorId,version:{increment:1}};
      const result = kind==='contract'
        ? await tx.diagnosticContractWork.updateMany({where:{...contracts,OR:matches},data})
        : await tx.diagnosticStructureWork.updateMany({where:{...structures,OR:matches},data});
      if (result.count!==matches.length) throw conflict();
    }
    await writeAuditEvent({event,db:tx,actorUserId:actorId,category:'DATA',action:'UPDATE',result:'SUCCESS',
      resourceKey:'diagnostic.contracts',entityType:'DiagnosticPlanCompletion',note:'Завершение выбранных работ',
      afterData:{employeeId,executor,manual,groups:[...groups.values()]}});
    return {count:targets.length};
  },{timeout:30000});
}
