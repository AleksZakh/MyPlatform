import {createError,getHeader,type H3Event} from 'h3';
import {contractAccess} from '../access';
export async function reportAction(event:H3Event){
  await contractAccess(event,'VIEW');
  if(getHeader(event,'x-space-diagnostic')!=='1'||getHeader(event,'sec-fetch-site')==='cross-site'||!getHeader(event,'content-type')?.startsWith('application/json')){
    throw createError({statusCode:403,message:'Действие доступно из раздела отчётов Space.'});
  }
}
