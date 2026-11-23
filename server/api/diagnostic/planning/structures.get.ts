import { contractAccess } from '../../../services/diagnostic/access';
import { planningStructures, positive } from '../../../services/diagnostic/planning';
export default defineEventHandler(async (event) => {
  await contractAccess(event, 'VIEW');
  return planningStructures(positive(getQuery(event).contractId));
});
