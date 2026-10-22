import {contractAccess} from '../../../services/diagnostic/access';
import {deleteContract} from '../../../services/diagnostic/contracts';
import {id} from '../../../services/diagnostic/input';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'DELETE');const body=await readBody(event);return deleteContract(event,actor.userId,id(getRouterParam(event,'id')),id(body?.version));});
