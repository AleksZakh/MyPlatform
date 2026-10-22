import {contractAccess} from '../../../services/diagnostic/access';
import {readContract} from '../../../services/diagnostic/contracts';
import {id} from '../../../services/diagnostic/input';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return readContract(id(getRouterParam(event,'id')));});
