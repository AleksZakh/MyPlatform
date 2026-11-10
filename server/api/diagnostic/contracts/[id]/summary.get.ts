import {defineEventHandler,getRouterParam} from 'h3';
import {contractAccess} from '../../../../services/diagnostic/access';
import {id} from '../../../../services/diagnostic/input';
import {prisma} from '../../../../utils/prisma';
import {contractDetailCounts} from '../../../../services/diagnostic/contract-details';

export default defineEventHandler(async event=>{
 await contractAccess(event,'VIEW');
 return contractDetailCounts(prisma,id(getRouterParam(event,'id')));
});
