import {contractAccess} from '../../../services/diagnostic/access';
import {saveContract} from '../../../services/diagnostic/contracts';
import {parseContract,id} from '../../../services/diagnostic/input';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'CREATE');const body=await readBody(event);return saveContract(event,actor.userId,parseContract(body));});
