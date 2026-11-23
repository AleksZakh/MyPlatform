import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { contractAccess } from '../../../../../../services/diagnostic/access';
import { id, invalid } from '../../../../../../services/diagnostic/input';
import { updateAssignment } from '../../../../../../services/diagnostic/update-assignment';

export default defineEventHandler(async (event) => {
  const actor = await contractAccess(event, 'UPDATE');
  const kind = getRouterParam(event, 'kind');
  if (kind !== 'contract' && kind !== 'structure') return invalid('Неизвестный вид назначения.');
  return updateAssignment(
    event,
    actor.userId,
    id(getRouterParam(event, 'id')),
    kind,
    id(getRouterParam(event, 'workId')),
    await readBody(event),
  );
});
