import type {StructureListRow} from './diagnostic-structures-api';
import type {Category} from '../utils/diagnostic-planning';
export interface WorkTemplate {id:number;version:number;name:string;category:Category;author:string;unavailable:number;items:DraftWork[]}
export interface TemplateUse {templateId:number;version?:number;structureIds:number[]}

export interface ContractAdditions {workIds:number[];structureIds:number[]}
export interface DraftWork {id:number;name:string;code:string;note?:string|null}
export interface ContractSelection {
 template?:{id:number;version:number;name:string};
 works:DraftWork[];
 structures:StructureListRow[];
 structureStages?:Record<number,number>;
}
