import { defineEventHandler, getRouterParam } from 'h3';
import { projectFileState } from '../../../../../services/work/files';
import { positiveId } from '../../../../../services/work/input';
import { workBody } from '../../../../../services/work/access';
export default defineEventHandler(async event => projectFileState(event, positiveId(getRouterParam(event, "id")), getRouterParam(event, "fileId"), await workBody(event)));
