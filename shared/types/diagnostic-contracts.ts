
export type ContractStatus='PLANNED'|'ACTIVE'|'COMPLETED';
export type ContractDirection='INCOME'|'EXPENSE'|'INTERNAL';
export interface ContractInput {
 number:string; date:string; counterpartyId:number; direction:ContractDirection;
 executor:string|null; start:string|null; finish:string|null; stages:number|null;
 hours:string|null; amount:string|null; note:string|null; projectTypeId:number|null;
 supervisorId:number|null; relatedContractId:number|null;
}
export interface ContractRecord extends ContractInput {
 createdById:number;updatedById:number;createdAt:string;updatedAt:string;creator:string;editor:string;relatedContractNumber:string|null;
 id:number;version:number;status:ContractStatus;buildings:number;counterparty:string;
 projectType:string|null;supervisor:string|null;deletedAt:string|null;
}
export interface DiagnosticCatalog {
 canManageTrash:boolean;
 counterparties:{id:number;name:string}[];projectTypes:{id:number;name:string}[];
 supervisors:{id:number;name:string}[];supervisorWarning:string|null;
 incomeContracts:{id:number;number:string;counterparty:string}[];
}
export const contractStatuses=[{key:'PLANNED',label:'Планируемые'},{key:'ACTIVE',label:'Выполняемые'},{key:'COMPLETED',label:'Завершенные'}] as const;
export const directionLabels={INCOME:'Доходный',EXPENSE:'Расходный',INTERNAL:'Внутренний'};
