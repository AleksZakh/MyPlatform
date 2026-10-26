import { workAccess, workInput } from '../../../services/diagnostic/work-access';
import { saveWork } from '../../../services/diagnostic/works';
import { parseWork } from '../../../../shared/utils/diagnostic-works';
export default defineEventHandler(async event => {
  const actor = await workAccess(event, 'CREATE');
  const body = await readBody(event);
  return saveWork(event, actor.userId, workInput(() => parseWork(body)));
});

