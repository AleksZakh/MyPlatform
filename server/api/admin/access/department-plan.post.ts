import {defineEventHandler,readBody,setResponseHeader} from 'h3';
import {departmentPlan,parseScopeRequest} from '../../../services/department-access';
import {requireAccessMutationRequest,accessError} from '../../../services/access-input';
export default defineEventHandler(async event=>{
 requireAccessMutationRequest(event);setResponseHeader(event,'Cache-Control','private, no-store');
 const body=await readBody(event);const input=parseScopeRequest(body);
 
 return departmentPlan(event,input);
});
