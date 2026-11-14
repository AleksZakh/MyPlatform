import {contractAccess} from '../../../services/diagnostic/access';
import {readTripInput,saveTrip} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'CREATE'),body=await readBody(event);return saveTrip(event,actor.userId,readTripInput(body),undefined,undefined,body.backdatedConfirmed===true);});
