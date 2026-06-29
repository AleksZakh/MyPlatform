export interface SortOptions {
  key: string;
  direction: 'asc' | 'desc';
}

export default function sortData<T extends Record<string, any>>(data: T[], options: SortOptions): T[] {
  const { key, direction } = options;
  const isAsc = direction === 'asc';

  return [...data].sort((a, b) => {
    let aVal = a[key] || '';
    let bVal = b[key] || '';

    // Специальная обработка для дат (формат ДД.ММ.ГГГГ)
    if (key.includes('Дата') && aVal && bVal) {
      const dateA = new Date(String(aVal).split('.').reverse().join('-'));
      const dateB = new Date(String(bVal).split('.').reverse().join('-'));
      
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return isAsc 
          ? dateA.getTime() - dateB.getTime() 
          : dateB.getTime() - dateA.getTime();
      }
    }

    // Обычное строковое сравнение
    const strA = String(aVal).toLowerCase();
    const strB = String(bVal).toLowerCase();

    if (strA < strB) return isAsc ? -1 : 1;
    if (strA > strB) return isAsc ? 1 : -1;
    return 0;
  });
}
