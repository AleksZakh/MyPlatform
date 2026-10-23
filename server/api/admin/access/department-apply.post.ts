import {defineEventHandler,readBody,setResponseHeader} from 'h3';
import {departmentPlan,parseScopeRequest} from '../../../services/department-access';
import {requireAccessMutationRequest,accessError} from '../../../services/access-input';
export default defineEventHandler(async event=>{
 requireAccessMutationRequest(event);setResponseHeader(event,'Cache-Control','private, no-store');
 const body=await readBody(event);const input=parseScopeRequest(body);
 if(!body.revisions||typeof body.revisions!=='object'||input.ids.some(id=>typeof body.revisions[id]!=='string'||! /^[a-f0-9]{64}$/.test(body.revisions[id])))accessError(400,'REVISION_REQUIRED','Сначала сформируйте план изменений.');
 return departmentPlan(event,input,body.revisions);
});
