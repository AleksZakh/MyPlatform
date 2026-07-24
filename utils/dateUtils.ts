// utils/dateUtils.ts
import { CalendarDate } from '@internationalized/date';

/**
 * Парсит строку даты в формате ДД.ММ.ГГГГ в объект CalendarDate
 * @param dateStr - строка с датой (например, "29.05.2026")
 * @returns CalendarDate | null
 */

export function convertDateToForm(date:string) {
  const parts = date.split('.');
  return `${parts[2]}-${parts[0]}-${parts[1]}`
}
export function parseDate(dateStr: string): CalendarDate | null {
  if (!dateStr || dateStr === 'Отсутствует' || dateStr.trim() === '') {
    return null;
  }

  try {
    const parts = dateStr.split('.');
    if (parts.length === 3) {
      const dayPart = parts[0];
      const monthPart = parts[1];
      const yearPart = parts[2];

      if (dayPart && monthPart && yearPart) {
        const day = parseInt(dayPart, 10);
        const month = parseInt(monthPart, 10);
        const year = parseInt(yearPart, 10);

        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          // Проверка на валидность даты
          const date = new Date(year, month - 1, day);
          if (
            date.getFullYear() === year &&
            date.getMonth() === month - 1 &&
            date.getDate() === day
          ) {
            return new CalendarDate(year, month, day);
          }
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Форматирует CalendarDate в строку ДД.ММ.ГГГГ
 * @param date - объект CalendarDate
 * @returns строка с датой или пустая строка
 */
export function formatDate(date: CalendarDate | null): string {
  if (!date) return '';
  const day = String(date.day).padStart(2, '0');
  const month = String(date.month).padStart(2, '0');
  const year = date.year;
  return `${day}.${month}.${year}`;
}

/**
 * Генерирует текущую дату и время для логов
 * @returns строка в формате "ДД.ММ.ГГГГ_ЧЧ:ММ:СС"
 */
export function getDateTime(): string {
  const now = new Date();

  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${day}.${month}.${year}_${hours}:${minutes}:${seconds}`;
}

/**
 * Создает CalendarDate из объекта Date
 * @param date - объект Date
 * @returns CalendarDate
 */
export function dateToCalendarDate(date: Date): CalendarDate {
  return new CalendarDate(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
}

/**
 * Создает Date из CalendarDate
 * @param date - объект CalendarDate
 * @returns Date
 */
export function calendarDateToDate(date: CalendarDate): Date {
  return new Date(date.year, date.month - 1, date.day);
}

/**
 * Проверяет, является ли дата валидной
 * @param date - объект CalendarDate
 * @returns boolean
 */
export function isValidDate(date: CalendarDate | null): boolean {
  if (!date) return false;
  try {
    const d = new Date(date.year, date.month - 1, date.day);
    return (
      d.getFullYear() === date.year &&
      d.getMonth() === date.month - 1 &&
      d.getDate() === date.day
    );
  } catch {
    return false;
  }
}


/**
 * Сравнивает две даты
 * @param date1 - первая дата
 * @param date2 - вторая дата
 * @returns 0 если равны, 1 если date1 > date2, -1 если date1 < date2
 */
export function compareDates(date1: CalendarDate, date2: CalendarDate): number {
  const d1 = new Date(date1.year, date1.month - 1, date1.day);
  const d2 = new Date(date2.year, date2.month - 1, date2.day);

  if (d1.getTime() === d2.getTime()) return 0;
  return d1.getTime() > d2.getTime() ? 1 : -1;
}

export function getToday(): CalendarDate {
  const today = new Date();
  return new CalendarDate(
    today.getFullYear(),
    today.getMonth() + 1,
    today.getDate()
  );
}

export function dateToISOString(date: CalendarDate): string {
  const jsDate = new Date(date.year, date.month - 1, date.day + 1);
  return jsDate.toISOString();
}
