import { contractAccess } from '../../../services/diagnostic/access';
import { planningOptions } from '../../../services/diagnostic/planning';
export default defineEventHandler(async (event) => {
  const actor = await contractAccess(event, 'VIEW');
  return planningOptions(event, actor.userId);
});
