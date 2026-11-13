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
 hours:string|null;
 note:string;
 status:string;warning:string;
 planStart:string|null;planFinish:string|null;planHours:string|null;planExecutor:string;
 factStart:string|null;factFinish:string|null;factHours:string|null;factExecutor:string;
}
export interface ContractStructureWorksResponse {
 linkId:number;
 structureId:number;
 works:ContractStructureWorkRecord[];
}
