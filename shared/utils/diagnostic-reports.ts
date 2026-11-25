import {plansWeek} from './diagnostic-plans-period';
import {regionalCenterCode} from './diagnostic-regional-center';
import {tripDay,tripInitials} from './diagnostic-trips';

export const reportTypes = {
  completed:'Выполнение заданий',
  planned:'Запланированные работы',
  summary:'Сводный отчёт',
  timesheet:'Табель учёта рабочего времени',
  external:'Отчёт по внешним исполнителям',
} as const;
export const reportIntervals = {day:'День',week:'Неделя',month:'Месяц',custom:'Произвольный интервал'} as const;
export const reportCenters = ['МСК','ВРЦ','РРЦ','КРЦ'] as const;
export type Center = typeof reportCenters[number];
export type ReportEmployee = {id:number;name:string;center:Center|null};
export type ReportRoster = {employees:ReportEmployee[];warning:string|null};

export function reportCenter(department:string, name=''):Center|null {
  if (tripInitials(name)===tripInitials('Дубовиков И.А.')) return 'МСК';
  if (/(?:^|[^А-ЯЁ])РСТ(?:$|[^А-ЯЁ])/iu.test(department)) return 'РРЦ';
  if(/казанск|(?:^|[^А-ЯЁ])КЗЦ(?:$|[^А-ЯЁ])/iu.test(department))return null;
  const code=regionalCenterCode(department);
  if (code==='РРЦ') return 'РРЦ';
  if (code==='МСК'||code==='ВРЦ'||code==='КРЦ') return code;
  if (/ростовский филиал/iu.test(department)) return 'РРЦ';
  if (/воронежский филиал/iu.test(department)) return 'ВРЦ';
  if (/краснодарский филиал/iu.test(department)) return 'КРЦ';
  return null;
}

export function earliestPlannedStart(interval:keyof typeof reportIntervals,today:string){
  if(interval==='week')return plansWeek(today).from;
  if(interval==='month')return today.slice(0,7)+'-01';
  return today;
}

const weekMs=7*86400000;
export function reportWeek(day:string):string {
  const monday=Date.parse(plansWeek(day).from);
  // Thursday determines the ISO week-year, including weeks spanning New Year.
  const year=new Date(monday+3*86400000).getUTCFullYear();
  const first=Date.parse(plansWeek(year+'-01-04').from);
  return year+'-W'+String(1+(monday-first)/weekMs).padStart(2,'0');
}

export function reportPeriod(interval:keyof typeof reportIntervals,day:string,week:string,month:string,from:string,to:string){
  if(interval==='day') return tripDay(day)?{from:day,to:day}:null;
  if(interval==='custom') return tripDay(from)&&tripDay(to)&&from<=to?{from,to}:null;
  if(interval==='month'){
    if(!tripDay(month+'-01'))return null;
    const end=new Date(month+'-01T00:00:00Z');
    end.setUTCMonth(end.getUTCMonth()+1,0);
    return {from:month+'-01',to:end.toISOString().slice(0,10)};
  }
  const match=/^(\d{4})-W(\d{2})$/.exec(week);
  if(!match||!tripDay(match[1]+'-01-04'))return null;
  const first=Date.parse(plansWeek(match[1]+'-01-04').from);
  const monday=new Date(first+(Number(match[2])-1)*weekMs).toISOString().slice(0,10);
  if(!tripDay(monday)||reportWeek(monday)!==week)return null;
  return plansWeek(monday);
}

export const centerColors:Record<Center,string> = {МСК:'#FCCFAE',ВРЦ:'#BAE8FE',РРЦ:'#E4D7F5',КРЦ:'#BCFBE0'};
export interface ReportParams {
  kind:keyof typeof reportTypes;
  interval:keyof typeof reportIntervals;
  from:string;
  to:string;
  employeeIds:number[]|null;
}
export interface ReportLine {center:Center|null;cells:(string|number)[];group:string}
export interface ReportInfo {id:string;title:string;createdAt:string;params:ReportParams}
export interface SavedReport extends ReportInfo {columns:string[];lines:ReportLine[];totals:(number|string)[]|null;warnings:string[]}
