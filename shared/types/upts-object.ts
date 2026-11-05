/** Object card. Internal contract IDs/routes remain stable for existing links and files. */
export type UptsObjectDetails = {
  road?: string;
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
  otherDescription?: string;
};
export type UptsWorkMeta = {
  definitionId?: number;
  workKindKey?: string | null;
  responsibleRole?: 'CURATOR' | 'ENGINEER' | null;
  expectedResult?: string;
};
