import { defineEventHandler, getRouterParam } from 'h3';
import { updateObject } from '../../../../../services/upts';
import { positiveId } from '../../../../../services/work/input';
import { workBody } from '../../../../../services/work/access';
export default defineEventHandler(async (event) =>
  updateObject(
    event,
    positiveId(getRouterParam(event, 'id')),
    positiveId(getRouterParam(event, 'objectId')),
    await workBody(event),
  ),
);
