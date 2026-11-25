import type {H3Event} from 'h3';
import {calendarRoster} from '../calendar-roster';
import {plansRegionalCenters} from '../plans-regional-centers';
import {reportCenter,type ReportEmployee} from '../../../../shared/utils/diagnostic-reports';

export async function reportRoster(event:H3Event){
  const roster=await calendarRoster(event);
  const employees:ReportEmployee[]=[];
  for(let i=0;i<roster.employees.length;i+=200){
    const batch=roster.employees.slice(i,i+200);
    const centers=await plansRegionalCenters(event,batch.map(p=>p.id));
    for(const p of batch)employees.push({...p,center:reportCenter(centers.get(p.id)?.regionalCenter||'',p.name)});
  }
  return {...roster,employees};
}
