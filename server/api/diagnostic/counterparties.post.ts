import {contractAccess} from '../../services/diagnostic/access';
import {addCatalog} from '../../services/diagnostic/catalog';
export default defineEventHandler(async event=>{const actor=await contractAccess(event,'CREATE');const body=await readBody(event);return addCatalog(event,actor.userId,'counterparty',body?.name);});
