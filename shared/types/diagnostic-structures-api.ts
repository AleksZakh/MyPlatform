import type {StructureRecord,StructureFilters,StructureSortKey} from './diagnostic-structures';
export interface StructureListRow {id:string;issoCode:string;roadName:string;structureName:string;issoType:string;additionalId:string;location:string;region:string;management:string;}
export interface StructureListResponse {items:StructureListRow[];total:number;matched:number;page:number;pageSize:number;pageCount:number;}
export interface StructureCatalog {roads:string[];management:string[];regions:string[];kinds:string[];types:string[];}
export interface StructureQuery {filters:StructureFilters;page:number;pageSize:number;sortKey:StructureSortKey;descending:boolean;}
export interface StructureDetail extends StructureRecord {
  lengthRaw:string;
  legacyIds:number[];
  importedAt:string|null;
  importers:string[];
  creator:string;
  editor:string;
  createdAt:string;
  updatedAt:string;
  legacyContracts:{customer:string;number:string;dateText:string}[];
  legacyExecutors:string[];
}
