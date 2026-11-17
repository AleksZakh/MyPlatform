import type {UptsObjectDetails,UptsObjectStage,UptsWorkMeta} from '../types/upts-object';
import {UPTS_CONTRACT_TYPES} from '../types/upts-library';
import {workKindName} from './upts-work-kinds';
export const objectTypeName=(type?:string|null,d?:UptsObjectDetails|null)=>type==='OKS'?(d?.oksKind==='LINEAR'?'Объект капитального строительства (лин.)':'Объект капитального строительства (площ.)'):UPTS_CONTRACT_TYPES[type as keyof typeof UPTS_CONTRACT_TYPES]||'';
export const objectMeasureLabel=(type?:string|null,d?:UptsObjectDetails|null)=>type==='OKS'&&d?.oksKind==='LINEAR'?'Протяжённость, км':'Площадь, кв. м';
export const objectMeasureValue=(type?:string|null,d?:UptsObjectDetails|null)=>type==='OKS'&&d?.oksKind==='LINEAR'?d?.sourceLength:d?.sourceArea;
export function lastStage(d?:UptsObjectDetails|null,tasks:{uptsWorkMeta?:UptsWorkMeta|null}[]=[]){
 return Math.max(d?.stageCount||1,...(d?.stages||[]).map(s=>s.number),...tasks.map(t=>t.uptsWorkMeta?.stageNumber||1));
}
/** Include occupied and explicitly saved stages; never allocate an array sized by a legacy count. */
export function objectStages(d?:UptsObjectDetails|null,tasks:{uptsWorkMeta?:UptsWorkMeta|null}[]=[]):UptsObjectStage[]{
 const map=new Map((d?.stages||[]).map(s=>[s.number,{...s}]));
 for(const t of tasks){const number=t.uptsWorkMeta?.stageNumber||1;if(!map.has(number))map.set(number,{number,workKindKey:t.uptsWorkMeta?.workKindKey,startDate:null,endDate:null});}
 if(!map.size)map.set(1,{number:1,workKindKey:d?.workKindKey,startDate:d?.workStartDate||null,endDate:null});
 return [...map.values()].sort((a,b)=>a.number-b.number);
}
export const stageLabel=(s:UptsObjectStage)=>`Этап ${s.number}`+(workKindName(s.workKindKey)?' · '+workKindName(s.workKindKey):'');
/** Legacy objects can have repeated kinds; retain them, but do not offer another copy. */
export function usedWorkKinds(d?:UptsObjectDetails|null,tasks:{uptsWorkMeta?:UptsWorkMeta|null}[]=[]){
 return [...new Set([...(d?.workKindKeys||[]),d?.workKindKey,...(d?.stages||[]).map(s=>s.workKindKey),...tasks.flatMap(t=>[t.uptsWorkMeta?.workKindKey,...(t.uptsWorkMeta?.workKindKeys||[])])].filter((key):key is string=>!!key))];
}
