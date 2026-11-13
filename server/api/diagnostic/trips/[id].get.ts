import {contractAccess} from '../../../services/diagnostic/access';
import {getTrip,tripId} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return getTrip(tripId(getRouterParam(event,'id')));});
