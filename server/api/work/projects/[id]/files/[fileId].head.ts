import { defineEventHandler, getRouterParam } from 'h3';
import { downloadProjectFile } from '../../../../../services/work/files';
import { positiveId } from '../../../../../services/work/input';
export default defineEventHandler(async event => downloadProjectFile(event, positiveId(getRouterParam(event, "id")), getRouterParam(event, "fileId")));
