import type { H3Event } from 'h3';
import type { Prisma } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { uptsActor } from './upts-access';
import { isUptsDepartment, isUptsGroup } from '../../shared/utils/upts-membership';
import { directoryGroupUserIds } from './domain-group-directory.service';

/** Union of active departments, direct Space groups and live linked/named AD groups. */
export async function uptsPeople(event: H3Event) {
 await uptsActor(event);
 const [departments, groups, domainGroups] = await Promise.all([
  prisma.department.findMany({where:{isActive:true}}),
  prisma.spaceGroup.findMany({where:{isActive:true},include:{domainGroups:{include:{domainGroup:true}}}}),
  prisma.domainGroup.findMany({where:{isActive:true}}),
 ]);
 const selected = groups.filter(isUptsGroup);
 const domainIds = [...new Set([
  ...domainGroups.filter(isUptsGroup).map(g=>g.directoryObjectId),
  ...selected.flatMap(g=>g.domainGroups.filter(d=>d.domainGroup.isActive).map(d=>d.domainGroup.directoryObjectId)),
 ])];
 // A directory outage is an error, never an apparently complete but truncated roster.
 const directoryIds = (await Promise.all(domainIds.map(id=>directoryGroupUserIds(event,id)))).flat();
 const where: Prisma.UserWhereInput = {status:'ACTIVE',deletedAt:null,OR:[
  {departmentId:{in:departments.filter(isUptsDepartment).map(d=>d.id)}},
  {spaceGroups:{some:{groupId:{in:selected.map(g=>g.id)},group:{isActive:true}}}},
  ...(directoryIds.length ? [{authType:'DOMAIN' as const,directoryObjectId:{in:directoryIds}}] : []),
 ]};
 return prisma.user.findMany({where,select:{id:true,fullName:true,login:true},orderBy:[{fullName:'asc'},{id:'asc'}]});
}
