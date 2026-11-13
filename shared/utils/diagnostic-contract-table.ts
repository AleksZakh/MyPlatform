import type {ContractStructureListItem} from '../types/diagnostic-contract-structures';
export const structureFilterColumns=[
 {key:'code',label:'Код ИССО'},{key:'structureName',label:'Сооружение'},
 {key:'roadName',label:'Название автодороги'},{key:'location',label:'Место, км'},
 {key:'additionalId',label:'Доп. инф.'},{key:'obstacleName',label:'Название осн. препятствия'},
 {key:'district',label:'Район расположения'},
] as const;
export type StructureFilterKey=typeof structureFilterColumns[number]['key'];
export type StructureFilters=Record<StructureFilterKey,string>;
export const emptyStructureFilters=():StructureFilters=>({code:'',structureName:'',roadName:'',location:'',additionalId:'',obstacleName:'',district:''});
export const filterText=(value:string)=>value.normalize('NFKC').trim().toLocaleLowerCase('ru-RU').replace(/ё/g,'е');
export function structureMatches(row:ContractStructureListItem,filters:StructureFilters,except?:StructureFilterKey){
 return structureFilterColumns.every(({key})=>key===except||filterText(row[key]||'').includes(filterText(filters[key])));
}
export const workStatusLegend=[
 {key:'unplanned',label:'Нераспределённые',title:'Не распределена'},
 {key:'planned',label:'Запланированные',title:'Запланирована'},
 {key:'in_progress',label:'Выполняемые',title:'Выполняется'},
 {key:'completed',label:'Выполненные',title:'Выполнена'},
 {key:'overdue',label:'Просроченные',title:'Просрочена'},
] as const;
export function diagnosticWorkStatus(value:string|null|undefined){
 const raw=value?.trim()||'';
 const key=({scheduled:'planned',active:'in_progress',performed:'in_progress'} as Record<string,string>)[raw]||raw;
 return workStatusLegend.find(s=>s.key===key)??{key:'unknown',label:'Неизвестный статус',title:raw?'Неизвестный статус: '+raw:'Статус не указан'};
}
