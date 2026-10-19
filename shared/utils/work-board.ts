export function dateKey(value: string | Date | null | undefined): string | null {
 return value ? (typeof value === 'string' ? value : value.toISOString()).slice(0, 10) : null;
}
export function portalToday(now = new Date()): string {
 const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
 return ['year','month','day'].map(k => parts.find(p => p.type === k)?.value).join('-');
}
export function shiftDay(day: string, offset: number): string {
 const date = new Date(day + 'T00:00:00Z'); date.setUTCDate(date.getUTCDate() + offset); return date.toISOString().slice(0,10);
}
export function timeBucket(task: { status: string; plannedDate: string | null; dueDate: string | null }, today: string): string {
 if (task.status === 'DONE') return 'done';
 const planned = dateKey(task.plannedDate), due = dateKey(task.dueDate);
 if ((due && due < today) || (planned && planned < today)) return 'overdue';
 if (!planned) return 'unscheduled';
 if (planned === today) return 'today';
 if (planned === shiftDay(today,1)) return 'tomorrow';
 if (planned <= shiftDay(today,7)) return 'week';
 return 'later';
}
export const TIME_COLUMNS = [
 { key: 'overdue', label: 'Просрочено / перенести' }, { key: 'today', label: 'Сегодня' },
 { key: 'tomorrow', label: 'Завтра' }, { key: 'week', label: 'Ближайшие 7 дней' },
 { key: 'later', label: 'Позже' }, { key: 'unscheduled', label: 'Без плана' }, { key: 'done', label: 'Готово' },
];
