import { contractAccess } from '../../../services/diagnostic/access';
import { savePlanning } from '../../../services/diagnostic/planning';
export default defineEventHandler(async (event) => {
  const actor = await contractAccess(event, 'CREATE');
  return savePlanning(event, actor.userId, await readBody(event));
});
