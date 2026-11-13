import {contractAccess} from '../../../services/diagnostic/access';
import {tripCatalog} from '../../../services/diagnostic/trips';
export default defineEventHandler(async event=>{await contractAccess(event,'VIEW');return tripCatalog(event);});
