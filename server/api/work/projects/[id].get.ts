import { defineEventHandler, getRouterParam } from 'h3';
import { getProject } from '../../../services/work/service';
import { positiveId } from '../../../services/work/input';
import { workBody } from '../../../services/work/access';
export default defineEventHandler(async event => getProject(event, positiveId(getRouterParam(event, 'id'))));
