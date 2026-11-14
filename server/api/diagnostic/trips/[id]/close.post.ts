import {contractAccess} from '../../../../services/diagnostic/access';
import {tripId,parseTripClose,closeTrip} from '../../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'UPDATE'),body=parseTripClose(await readBody(event));return closeTrip(event,actor.userId,tripId(getRouterParam(event,'id')),body.version,body.participants);});
