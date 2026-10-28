import {structureAccess} from '../../../services/diagnostic/structure-access';
import {structureCatalog} from '../../../services/diagnostic/structures';
export default defineEventHandler(async event=>{await structureAccess(event);return structureCatalog();});
