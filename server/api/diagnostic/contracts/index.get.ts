import {contractAccess,requireContractTrash} from '../../../services/diagnostic/access';
import {listContracts} from '../../../services/diagnostic/contracts';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');const trash=getQuery(event).trash==='1';if(trash)await requireContractTrash(event);return listContracts(trash);});
