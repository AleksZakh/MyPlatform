import type {ContractWorkRecord} from "./diagnostic-contract-works";
export interface ContractDetailCounts {
 works:number;
 structures:number;
}

/** Current structure assignments; plan/fact values are not inferred from hours. */
export interface ContractStructureWorkRecord extends ContractWorkRecord {
 hours:string|null;
 warning:string;
}
export interface ContractStructureWorksResponse {
 linkId:number;
 structureId:number;
 works:ContractStructureWorkRecord[];
}
