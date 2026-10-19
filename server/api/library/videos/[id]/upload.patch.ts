import { patchUpload } from '../../../../services/library-video/upload';
export default defineEventHandler(event => patchUpload(event, getRouterParam(event, 'id') || ''));
