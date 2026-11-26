export interface ContractWorkRecord {
 workId?:number;
 version:number;tripManaged:boolean;autoComplete:boolean;
 id:number;code:string;name:string;criteria:string;note:string;status:string;
 planStart:string|null;planFinish:string|null;planHours:string|null;planExecutor:string;
 factStart:string|null;factFinish:string|null;factHours:string|null;factExecutor:string;
}
