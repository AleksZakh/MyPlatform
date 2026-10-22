import {contractAccess} from '../../services/diagnostic/access';
import {readCatalog} from '../../services/diagnostic/catalog';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return readCatalog(event);});
