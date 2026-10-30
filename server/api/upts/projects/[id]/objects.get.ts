import { defineEventHandler, getRouterParam } from 'h3';
import { objects } from '../../../../services/upts';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async (event) =>
  objects(event, positiveId(getRouterParam(event, 'id'))),
);
