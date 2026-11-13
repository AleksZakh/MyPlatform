import {contractAccess} from '../../../services/diagnostic/access';
import {readTripInput,saveTrip} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'CREATE');return saveTrip(event,actor.userId,readTripInput(await readBody(event)));});
