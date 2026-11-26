import {getRouterParam} from 'h3';
import {structureAccess} from '../../../../services/diagnostic/structure-access';
import {id} from '../../../../services/diagnostic/input';
import {inspectStructureRemoval} from '../../../../services/diagnostic/structure-removal';

export default defineEventHandler(async event => {
  await structureAccess(event,'DELETE');
  return inspectStructureRemoval(id(getRouterParam(event,'id')));
});
