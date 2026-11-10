import {defineEventHandler,getRouterParam} from 'h3';
import {contractAccess} from '../../../../../../services/diagnostic/access';
import {id} from '../../../../../../services/diagnostic/input';
import {prisma} from '../../../../../../utils/prisma';
import {contractStructureWorks} from '../../../../../../services/diagnostic/contract-details';

export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');
 return contractStructureWorks(prisma,id(getRouterParam(event,'id')),id(getRouterParam(event,'linkId')));
});
