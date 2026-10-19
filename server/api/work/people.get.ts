import { defineEventHandler, getRouterParam } from 'h3';
import { people } from '../../services/work/service';
import { positiveId } from '../../services/work/input';
import { workBody } from '../../services/work/access';
export default defineEventHandler(async event => people(event));
