import {calendarResolver,calendarShortName} from '../../../../shared/utils/diagnostic-calendar';
import type {CalendarUser} from '../../../../shared/types/diagnostic-calendar';
import {diagnosticWorkStatus} from '../../../../shared/utils/diagnostic-contract-table';
import {tripDateLabel} from '../../../../shared/utils/diagnostic-trips';
import {hourUnits,tripToday} from '../../../../shared/utils/diagnostic-trip-lifecycle';
import {reportCenters,type ReportParams,type ReportEmployee,type ReportLine} from '../../../../shared/utils/diagnostic-reports';

export interface Work {
  contractId:number;contractNumber:string;structure:string;name:string;note:string;status:string;
  planStart:string|null;planFinish:string|null;factStart:string|null;factFinish:string|null;
  planExecutor:string;factExecutor:string;factHours:string|null;
  participant?:number;
}
const zero=BigInt(0),one=BigInt(1);
const ordinal=(date:string)=>Date.parse(date)/86400000;
function weekdays(a:number,b:number){
  const length=Math.max(0,b-a+1);
  let count=Math.floor(length/7)*5;
  for(let i=0;i<length%7;i++)if(((a+i+3)%7+7)%7<5)count++;
  return count;
}
// Cumulative integer allocation makes adjoining periods add up to the original hours.
export function periodHours(units:bigint,start:string,end:string,from:string,to:string){
  const a=ordinal(start),b=ordinal(end),first=Math.max(a,ordinal(from)),last=Math.min(b,ordinal(to));
  if(first>last)return zero;
  const n=weekdays(a,b);
  const cumulative=(day:number)=>units*BigInt(n?weekdays(a,day):day-a+1)/BigInt(n||b-a+1);
  return cumulative(last)-cumulative(first-1);
}
function intersects(a:string|null,b:string|null,p:ReportParams){
  return !!(a||b)&&(a||b!)<=p.to&&(b||a!)>=p.from;
}
const numeric=(u:bigint)=>Number(u)/10000;
const ru=new Intl.Collator('ru',{numeric:true});
export function reportTable(params:ReportParams,employees:ReportEmployee[],users:CalendarUser[],works:Work[],today=tripToday()){
  const selected=new Map(employees.filter(p=>!params.employeeIds||params.employeeIds.includes(p.id)).map(p=>[p.id,p]));
  const resolve=calendarResolver(users);
  const kind=params.kind, sheet=kind==='timesheet';
  const lines:ReportLine[]=[],warnings:string[]=[];
  const contracts=new Map<number,string>(),hours=new Map<number,Map<number,bigint>>();
  let missingHours=0,ambiguous=0;
  for(const w of works){
    const status=diagnosticWorkStatus(w.status);
    const external=/внешний\s+исполнитель(?:\s*[-–—:]\s*([^\n]+))?/iu.exec(w.note);
    if(Boolean(external)!==(kind==='external'))continue;
    const open=(kind==='summary'||kind==='external')&&w.factStart&&!w.factFinish&&['in_progress','overdue'].includes(status.key);
    const planned=intersects(w.planStart,w.planFinish,params),actual=intersects(w.factStart,w.factFinish||(open?today:null),params);
    const done=status.key==='completed';
    if(kind==='completed'&&(!done||!w.factFinish||w.factFinish<params.from||w.factFinish>params.to))continue;
    if(sheet&&(!done||!w.factFinish||!actual))continue;
    if(kind==='planned'&&(!planned||!['planned','in_progress'].includes(status.key)))continue;
    if((kind==='summary'||kind==='external')&&!planned&&!actual)continue;
    const plan=w.participant?{ids:[w.participant],unresolved:false}:resolve(w.planExecutor);
    const fact=w.participant?{ids:[w.participant],unresolved:false}:resolve(w.factExecutor);
    const ids=kind==='completed'||sheet?fact.ids:kind==='planned'?plan.ids:
      [...new Set([...(planned?plan.ids:[]),...(actual?fact.ids:[])])];
    if(kind==='external'){
      if(params.employeeIds&&!ids.some(id=>selected.has(id)))continue;
      const org=external![1]?.trim()||w.factExecutor||w.planExecutor||'Исполнитель не указан';
      const [a,b]=actual?[w.factStart,w.factFinish]:[w.planStart,w.planFinish];
      lines.push({center:null,group:org,cells:[0,org,w.contractNumber,w.structure,w.name,range(a,b),status.title,w.note]});
      continue;
    }
    if(sheet&&(fact.unresolved||!fact.ids.length)){
      if(!params.employeeIds||fact.ids.some(id=>selected.has(id)))ambiguous++;
      continue;
    }
    // Historical names can outlive the Space account. Keep the work visible in the full register.
    if(!sheet&&!params.employeeIds){
      const useFact=kind==='completed'||kind==='summary'&&actual;
      const sources=kind==='summary'?[...(planned?[w.planExecutor]:[]),...(actual?[w.factExecutor]:[])]:[useFact?w.factExecutor:w.planExecutor];
      const unmatched=new Set(sources.flatMap(s=>s.split(/[;,\n]+/).map(t=>t.trim()).filter(t=>t&&!resolve(t).ids.length)));
      if(!ids.length&&!unmatched.size)unmatched.add('Исполнитель не указан');
      for(const raw of unmatched)lines.push({center:null,group:'legacy:'+raw,cells:[0,'—',raw,w.contractNumber,w.structure||'—',w.name,
        useFact?range(w.factStart,w.factFinish):range(w.planStart,w.planFinish),status.title,w.note]});
    }
    const sorted=ids.sort((a,b)=>a-b);
    for(const [index,id] of sorted.entries()){
      const person=selected.get(id);
      if(!person)continue;
      if(sheet){
        if(w.factHours===null){missingHours++;continue;}
        const units=hourUnits(w.factHours),count=BigInt(sorted.length);
        const share=units/count+(BigInt(index)<units%count?one:zero);
        const amount=periodHours(share,w.factStart||w.factFinish!,w.factFinish!,params.from,params.to);
        contracts.set(w.contractId,w.contractNumber);
        const row=hours.get(id)??new Map<number,bigint>();
        row.set(w.contractId,(row.get(w.contractId)??zero)+amount);hours.set(id,row);
      }else{
        const useFact=kind==='completed'||kind==='summary'&&actual&&fact.ids.includes(id);
        const [a,b]=useFact?[w.factStart,w.factFinish]:[w.planStart,w.planFinish];
        lines.push({center:person.center,group:String(id),cells:[0,person.center??'—',calendarShortName(person.name),w.contractNumber,w.structure||'—',w.name,range(a,b),status.title,w.note]});
      }
    }
  }
  if(missingHours)warnings.push('Без фактических часов: '+missingHours+'. Эти назначения не вошли в итог.');
  if(ambiguous)warnings.push('Без однозначного фактического исполнителя: '+ambiguous+'. Их часы не вошли в итог.');
  const order=(center:ReportLine['center'])=>center?reportCenters.indexOf(center):4;
  const labels=[...contracts].sort((a,b)=>ru.compare(a[1],b[1])||a[0]-b[0]);
  const sums=labels.map(()=>zero);
  let totals:(number|string)[]|null=null;
  if(sheet){
    for(const [id,values] of hours){
      const person=selected.get(id)!;
      const amounts=labels.map(([key],i)=>{const n=values.get(key)??zero;sums[i]=sums[i]!+n;return n;});
      lines.push({center:person.center,group:String(id),cells:[0,person.center??'—',calendarShortName(person.name),...amounts.map(numeric),numeric(amounts.reduce((a,b)=>a+b,zero))]});
    }
    totals=['Итого','','',...sums.map(numeric),numeric(sums.reduce((a,b)=>a+b,zero))];
  }
  const nameColumn=kind==='external'?1:2;
  lines.sort((a,b)=>order(a.center)-order(b.center)||ru.compare(String(a.cells[nameColumn]),String(b.cells[nameColumn]))||ru.compare(a.group,b.group)||ru.compare(String(a.cells[nameColumn+1]),String(b.cells[nameColumn+1])));
  let number=0,previous='';
  for(const row of lines){if(previous!==row.group){number++;previous=row.group;}row.cells[0]=number;}
  const columns=sheet?['№','Офис','ФИО',...labels.map(c=>c[1]),'Итого, чел·ч']:
    [...(kind==='external'?['№','Внешний исполнитель']:['№','Р/Ц','ФИО']),'№ договора','Код ИССО','Название работ',kind==='planned'?'Период (план)':'Период','Статус','Примечание'];
  return {columns,lines,totals,warnings};
}
function range(a:string|null,b:string|null){return tripDateLabel(a)+' — '+tripDateLabel(b);}
