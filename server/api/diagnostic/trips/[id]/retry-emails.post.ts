import {contractAccess} from '../../../../services/diagnostic/access';
import {retryTripEmails,tripId} from '../../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'UPDATE'),body=await readBody(event);return retryTripEmails(event,actor.userId,tripId(getRouterParam(event,'id')),body?.confirmed===true);});
