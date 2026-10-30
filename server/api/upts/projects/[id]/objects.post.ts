import { defineEventHandler, getRouterParam } from 'h3';
import { addObject } from '../../../../services/upts';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async (event) =>
  addObject(
    event,
    positiveId(getRouterParam(event, 'id')),
    await workBody(event),
  ),
);
