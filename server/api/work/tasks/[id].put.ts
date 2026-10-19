import { defineEventHandler, getRouterParam } from 'h3';
import { saveTask } from '../../../services/work/service';
import { positiveId } from '../../../services/work/input';
import { workBody } from '../../../services/work/access';
export default defineEventHandler(async event => saveTask(event, await workBody(event), positiveId(getRouterParam(event, 'id'))));
