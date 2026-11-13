import {contractAccess} from '../../../services/diagnostic/access';
import {resolveTripParticipant} from '../../../services/diagnostic/trip-participants';
export default defineEventHandler(async event=>{
 // Editors with UPDATE-only rights may add participants to an existing trip too.
 await contractAccess(event,'VIEW');
 let actor;try{actor=await contractAccess(event,'CREATE');}catch(e:any){if(e.statusCode!==403)throw e;actor=await contractAccess(event,'UPDATE');}
 return resolveTripParticipant(event,actor.userId,(await readBody(event))?.directoryObjectId);
});
