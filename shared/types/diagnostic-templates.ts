import type {StructureListRow} from './diagnostic-structures-api';
import type {Category} from '../utils/diagnostic-planning';
export interface WorkTemplate {id:number;name:string;category:Category;author:string;unavailable:number;items:DraftWork[]}
export interface TemplateUse {templateId:number;structureIds:number[]}

export interface ContractAdditions {workIds:number[];structureIds:number[]}
export interface DraftWork {id:number;name:string;code:string;note?:string|null}
export interface ContractSelection {
 template?:{id:number;name:string};
 works:DraftWork[];
 structures:StructureListRow[];
}
