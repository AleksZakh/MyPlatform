import { defineEventHandler, getRouterParam } from 'h3';
import { projectFiles } from '../../../../../services/work/files';
import { positiveId } from '../../../../../services/work/input';
export default defineEventHandler(async event => projectFiles(event, positiveId(getRouterParam(event, "id"))));
