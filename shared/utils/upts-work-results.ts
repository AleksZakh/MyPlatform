import type {UptsWorkMeta} from '../types/upts-object';
export const UPTS_DOCUMENT_TYPES=['Выписка из ЕГРН','Чертёж','Схема','Приостановка/отказ Росреестра','Отчёт','Межевой план','Технический план','КУВД','Результаты измерений','Акт обследования','Акт выполненных работ','Подписанный комплект','XML-схема','Итоговый документ','Иное'] as const;
export type WorkResultRequirement={key:string;label:string;field?:'resultText'|'kuvdEntries';documents?:string[]};
const norm=(s:string)=>s.toLocaleLowerCase('ru').replace(/ё/g,'е').replace(/\s+/g,' ').trim();
/** Explicit rules for the result names in the UPTS library. Unrecognised results require text. */
export function workResultRequirements(expected=''):WorkResultRequirement[]{
 const value=norm(expected),rules:WorkResultRequirement[]=[];
 if(value.includes('кувд'))rules.push({key:'kuvd',label:'№ КУВД и дата КУВД',field:'kuvdEntries'});
 if(value.includes('выписк'))rules.push({key:'extract',label:'Выписка из ЕГРН',documents:['Выписка из ЕГРН']});
 if(rules.length)return rules;
 if(value.includes('xml'))return [{key:'xml',label:'XML-схема',documents:['XML-схема']}];
 if(value.includes('схем'))return [{key:'scheme',label:'Схема или чертёж',documents:['Схема','Чертёж']}];
 if(value==='мп'||value.includes('межевой план'))return [{key:'mp',label:'Межевой план',documents:['Межевой план']}];
 if(value==='тп'||value.includes('технический план'))return [{key:'tp',label:'Технический план',documents:['Технический план']}];
 if(value.includes('акт обследования'))return [{key:'inspection',label:'Акт обследования',documents:['Акт обследования']}];
 if(value.includes('акт выполненных'))return [{key:'act',label:'Акт выполненных работ',documents:['Акт выполненных работ']}];
 if(value.includes('комплект'))return [{key:'package',label:'Подписанный комплект',documents:['Подписанный комплект']}];
 if(value.includes('отчет'))return [{key:'report',label:'Отчёт',documents:['Отчёт']}];
 if(value.includes('измерени'))return [{key:'measurement',label:'Результаты измерений: текст или документ',field:'resultText',documents:['Результаты измерений']}];
 if(value.includes('распоряжени'))return [{key:'order',label:'№ распоряжения',field:'resultText'}];
 return [{key:'result',label:expected||'Результат работы: текст или итоговый документ',field:'resultText',...(!expected?{documents:['Итоговый документ']}: {})}];
}
export function evaluateWorkResult(meta:UptsWorkMeta,documentTypes:(string|null)[]){
 const requirements=workResultRequirements(meta.expectedResult);
 const checks=requirements.map(r=>({...r,done:!!((r.field==='resultText'&&meta.resultText?.trim())||(r.field==='kuvdEntries'&&meta.kuvdEntries?.some(e=>e.number.trim()&&e.date))||r.documents?.some(type=>documentTypes.includes(type)))}));
 return {complete:checks.every(r=>r.done),checks};
}
export function workResultInstructions(expected=''){
 const actions=workResultRequirements(expected).map(r=>{
  const documents=r.documents?.map(t=>'«'+t+'»').join(' или ');
  if(r.field==='kuvdEntries')return 'укажите номер и дату КУВД';
  if(r.field==='resultText'&&documents)return 'внесите результат в текстовое поле или прикрепите документ типа '+documents;
  if(documents)return 'прикрепите документ типа '+documents;
  return r.key==='order'?'укажите номер распоряжения':'заполните поле «'+r.label+'»';
 });
 return 'Для автоматического завершения работы и перехода в статус «Выполнена» '+actions.join(' и ')+'. Текстовые данные сохраните кнопкой «Сохранить»; документы учитываются после успешной загрузки.';
}
