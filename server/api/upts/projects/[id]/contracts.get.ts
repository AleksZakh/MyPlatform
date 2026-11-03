import { defineEventHandler, getRouterParam } from 'h3';
import { workActor } from '../../../../services/work/access';
import { visibleProject } from '../../../../services/work/service';
import { positiveId } from '../../../../services/work/input';
import { prisma } from '../../../../utils/prisma';
export default defineEventHandler(async event=>{
 const a=await workActor(event),projectId=positiveId(getRouterParam(event,'id'));
 await visibleProject(prisma,projectId,a);
 return prisma.uptsContract.findMany({where:{projectId},orderBy:{id:'asc'}});
});
