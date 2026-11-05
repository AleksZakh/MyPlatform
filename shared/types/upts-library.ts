export const UPTS_CONTRACT_TYPES = {
  LAND: "Земельный участок",
  OKS: "Объект капитального строительства",
  ZOUIT: "Зона с особыми условиями использования территории",
  IPE: "Имущественно-правовая экспертиза",
  MARKS: "Межевые знаки",
  OTHER: "Иное",
} as const;
export type UptsContractType = keyof typeof UPTS_CONTRACT_TYPES;
export type UptsWorkDefinition = {
  responsibleRole?: "CURATOR" | "ENGINEER" | null;
  expectedResult?: string;
  id: number;
  name: string;
  contractType: UptsContractType;
  active: boolean;
  version: number;
};
export type UptsWorkTemplate = {
  workKindKey?: string | null;
  id: number;
  name: string;
  contractType: UptsContractType;
  active: boolean;
  version: number;
  items: { workId: number; position: number; work: UptsWorkDefinition }[];
};
export type UptsLibrary = {
  works: UptsWorkDefinition[];
  templates: UptsWorkTemplate[];
  canManage: boolean;
};
