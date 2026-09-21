/** Единые правила написания для НОВЫХ мест. Старые строки не переписываются. */
export function normalizeLocationName(value: string): string {
  return value.normalize('NFC').replace(/№\s*(?=\d)/gu, ' № ')
    .replace(/\s+/gu, ' ').trim();
}

/**
 * Ключ проверки дублей, не новое поле БД.
 * «Опора 3», «опора №3», « Опора   № 3 » совпадают.
 * Не удаляем /, +, -, скобки, цифры и буквы: это могут быть значимые части места.
 * № не удаляем, если за ним нет цифры. Не используем NFKC: он превращает № в No.
 */
export function locationNameKey(value: string): string {
  return normalizeLocationName(value).replace(/№\s*(?=\d)/gu, '')
    .replace(/\s+/gu, ' ').trim().toLowerCase();
}
