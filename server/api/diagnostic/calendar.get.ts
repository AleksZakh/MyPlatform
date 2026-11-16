import {contractAccess} from '../../services/diagnostic/access';
import {readCalendar} from '../../services/diagnostic/calendar';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return readCalendar(event,getQuery(event));});
