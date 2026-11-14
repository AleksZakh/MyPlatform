import {contractAccess} from '../../../services/diagnostic/access';
import {deleteTrip,tripId} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'DELETE'),body=await readBody(event);if(body?.confirmed!==true)throw createError({statusCode:400,message:'Подтвердите удаление командировки и её работ.'});return deleteTrip(event,actor.userId,tripId(getRouterParam(event,'id')),tripId(body.version));});
