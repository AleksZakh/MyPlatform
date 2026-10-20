import { dateKey } from './work-board';

export type WorkTaskOrder = 'schedule' | 'timeline';
export type WorkDateField = 'plannedDate' | 'startDate' | 'dueDate';
type DatedTask = { id: number } & Record<WorkDateField, string | Date | null>;

export function workDateFields(order: WorkTaskOrder): WorkDateField[] {
  return order === 'timeline'
    ? ['startDate', 'dueDate', 'plannedDate']
    : ['plannedDate', 'startDate', 'dueDate'];
}

/** Date-only fields: no timezone conversion. Empty dates always follow dated work. */
export function compareWorkTasks(a: DatedTask, b: DatedTask, order: WorkTaskOrder = 'schedule'): number {
  const fields = workDateFields(order);
  const primary = (task: DatedTask) => fields.map(key => dateKey(task[key])).find(Boolean) || null;
  const compare = (x: string | null, y: string | null) => x === y ? 0 : x === null ? 1 : y === null ? -1 : x < y ? -1 : 1;
  let result = compare(primary(a), primary(b));
  for (const field of ['dueDate', 'startDate', 'plannedDate'] as const) {
    if (result) return result;
    result = compare(dateKey(a[field]), dateKey(b[field]));
  }
  return result || a.id - b.id;
}
