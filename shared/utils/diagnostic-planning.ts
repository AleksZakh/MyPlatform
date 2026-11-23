import { tripDay, tripDateLabel } from './diagnostic-trips';
import type { TripStructureItem } from '../types/diagnostic-trips';
import type { ContractStatus } from '../types/diagnostic-contracts';
export const categoryNames = {
  contract: 'Работы с договором',
  structure: 'Работы по сооружению',
  other: 'Недоговорные работы',
} as const;
export type Category = keyof typeof categoryNames;
export const contractLabels = {
  ACTIVE: 'Действующие',
  PLANNED: 'Планируемые',
  COMPLETED: 'Закрытые',
} as const;
export type PlanContract = {
  id: number;
  number: string;
  start: string | null;
  finish: string | null;
  status: ContractStatus;
};
export type PlanStructure = TripStructureItem & { linkId: number };
export type Person = { id: number; name: string };
export type PlanLibrary = {
  id: number;
  code: string;
  name: string;
  group: string;
  category: Category;
  hours: string;
  note: string;
};
export type PlanItem = {
  id: number;
  origin: 'existing' | 'library';
  category: Category;
  linkId: number | null;
  version: number;
};
export type PlanRow = PlanItem & {
  code: string;
  isso: string;
  name: string;
  group: string;
  hours: string | null;
  executor: string;
  status: string;
  available: boolean;
};
export type PlanOptions = {
  contracts: PlanContract[];
  employees: Person[];
  currentUserId: number;
  library: PlanLibrary[];
};
export type TripSource = { id: number; version: number; structureId: number; name: string };
export type TripDraft = {
  contractId: number;
  start: string;
  finish: string;
  participant: Person;
  structures: TripStructureItem[];
  sources: TripSource[];
  assignment: string;
};
export const itemKey = (r: PlanItem) => [r.category, r.origin, r.linkId || 0, r.id].join('/');
export const isTravel = (r: { category: Category; code: string }) =>
  r.category === 'structure' && ['301', '302'].includes(r.code);
export function dateIssue(c: Pick<PlanContract, 'start' | 'finish'>, start: string, finish: string) {
  for (const date of [start, finish]) {
    if (!date) continue;
    if (!tripDay(date)) return 'Введите дату в формате дд.мм.гггг.';
    if (c.start && date < c.start) return 'Работы по договору начинаются ' + tripDateLabel(c.start) + '.';
    if (c.finish && date > c.finish)
      return 'Работы по договору заканчиваются ' + tripDateLabel(c.finish) + '.';
  }
  if (start && finish && start > finish) return 'Дата начала позже даты окончания.';
  return '';
}
export function freeWork(w: {
  status: string;
  planExecutor: string;
  factExecutor: string;
  factStart: unknown;
  factFinish: unknown;
  factHours: unknown;
}) {
  return (
    ['', 'unplanned'].includes(w.status.trim().toLowerCase()) &&
    !w.planExecutor.trim() &&
    !w.factExecutor.trim() &&
    w.factStart === null &&
    w.factFinish === null &&
    w.factHours === null
  );
}
export function libraryRow(w: PlanLibrary, s?: PlanStructure): PlanRow {
  return {
    id: w.id,
    version: 0,
    origin: 'library',
    category: w.category,
    linkId: s?.linkId ?? null,
    isso: s?.code ?? '',
    code: w.code,
    name: w.name,
    group: w.group,
    hours: w.hours,
    executor: '',
    status: 'unplanned',
    available: true,
  };
}
