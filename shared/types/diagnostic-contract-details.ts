export interface ContractDetailCounts {
 works:number;
 structures:number;
}

/** Current structure assignments; plan/fact values are not inferred from hours. */
export interface ContractStructureWorkRecord {
 id:number;
 code:string;
 name:string;
 criteria:string;
 hours:string;
 note:string;
}
export interface ContractStructureWorksResponse {
 linkId:number;
 structureId:number;
 works:ContractStructureWorkRecord[];
}
