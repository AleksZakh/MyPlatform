export type TripStatus='PLANNED'|'COMPLETED';
export interface TripInput {
 contractId:number;executorId:number;start:string;finish:string;noStructures:boolean;destination:string;
 assignment:string;equipment:string;transport:string;accommodation:string;note:string;participantIds:number[];structureIds:number[];
}
export interface TripStructureItem {id:number;code:string;structureName:string;roadName:string;location:string;additionalId:string;region:string;locationMetres:number|null}
export interface TripRecord extends TripInput {
 id:number;number:string;version:number;status:TripStatus;contractNumber:string;executor:string;
 participants:{id:number;name:string}[];structures:TripStructureItem[];legacyIds:number[];closedAt:string|null;
}
export interface TripCatalog {contracts:{id:number;number:string}[];executors:{id:number;name:string}[];participants:{id:number;name:string}[];directoryParticipants?:{directoryObjectId:string;name:string}[];warning:string|null}
export interface TripWorkCandidate {id:number;kind:'contract'|'structure';name:string;structureCode:string;version:number;status:string;planStart:string|null;planFinish:string|null;planHours:string|null;planExecutor:string;factStart:string|null;factFinish:string|null;factHours:string|null;factExecutor:string}
export interface TripWorkFact {id:number;kind:'contract'|'structure';version:number;start:string;finish:string;hours:string;executorId:number}
