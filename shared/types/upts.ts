import type { WorkProjectDTO, WorkTaskDTO } from './work';
export const UPTS_TYPES = {
  LAND: 'Оформление территории',
  CONSTRUCTION: 'Подготовка строительства',
  RIGHTS: 'Оформление прав',
  OTHER: 'Иной проект',
} as const;
export const UPTS_STATUSES = {
  INTAKE: 'Входящие',
  ACTIVE: 'В работе',
  REVIEW: 'На проверке',
  HANDOVER: 'Передача материалов',
  DONE: 'Завершён',
} as const;
export const UPTS_READINESS = {
  TODO: 'Не начато',
  ACTIVE: 'В работе',
  BLOCKED: 'Требует внимания',
  DONE: 'Готово',
  NA: 'Не требуется',
} as const;
export const UPTS_AXES = {
  cadastral: 'Кадастровый учёт',
  rights: 'Оформление прав',
  restrictions: 'Ограничения',
  documents: 'Документы',
  handover: 'Передача строителям',
} as const;
export type Readiness = keyof typeof UPTS_READINESS;
export type UptsObjectLink = {
  id: number;
  projectId: number;
  objectId: number;
  object: {
    id: number;
    name: string;
    cadastralNumber: string | null;
    address: string;
  };
  goal: string;
  note: string;
  version: number;
} & Record<keyof typeof UPTS_AXES, Readiness>;
export type UptsContractDTO = {
  id: number;
  projectId: number;
  number: string;
  name: string;
  counterparty: string;
  signedDate: string | null;
  dueDate: string | null;
  version: number;
};
export type UptsProjectDTO = WorkProjectDTO & {
  upts: {
    projectType: keyof typeof UPTS_TYPES;
    status: keyof typeof UPTS_STATUSES;
    basis: string;
    initiator: string;
    receivedDate: string | null;
    completionNote: string;
    isDemo: boolean;
    objects: UptsObjectLink[];
    contracts: UptsContractDTO[];
  };
};
export type UptsSnapshot = {
  projects: UptsProjectDTO[];
  tasks: WorkTaskDTO[];
  today: string;
};
export const UPTS_TEMPLATES = {
  LAND: [
    'Проверить исходные материалы',
    'Уточнить границы и исходные сведения',
    'Подготовить кадастровые материалы',
    'Подготовить документы для оформления прав',
    'Проверить ограничения',
    'Собрать комплект для передачи',
  ],
  CONSTRUCTION: [
    'Проверить задание на подготовку территории',
    'Определить перечень объектов',
    'Проверить права и ограничения',
    'Согласовать состав материалов',
    'Подготовить передачу строителям',
  ],
  RIGHTS: [
    'Изучить основания оформления прав',
    'Собрать исходные документы',
    'Подготовить комплект для подачи',
    'Проверить результат оформления',
  ],
  OTHER: ['Уточнить задание', 'Подготовить материалы', 'Проверить результат'],
} as const;
