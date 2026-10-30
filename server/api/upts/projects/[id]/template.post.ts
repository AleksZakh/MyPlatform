import { defineEventHandler, getRouterParam } from 'h3';
import { applyTemplate } from '../../../../services/upts';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async (event) =>
  applyTemplate(
    event,
    positiveId(getRouterParam(event, 'id')),
    await workBody(event),
  ),
);
