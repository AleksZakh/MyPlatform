import {contractAccess} from '../../../../../services/diagnostic/access';
import {id,invalid} from '../../../../../services/diagnostic/input';
import {prisma} from '../../../../../utils/prisma';
export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');
 const q=getQuery(event),contractId=id(getRouterParam(event,'id')),workId=id(q.workId);
 if(q.kind!=='contract'&&q.kind!=='structure')return invalid('Неизвестный вид работы.');
 const [r]=await prisma.$queryRaw<{author:string}[]>`SELECT coalesce(nullif(u."fullName",''),u.login,'#'||u.id) author
 FROM odis.assignment_owner a JOIN app_users u ON u.id=a.planner
 WHERE a.kind=${q.kind} AND a.work_id=${workId} AND a.employee<>a.planner AND EXISTS(
 SELECT 1 FROM diagnostic_contracts c WHERE c.id=${contractId} AND c."deletedAt" IS NULL AND
 ((a.kind='contract' AND EXISTS(SELECT 1 FROM diagnostic_contract_works w WHERE w.id=a.work_id AND w."contractId"=c.id AND w."deletedAt" IS NULL))
 OR (a.kind='structure' AND EXISTS(SELECT 1 FROM diagnostic_structure_works w JOIN diagnostic_contract_structures l ON l.id=w."contractStructureId"
 WHERE w.id=a.work_id AND l."contractId"=c.id AND w."deletedAt" IS NULL AND l."deletedAt" IS NULL))))`;
 return {author:r?.author??null};
});
