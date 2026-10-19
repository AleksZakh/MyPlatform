import { headUpload } from '../../../../services/library-video/upload';
export default defineEventHandler(event => headUpload(event, getRouterParam(event, 'id') || ''));
