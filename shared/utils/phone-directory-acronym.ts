/** Союз «и» не учитывается при подсчёте слов и остаётся строчным в аббревиатуре. */
function isConjunction(word: string): boolean {
  return word.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').toLocaleLowerCase('ru-RU') === 'и';
}

/** Преобразует каждое слово в его первую заглавную букву. */
export function createAcronym(phrase: string): string {
  return phrase
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0)
    .map(word => isConjunction(word) ? 'и' : word[0]!.toLocaleUpperCase('ru-RU'))
    .join('');
}

/** Длинные названия выводим первыми четырьмя значимыми словами, остальные — аббревиатурами. */
export function departmentAcronym(value: string | null | undefined): string {
  if (!value?.trim()) return '—';

  const words = value.trim().split(/\s+/).filter(Boolean);
  const significantCount = words.filter(word => !isConjunction(word)).length;
  if (significantCount > 8) {
    const firstWords: string[] = [];
    let significant = 0;
    for (const word of words) {
      if (significant === 4) break;
      firstWords.push(isConjunction(word) ? word.replace(/[Ии]/, 'и') : word);
      if (!isConjunction(word)) significant++;
    }
    return firstWords.join(' ');
  }

  return value.split(',').map(createAcronym).filter(Boolean).join(' ') || '—';
}
