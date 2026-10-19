import { defineEventHandler, getRouterParam } from 'h3';
import { saveMember } from '../../../../services/work/service';
import { positiveId } from '../../../../services/work/input';
import { workBody } from '../../../../services/work/access';
export default defineEventHandler(async event => saveMember(event, positiveId(getRouterParam(event, 'id')), await workBody(event)));
