// Общие правила шести API справочника производителей.
import { Prisma } from '@prisma/client';
import { createError, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';

export const MANUFACTURER_RESOURCE_KEY = 'lab.manufacturers';
const MAX_DATABASE_INT = 2_147_483_647;
const MAX_PAGE_SIZE = 100;

/**
 * Тот же критерий использования, что в обновлённом справочнике материалов.
 * - Действующий Реестр препятствует удалению, даже если deletedAt поступления
 *   ошибочно заполнен.
 * - Удалённый Реестр не препятствует удалению производителя.
 * - Действующее поступление без Реестра тоже считается использованием.
 */
export const manufacturerBlockingReceiptWhere: Prisma.ReceiptMaterialWhereInput = {
  OR: [
    { samplingTest: { is: { deletedAt: null } } },
    { deletedAt: null, samplingTest: { is: null } },
  ],
};

// Счётчики списка, карточки и DELETE не должны расходиться в определении связи.
export const manufacturerUsageInclude = {
  _count: {
    select: { receipts: { where: manufacturerBlockingReceiptWhere } },
  },
} satisfies Prisma.ManufacturerInclude;

export function manufacturerError(
  statusCode: number,
  code: string,
  message: string,
  details: Record<string, unknown> = {},
): never {
  throw createError({
    statusCode,
    statusMessage: code,
    message,
    data: { ...details, code, message },
  });
}

export function parseManufacturerId(value: string | undefined): number {
  const text = value ?? '';
  const id = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    manufacturerError(400, 'INVALID_MANUFACTURER_ID', 'Некорректный ID производителя.');
  }
  return id;
}

export interface ManufacturerInput {
  name: string;
  // В PUT undefined сохраняет прежнее примечание, null его очищает.
  note: string | null | undefined;
}

export function parseManufacturerInput(value: unknown): ManufacturerInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    manufacturerError(400, 'INVALID_MANUFACTURER_BODY', 'Ожидается объект с данными производителя.');
  }
  const body = value as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim()) {
    manufacturerError(400, 'INVALID_MANUFACTURER_NAME', 'Название производителя обязательно для заполнения.');
  }
  const name = body.name.trim();
  // Manufacturer.name имеет @db.Text. Ограничение ПЛП в 255 символов не переносим.
  if (name.includes('\u0000')) {
    manufacturerError(400, 'INVALID_MANUFACTURER_NAME', 'Название содержит недопустимый нулевой символ.');
  }
  const rawNote = body.note;
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
    manufacturerError(400, 'INVALID_MANUFACTURER_NOTE', 'Примечание должно быть строкой или null.');
  }
  if (typeof rawNote === 'string' && rawNote.includes('\u0000')) {
    manufacturerError(400, 'INVALID_MANUFACTURER_NOTE', 'Примечание содержит недопустимый нулевой символ.');
  }
  // Старые формы могут присылать служебные поля и связи: они не записываются.
  // Никогда не передаём ...body в Prisma.
  return {
    name,
    note: typeof rawNote === 'string' && !rawNote.trim() ? null : rawNote,
  };
}

export function manufacturerReadOptions(query: Record<string, unknown>) {
  const search = typeof query.search === 'string' ? query.search.trim() : '';
  if (search.includes('\u0000')) {
    manufacturerError(400, 'INVALID_MANUFACTURER_SEARCH', 'Поисковая строка содержит недопустимый символ.');
  }
  const where: Prisma.ManufacturerWhereInput = { deletedAt: null };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { note: { contains: search, mode: 'insensitive' } },
    ];
  }
  const direction: Prisma.SortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
  let primary: Prisma.ManufacturerOrderByWithRelationInput;
  switch (query.sortKey) {
    case 'id': primary = { id: direction }; break;
    case 'note': primary = { note: direction }; break;
    case 'createdAt': primary = { createdAt: direction }; break;
    case 'editedAt': primary = { editedAt: direction }; break;
    case 'authorEmail': primary = { authorEmail: direction }; break;
    case 'editorEmail': primary = { editorEmail: direction }; break;
    default: primary = { name: direction };
  }
  const orderBy: Prisma.ManufacturerOrderByWithRelationInput[] = [primary];
  if (query.sortKey !== 'id') orderBy.push({ id: 'asc' });
  return { where, orderBy };
}

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function manufacturerPagination(query: Record<string, unknown>) {
  const page = positiveInteger(query.page, 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, positiveInteger(query.pageSize, 10));
  const skip = (page - 1) * pageSize;
  if (!Number.isSafeInteger(skip) || skip > MAX_DATABASE_INT) {
    manufacturerError(400, 'INVALID_PAGE', 'Указан слишком большой номер страницы.');
  }
  return { page, pageSize, skip };
}

