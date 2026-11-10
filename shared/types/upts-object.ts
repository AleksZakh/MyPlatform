/** Object card. Internal contract IDs/routes remain stable for existing links and files. */
export type UptsObjectDetails = {
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
export type UptsStageWork = {
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
