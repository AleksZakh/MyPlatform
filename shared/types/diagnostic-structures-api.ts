import type {StructureRecord,StructureFilters,StructureSortKey} from './diagnostic-structures';
export interface StructureListRow {obstacleName?:string;district?:string;id:string;issoCode:string;roadName:string;structureName:string;issoType:string;additionalId:string;location:string;region:string;management:string;}
export interface StructureListResponse {items:StructureListRow[];total:number;matched:number;page:number;pageSize:number;pageCount:number;}
export interface StructureCatalog {roads:string[];management:string[];regions:string[];kinds:string[];types:string[];}
export interface StructureQuery {filters:StructureFilters;page:number;pageSize:number;sortKey:StructureSortKey;descending:boolean;}
export interface StructureContractUsage {
  id:number;
  number:string;
  date:string;
  stage:number;
}
export interface StructureDetail extends StructureRecord {
  decommissionedAt: string | null;
  version:number;
  contracts:StructureContractUsage[]|null;
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

export type StructureRemovalMode = 'decommission'|'permanent';
export interface StructureRemovalInfo {
  version:number;
  contracts:number;
  trips:number;
  legacyContracts:number;
  canDeletePermanently:boolean;
}

export interface SavedStructure extends StructureListRow {
  locationMetres: number | null;
  obstacleName: string;
  district: string;
}
export interface StructureHistoryEntry {
  id: number;
  date: string;
  actor: string;
  action: string;
  source: string | null;
  fields: { label: string; before: string; after: string }[];
}
export interface StructureHistoryPage { items: StructureHistoryEntry[]; next: number | null }
