import {contractAccess} from '../../../services/diagnostic/access';
import {readTripInput,saveTrip,tripId} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'UPDATE'),body=await readBody(event);return saveTrip(event,actor.userId,readTripInput(body),tripId(getRouterParam(event,'id')),tripId(body.version));});
