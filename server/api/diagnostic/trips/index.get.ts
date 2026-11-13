import {contractAccess} from '../../../services/diagnostic/access';
import {listTrips} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return listTrips();});
