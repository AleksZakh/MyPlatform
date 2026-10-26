import { workAccess, workInput } from '../../../services/diagnostic/work-access';
import { saveWork } from '../../../services/diagnostic/works';
import { parseWork, positiveId } from '../../../../shared/utils/diagnostic-works';
export default defineEventHandler(async event => {
  const actor = await workAccess(event, 'UPDATE');
  const body = await readBody(event);
  const parsed = workInput(() => ({ input: parseWork(body), id: positiveId(getRouterParam(event, 'id')), version: positiveId(body?.version) }));
  return saveWork(event, actor.userId, parsed.input, parsed.id, parsed.version);
});

