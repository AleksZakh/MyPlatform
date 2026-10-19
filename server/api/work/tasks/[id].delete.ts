import { defineEventHandler, getRouterParam } from 'h3';
import { deleteTask } from '../../../services/work/service';
import { positiveId } from '../../../services/work/input';
import { workBody } from '../../../services/work/access';
export default defineEventHandler(async event => deleteTask(event, positiveId(getRouterParam(event, 'id')), await workBody(event)));
