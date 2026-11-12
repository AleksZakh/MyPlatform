export type UptsExportView={id:string;status:'PREPARED'|'QUEUED'|'RUNNING'|'READY'|'FAILED'|'CANCELLED';createdAt:string;expiresAt:string;objects:number;documents:number;bytes:number;processed:number;registry:boolean;types:string[];archiveBytes?:number;error?:string};
export type UptsExportPreview={objects:number;documents:number;bytes:number;limit:number;types:{name:string;count:number}[]};
