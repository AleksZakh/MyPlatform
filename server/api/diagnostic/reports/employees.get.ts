import {contractAccess} from '../../../services/diagnostic/access';
import {calendarRoster} from '../../../services/diagnostic/calendar-roster';
import {plansRegionalCenters} from '../../../services/diagnostic/plans-regional-centers';
import {reportCenter,type ReportEmployee} from '../../../../shared/utils/diagnostic-reports';

export default defineEventHandler(async event=>{
  await contractAccess(event,'VIEW');
  const roster=await calendarRoster(event);
  const employees:ReportEmployee[]=[];
  // The shared center lookup accepts up to 200 employee IDs per call.
  for(let offset=0;offset<roster.employees.length;offset+=200){
    const batch=roster.employees.slice(offset,offset+200);
    const centers=await plansRegionalCenters(event,batch.map(person=>person.id));
    employees.push(...batch.map(person=>({...person,center:reportCenter(centers.get(person.id)?.regionalCenter||'')})));
  }
  return {employees,warning:roster.warning};
});
