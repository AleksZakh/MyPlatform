import { workAccess } from '../../../services/diagnostic/work-access';
import { workCatalog } from '../../../services/diagnostic/works';
export default defineEventHandler(async event => { await workAccess(event, 'VIEW'); return workCatalog(); });

