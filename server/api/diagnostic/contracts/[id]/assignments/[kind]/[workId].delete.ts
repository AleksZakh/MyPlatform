import { defineEventHandler, getRouterParam, readBody } from 'h3';
import { contractAccess } from '../../../../../../services/diagnostic/access';
import { id, invalid } from '../../../../../../services/diagnostic/input';
import { prisma } from '../../../../../../utils/prisma';
import { removeAssignment } from '../../../../../../services/diagnostic/contract-removals';

export default defineEventHandler(async event => {
  const {userId} = await contractAccess(event,'DELETE');
  const contractId = id(getRouterParam(event,'id')), workId = id(getRouterParam(event,'workId'));
  const kind = getRouterParam(event,'kind');
  if (kind!=='contract' && kind!=='structure') return invalid('Неизвестный вид работы.');
  const body = await readBody(event);
  return prisma.$transaction(tx=>removeAssignment(tx,event,userId,contractId,kind,{id:workId,version:id(body?.version)}));
});
