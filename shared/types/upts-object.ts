/** Object card. Internal contract IDs/routes remain stable for existing links and files. */
export type UptsObjectDetails = {
  /** Stages are stored separately from task results and actual dates. */
  stages?: UptsObjectStage[];
  oksKind?: 'AREA' | 'LINEAR';
  sourceLength?: string;
  basisContractNumber?: string;
  requestNumber?: string;
  landCategory?: string;
  basisContractDate?: string | null;
  workStartDate?: string | null;
  stageCount?: number | null;
  road?: string;
  address?: string;
  stage?: string;
  rightHolders?: string[];
  region?: string;
  dealType?: string;
  sourceCadastralNumber?: string;
  sourceArea?: string;
  rightKind?: string;
  permittedUses?: string[];
  accountingType?: string;
  kuvdEntries?: { number: string; date: string | null }[];
  curatorId?: number | null;
  engineerId?: number | null;
  workKindKey?: string | null;
  workKindKeys?: string[];
  otherDescription?: string;
};
export type UptsWorkMeta = {
  kuvdEntries?:{number:string;date:string|null}[];
  resultText?:string;
  startedAt?:string;
  completedAt?:string;
  stageNumber?: number;
  definitionId?: number;
  workKindKey?: string | null;
  workKindKeys?: string[];
  responsibleRole?: 'CURATOR' | 'ENGINEER' | null;
  expectedResult?: string;
};
export type UptsStageWork = Pick<UptsWorkMeta, 'workKindKey' | 'workKindKeys'> & {
  key: string;
  name: string;
  responsibleRole?: 'CURATOR' | 'ENGINEER' | null;
  expectedResult?: string;
  status?: string;
};
export type UptsTaskStageRow = {
  id: number; version: number; title: string; status: string;
  uptsWorkMeta: UptsWorkMeta | null;
};

export type UptsObjectStage = {
  number: number;
  workKindKey?: string | null;
  startDate: string | null;
  endDate: string | null;
};
export type UptsStageBatch = {
  stageNumber: number;
  workKindKey: string;
  startDate: string | null;
  endDate: string | null;
  selectedWorks: {id:number;version:number}[];
};
