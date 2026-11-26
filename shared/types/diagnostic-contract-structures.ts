export interface ContractStructureListItem {
 id:number;
 structureId:number;
 stage:number;
 decommissioned?:boolean;
 locationMetres:number|null;
 code:string;
 structureName:string;
 roadName:string;
 location:string;
 additionalId:string;
 obstacleName:string;
 district:string;
}
