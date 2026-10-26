export function positiveId(value: unknown): number {
  if ((typeof value !== 'number' && typeof value !== 'string') ||
      !/^[1-9]\d*$/.test(String(value))) throw new Error('Ожидался положительный целый идентификатор.');
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n > 2147483647) throw new Error('Некорректный идентификатор.');
  return n;
}
export function workCode(groupId: number, sequence: number): string {
  if (!Number.isInteger(groupId) || groupId < 1 || groupId > 9) throw new Error('Неизвестная группа.');
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > 2147483646) throw new Error('Некорректный порядковый номер.');
  return sequence <= 99 ? String(groupId * 100 + sequence) : `${groupId * 100}.${sequence - 99}`;
}
export function textField(value: unknown, label: string, max: number, optional = false): string {
  if (typeof value !== 'string') {
    if (optional && value == null) return '';
    throw new Error(`Заполните поле «${label}».`);
  }
  const s = value.trim();
  if ((!optional && !s) || s.length > max) throw new Error(`Поле «${label}»: ${optional ? 'не более' : 'от 1 до'} ${max} символов.`);
  return s;
}
export function hoursValue(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('Укажите трудоёмкость.');
  const s = String(value).trim().replace(',', '.');
  if (!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,4})?$/.test(s)) throw new Error('Трудоёмкость: от 0 до 99999999,9999 чел·ч, до четырёх знаков после запятой.');
  return s;
}
export function parseWork(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Некорректная карточка работы.');
  const b = value as Record<string, unknown>;
  const groupId = positiveId(b.groupId);
  if (groupId > 9) throw new Error('Неизвестная группа.');
  return { groupId, categoryId: positiveId(b.categoryId), name: textField(b.name, 'Наименование', 300),
    hours: hoursValue(b.hours), criteria: textField(b.criteria, 'Критерий приёмки', 2000),
    note: textField(b.note, 'Примечание', 4000, true) };
}

