import { defineEventHandler, getRouterParam } from 'h3';
import { objectCatalog } from '../../services/upts';
import { positiveId } from '../../services/work/input';
import { workBody } from '../../services/work/access';
export default defineEventHandler(async (event) => objectCatalog(event));
