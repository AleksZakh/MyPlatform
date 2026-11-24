import type {Category} from '../utils/diagnostic-planning';
export interface WorkTemplate {id:number;name:string;category:Category;author:string;unavailable:number;items:{id:number;name:string;code:string}[]}
export interface TemplateUse {templateId:number;structureIds:number[]}
