import { defineEventHandler, getRouterParam } from 'h3';
import { saveContract } from '../../../../services/upts';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async (event) =>
  saveContract(
    event,
    positiveId(getRouterParam(event, 'id')),
    await workBody(event),
  ),
);