export async function manufacturerAuditActor(tx: Prisma.TransactionClient, userId: number) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { email: true, login: true, authType: true },
  });
  if (!user) {
    manufacturerError(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
  }
  return {
    actorUserId: userId,
    actorLogin: user.login,
    actorEmail: user.email || user.login || `user:${userId}`,
    actorAuthType: user.authType,
  };
}

export async function assertManufacturerNameAvailable(
  tx: Prisma.TransactionClient,
  name: string,
  currentId?: number,
): Promise<void> {
  // Уникальность name в существующей схеме распространяется и на удалённые строки.
  const other = await tx.manufacturer.findUnique({
    where: { name },
    select: { id: true, deletedAt: true },
  });
  if (!other || other.id === currentId) return;
  if (other.deletedAt !== null) {
    manufacturerError(409, 'MANUFACTURER_NAME_RESERVED',
      'Это название занято мягко удалённым производителем. Укажите другое название.');
  }
  manufacturerError(409, 'MANUFACTURER_NAME_EXISTS', 'Производитель с таким названием уже существует.');
}

// Применяется только к операции создания/изменения Manufacturer, не к аудиту.
export function rethrowManufacturerNameConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = error.meta?.target;
    const isName = Array.isArray(target)
      ? target.includes('name')
      : target === 'name' || target === 'manufacturers_name_key';
    if (isName) {
      manufacturerError(409, 'MANUFACTURER_NAME_EXISTS',
        'Название производителя уже занято. Обновите справочник и выберите другое название.');
    }
  }
  throw error;
}

export async function manufacturerWriteTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
  retryConflicts = false,
): Promise<T> {
  // DELETE допускает повтор при P2034. PUT не повторяем с новыми данными молча.
  const maxAttempts = retryConflicts ? 3 : 1;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error: unknown) {
      const isConflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!isConflict) throw error;
      if (attempt === maxAttempts) {
        manufacturerError(409, 'MANUFACTURER_CONCURRENT_UPDATE',
          'Данные изменяются другим пользователем. Обновите справочник и повторите операцию.');
      }
      // Только после подтверждённого конфликта БД, вне транзакции.
      await new Promise<void>((resolve) => setTimeout(resolve, 50 * attempt));
    }
  }
  throw new Error('Unexpected end of manufacturer transaction loop');
}

const operationFailures = {
  list: ['MANUFACTURER_LIST_FAILED', 'Не удалось загрузить список производителей. Повторите попытку.'],
  options: ['MANUFACTURER_OPTIONS_FAILED', 'Не удалось загрузить производителей для выбора. Повторите попытку.'],
  detail: ['MANUFACTURER_DETAILS_FAILED', 'Не удалось загрузить производителя. Повторите попытку.'],
  create: ['MANUFACTURER_CREATE_FAILED', 'Не удалось создать производителя. Повторите попытку.'],
  update: ['MANUFACTURER_UPDATE_FAILED', 'Не удалось сохранить производителя. Повторите попытку.'],
  delete: ['MANUFACTURER_DELETE_FAILED', 'Не удалось удалить производителя. Повторите попытку.'],
} as const;

export function rethrowManufacturerError(error: unknown, operation: keyof typeof operationFailures): never {
  if (isError(error)) throw error;
  console.error(`[lab/manufacturer ${operation}] Ошибка операции:`, error);
  const [code, message] = operationFailures[operation];
  manufacturerError(500, code, message);
}
