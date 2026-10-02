import { createError, readBody, type H3Event } from 'h3';

export function deletionError(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, message, data: { code, message } });
}
export function deletionId(value: string | undefined): number {
  const text = value ?? '';
  const id = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(id) || id > 2147483647) {
    deletionError(400, 'INVALID_ID', 'Некорректный ID записи.');
  }
  return id;
}
export function validateDeletionReason(value: unknown): string {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 1000 || value.includes('\u0000')) {
    deletionError(400, 'DELETE_REASON_REQUIRED', 'Укажите причину удаления: от 1 до 1000 символов.');
  }
  return value.trim();
}
export async function readDeletionReason(event: H3Event): Promise<string> {
  const body: unknown = await readBody(event);
  return validateDeletionReason(typeof body === 'object' && body !== null && !Array.isArray(body)
    ? (body as Record<string, unknown>).reason : undefined);
}
