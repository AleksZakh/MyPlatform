import { deliver } from '../../../../services/library-video/delivery';
export default defineEventHandler(event => deliver(event, getRouterParam(event, 'id') || '', false));
