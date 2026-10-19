import { defineEventHandler, getRouterParam } from 'h3';
import { addComment } from '../../../../services/work/service';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async event => addComment(event, positiveId(getRouterParam(event, 'id')), await workBody(event)));
