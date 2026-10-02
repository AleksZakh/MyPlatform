export function requestDeletionReason(name: string): string | null {
  const reason = window.prompt(
    `Удалить «${name}»?\nЗапись будет скрыта из действующих списков, документы сохранятся.\nУкажите причину удаления (до 1000 символов):`,
  );
  if (reason === null) return null;
  const value = reason.trim();
  if (!value || value.length > 1000 || value.includes('\u0000')) {
    window.alert('Удаление отменено. Причина обязательна и не должна превышать 1000 символов.');
    return null;
  }
  return value;
}
export function deletionErrorMessage(error: unknown): string {
  const e = error as { data?: { data?: { message?: string }; message?: string }; message?: string } | null;
  return e?.data?.data?.message || e?.data?.message || e?.message || 'Не удалось удалить запись.';
}
