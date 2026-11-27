import { workColumns, workHints } from './diagnostic-worklog';
import { reportGroup } from './diagnostic-report-parts';

export const progressHeaders = [
  '№ п/п',
  '№ по ТЗ',
  'Этап',
  'Сооружение',
  'Местоположение по ТЗ, км',
  'ПК+',
  'Код ИССО',
  'Полная длина по РД, м',
  ...workColumns,
  'Примечание',
];
export type ProgressFilter = { contracts: number[]; links: number[]; statuses: string[]; centers: string[] };
export type ProgressWork = {
  id: number;
  version: number;
  workId: number;
  name: string;
  plan: string;
  fact: string;
  note: string;
  status: string;
  managed: boolean;
  text: string;
  kind: 'work' | 'trip' | 'crew';
};
export type ProgressRow = {
  linkId: number;
  contractId: number;
  contractNumber: string;
  contractVersion: number;
  stages: number;
  stage: number;
  sheetOrdinal: string;
  specNumber: string;
  picket: string;
  worklogCrew: string;
  structure: {
    id: number;
    version: number;
    code: string;
    roadName: string;
    location: string;
    structureName: string;
    additionalId: string;
    lengthRaw: string;
    note: string;
    retired: boolean;
  };
  active: boolean;
  works: ProgressWork[][];
  values: string[];
};
export type ProgressReport = {
  rows: ProgressRow[];
  contracts: { id: number; number: string }[];
  token: string;
  employees: { id: number; name: string }[];
  catalog: { id: number; name: string; columns: number[] }[];
  warning: string | null;
};
export function progressColumns(
  work: { code: string; fieldWork: boolean; reportPart: string },
  origin?: unknown,
) {
  const columns = new Set<number>();
  const original = (origin as { column?: number } | null)?.column;
  if (
    typeof original === 'number' &&
    Number.isInteger(original) &&
    original >= 0 &&
    original < workColumns.length
  )
    columns.add(original);
  const group = reportGroup(work.reportPart);
  if (work.fieldWork || group === 'Полевые работы') columns.add(0);
  if (group === 'АИС Конструктив') columns.add(4);
  const code = workHints.indexOf(work.code);
  if (code >= 0 && code !== 0 && code !== 4) columns.add(code);
  return [...columns];
}
