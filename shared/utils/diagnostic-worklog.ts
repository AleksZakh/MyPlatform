import type { Worksheet } from 'exceljs';
import { structureLocationMetres } from './diagnostic-structures';

export const workColumns = [
  'Полевые работы',
  'АИС фото',
  'АИС дефекты',
  'АИС чертеж',
  'АИС конструктив',
  'АИС оценка',
  'АИС видео',
] as const;
export const workHints = ['301', '311', '308', '312', '305', '316', '315'];
export function isM4Worklog(fileName: string) {
  return /[мm][‐‑–—-]?4\D+933\s*[-–—]\s*1024/i.test(fileName);
}
export const crews: Record<string, string[]> = {
  КИН: ['Комов С.Н.', 'Иликаев А.В.', 'Наумов П.А.'],
  МК: ['Морозов А.В.', 'Крушинский Р.О.'],
};
export interface WorklogRow {
  row: number;
  stage: number;
  name: string;
  additional: string;
  location: string;
  code: string;
  colored: boolean;
  length: string;
  note: string;
  cells: string[];
  origin: string[];
  reportRefs?: [string,string,string];
}
export const normalized = (s: string) => s.normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' ');
export function locationKey(s: string) {
  return String(structureLocationMetres(s) ?? normalized(s));
}
export function suggestedNumber(file: string) {
  return [
    ...(file
      .replace(/\.xlsx$/i, '')
      .replace(/^ход[ _-]+работ[ _-]*/i, '')
      .trim() || 'Ход работ'),
  ]
    .slice(0, 15)
    .join('');
}
export function readWorklogSheet(sheet: Worksheet): WorklogRow[] {
  if (sheet.rowCount > 20001 || sheet.columnCount > 100)
    throw new Error('Лист превышает 20 000 строк или 100 столбцов.');
  const headers = Array.from({ length: sheet.columnCount }, (_, i) =>
    normalized(sheet.getCell(1, i + 1).text).replace(/ё/g, 'е'),
  );
  const column = (name: string, required = false) => {
    const ix = headers.indexOf(normalized(name));
    if (required && ix < 0) throw new Error('Отсутствует столбец «' + name + '».');
    return ix + 1;
  };
  const nameCol = column('Сооружение', true),
    placeCol = column('Местоположение по ТЗ, км', true),
    codeCol = column('Код ИССО', true);
  const stageCol = column('Этап', true),
    lengthCol = column('Полная длина по РД, м'),
    noteCol = column('Примечание');
  const works = workColumns.map((c) => column(c));
  if (works.every((c) => !c)) throw new Error('Не найдены столбцы работ.');
  const refs = [column('№ п/п'), column('№ по ТЗ'), column('ПК+')];
  const rows: WorklogRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const nameCell = sheet.getCell(r, nameCol);
    if (nameCell.isMerged && nameCell.master.address !== nameCell.address) continue;
    const val = (col: number) => {
      if (!col) return '';
      const cell = sheet.getCell(r, col);
      if (cell.isMerged && cell.master.address !== cell.address) return '';
      const v = cell.value;
      if (v && typeof v === 'object' && ('formula' in v || 'sharedFormula' in v || 'error' in v))
        throw new Error('Проверьте значение ячейки ' + cell.address);
      if (col === codeCol && typeof v === 'number') {
        if (!Number.isSafeInteger(v) || v < 0) throw new Error('Некорректный код ИССО в ' + cell.address);
        return /^0+$/.test(cell.numFmt) ? String(v).padStart(cell.numFmt.length, '0') : String(v);
      }
      return cell.text.trim();
    };
    const name = val(nameCol),
      location = val(placeCol),
      code = val(codeCol);
    if (!name && !location && !code && !works.some((c) => val(c))) continue;
    if (!name || !location) throw new Error('Не заполнено сооружение или место в строке ' + r);
    const stageValue = val(stageCol).toUpperCase();
    const roman = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
    const stage = stageValue ? Number(stageValue) || roman.indexOf(stageValue) : 1;
    if (!Number.isSafeInteger(stage) || stage < 1) throw new Error('Неизвестный этап в строке ' + r);
    const fill = nameCell.fill;
    const color: { argb?: string; theme?: number; tint?: number; indexed?: number } | undefined =
      fill?.type === 'pattern' && fill.pattern !== 'none' ? fill.fgColor : undefined;
    const colored =
      !!color &&
      (color.argb
        ? !/^(?:..)?FFFFFF$/i.test(color.argb)
        : color.theme != null
          ? color.theme !== 0 || !!color.tint
          : color.indexed !== 64 && color.indexed !== 9);
    const origin = Array.from({ length: sheet.columnCount }, (_, i) => val(i + 1));
    while (origin.length && !origin[origin.length - 1]) origin.pop();
    const extras = origin.filter((v, i) => v && !headers[i]);
    const parts = name.match(/^(.*?)\s*\(([^()]*)\)$/);
    rows.push({
      row: r,
      stage,
      name: parts?.[1]?.trim() || name,
      additional: parts?.[2]?.trim() || '',
      location,
      code: code.toUpperCase(),
      colored,
      length: val(lengthCol),
      note: [val(noteCol), ...extras].filter(Boolean).join('\n'),
      cells: works.map(val),
      origin,
      ...(refs.some((col,i) => col !== [1,2,6][i]) ? { reportRefs: [val(refs[0]!),val(refs[1]!),val(refs[2]!)] as [string,string,string] } : {}),
    });
  }
  if (!rows.length) throw new Error('На листе нет сооружений.');
  return rows;
}

export function resolvePeople(value: string, employees: { name: string }[]) {
  const tokens = crews[value.toUpperCase()] || [value];
  const names: string[] = [];
  for (const token of tokens) {
    const [surname, ...initials] = normalized(token).split(/\s+/);
    const hits = employees.filter((person) => {
      const [s, ...rest] = normalized(person.name).split(/\s+/);
      return (
        s === surname &&
        (!initials.length ||
          rest.map((x) => (x.includes('.') ? x.replace(/\./g, '') : x[0])).join('') ===
            initials.join('').replace(/\./g, ''))
      );
    });
    if (hits.length !== 1) return [];
    names.push(hits[0]!.name);
  }
  return names;
}
