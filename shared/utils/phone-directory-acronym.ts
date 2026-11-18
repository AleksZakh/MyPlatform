/** Преобразует каждое слово в его первую заглавную букву. */
export function createAcronym(phrase: string): string {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => word[0]!.toUpperCase())
    .join('');
}

/** Каждая часть названия, отделённая запятой, образует отдельную аббревиатуру. */
export function departmentAcronym(value: string | null | undefined): string {
  if (!value?.trim()) return '—';
  return value.split(',').map(createAcronym).filter(Boolean).join(' ') || '—';
}
