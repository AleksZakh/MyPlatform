
import {createError} from 'h3';
import type {ContractInput} from '../../../shared/types/diagnostic-contracts';
export function invalid(message:string):never{throw createError({statusCode:400,message});}
export function id(value:unknown):number{
 if((typeof value!=='number'&&typeof value!=='string')||! /^[1-9]\d*$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)>2147483647)invalid('Некорректный идентификатор.');
 return Number(value);
}
function text(value:unknown,max:number,required=false):string|null{
 if(value==null||value===''){if(required)invalid('Заполните обязательные поля.');return null;}
 if(typeof value!=='string'||value.trim().length>max)invalid('Недопустимое текстовое значение.');
 const s=value.trim();if(required&&!s)invalid('Заполните обязательные поля.');return s||null;
}
function date(value:unknown,required=false):string|null{
 const s=text(value,10,required);if(!s)return null;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(s)||s<'1900-01-01'||s>'9999-12-31'||Number.isNaN(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s)invalid('Некорректная дата.');
 return s;
}
function decimal(value:unknown,digits:number):string|null{
 if(value==null||value==='')return null;
 if(typeof value!=='string'&&typeof value!=='number')invalid('Некорректное число.');
 const s=String(value).trim().replace(',','.');
 if(!/^\d+(\.\d{1,2})?$/.test(s)||s.split('.')[0]!.length>digits)invalid('Укажите неотрицательное число, до двух знаков после запятой.');
 return s;
}
export function parseContract(value:unknown):ContractInput{
 if(!value||typeof value!=='object'||Array.isArray(value))invalid('Ожидаются реквизиты договора.');
 const v=value as Record<string,unknown>;
 const direction=v.direction;if(!['INCOME','EXPENSE','INTERNAL'].includes(String(direction)))invalid('Укажите тип договора.');
 const executor=text(v.executor,255);if(executor&&!['ОДИС','Автодор Инжиниринг'].includes(executor))invalid('Выберите исполнителя: ОДИС или организация в целом.');
 const d=date(v.date,true)!;const start=date(v.start),finish=date(v.finish);
 if(finish&&(finish<d||(start&&finish<start)))invalid('Окончание работ не может быть раньше заключения договора или начала работ.');
 const stages=v.stages==null||v.stages===''?null:Number(v.stages);
 if(stages!==null&&(!['string','number'].includes(typeof v.stages)||!Number.isInteger(stages)||stages<0||stages>2147483647))invalid('Количество этапов должно быть целым неотрицательным числом.');
 return {number:text(v.number,150,true)!,date:d,counterpartyId:id(v.counterpartyId),direction:direction as ContractInput['direction'],
 executor,start,finish,stages,hours:decimal(v.hours,12),amount:decimal(v.amount,16),
 note:text(v.note,10000),projectTypeId:v.projectTypeId==null||v.projectTypeId===''?null:id(v.projectTypeId),
 supervisorId:v.supervisorId==null||v.supervisorId===''?null:id(v.supervisorId),
 relatedContractId:v.relatedContractId==null||v.relatedContractId===''?null:id(v.relatedContractId)};
}
