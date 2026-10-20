import { defineEventHandler, getRouterParam } from 'h3';
import { uploadProjectFile } from '../../../../../services/work/files';
import { positiveId } from '../../../../../services/work/input';
export default defineEventHandler(async event => uploadProjectFile(event, positiveId(getRouterParam(event, "id"))));
