import { Prisma } from '@prisma/client';
import type { H3Event } from 'h3';
import { createError, isError } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { writeAuditEvent } from '~~/server/utils/auditLog';
import type { AuditDelta } from '~~/server/utils/auditLog';
import { normalizeLocationName, locationNameKey } from '~~/shared/utils/lab-location-name';

// Ключи ресурсов из seed.ts, НЕ пути API. Права этим комплектом не выдаются.
export const OBJECT_RESOURCE_KEY = 'lab.test-objects';
export const LOCATION_RESOURCE_KEY = 'lab.test-locations';
export type CatalogKind = 'object' | 'location';
export type CatalogOperation = 'list' | 'options' | 'detail' | 'create' | 'update' | 'delete' | 'suggestions';
const MAX_DATABASE_INT = 2_147_483_647;
const MAX_PAGE_SIZE = 100;

export function catalogError(statusCode: number, code: string, message: string,
  details: Record<string, unknown> = {}): never {
  throw createError({ statusCode, statusMessage: code, message, data: { ...details, code, message } });
}

export function catalogId(value: unknown, field = 'id'): number {
  const text = typeof value === 'number' || typeof value === 'string' ? String(value) : '';
  const id = Number(text);
  if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    catalogError(400, 'INVALID_CATALOG_ID', `Поле «${field}» должно содержать положительный целый ID.`, { field });
  }
  return id;
}

/** 0/пустая строка в старых списках означает отсутствие фильтра, НЕ для создания. */
export function optionalObjectId(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '' || value === '0' || value === 0) return undefined;
  return catalogId(value, 'testObjectId');
}

function positiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== 'string' || !/^\d+$/.test(value)) return fallback;
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? n : fallback;
}

export function catalogPagination(query: Record<string, unknown>) {
  const page = positiveInteger(query.page, 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, positiveInteger(query.pageSize, 10));
  const skip = (page - 1) * pageSize;
  if (!Number.isSafeInteger(skip) || skip > MAX_DATABASE_INT) {
    catalogError(400, 'INVALID_PAGE', 'Указан слишком большой номер страницы.');
  }
  return { page, pageSize, skip };
}

export function catalogSearch(value: unknown): string {
  if (value !== undefined && typeof value !== 'string') {
    catalogError(400, 'INVALID_SEARCH', 'Поисковый запрос должен быть строкой.');
  }
  const search = typeof value === 'string' ? value.trim() : '';
  if (search.includes('\u0000')) catalogError(400, 'INVALID_SEARCH', 'Поисковая строка содержит недопустимый символ.');
  return search;
}

// Все поля здесь скалярные и существуют у обеих сущностей.
function scalarOrders(query: Record<string, unknown>) {
  const direction: Prisma.SortOrder = query.sortOrder === 'desc' ? 'desc' : 'asc';
  const keys = ['id', 'name', 'note', 'createdAt', 'editedAt', 'authorEmail', 'editorEmail'] as const;
  type SortKey = typeof keys[number];
  const key: SortKey = keys.find(k => k === query.sortKey) ?? 'name';
  const primary: Partial<Record<SortKey, Prisma.SortOrder>> = { [key]: direction };
  return key === 'id' ? [primary] : [primary, { id: 'asc' as const }];
}
export function objectOrders(
  query: Record<string, unknown>,
): Prisma.TestObjectOrderByWithRelationInput[] {
  if (query.sortKey === 'fullName') {
    const direction: Prisma.SortOrder =
      query.sortOrder === 'desc'
        ? 'desc'
        : 'asc'

    return [
      { fullName: direction },
      { id: 'asc' },
    ]
  }

  return scalarOrders(query)
}


export function locationOrders(
  query: Record<string, unknown>,
): Prisma.TestLocationOrderByWithRelationInput[] {
  return scalarOrders(query)
}

export function objectWhere(query: Record<string, unknown>): Prisma.TestObjectWhereInput {
  const search = catalogSearch(query.search);
  const where: Prisma.TestObjectWhereInput = { deletedAt: null };
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { fullName: { contains: search, mode: 'insensitive' } },
    { note: { contains: search, mode: 'insensitive' } },
  ];
  return where;
}

export async function locationWhere(query: Record<string, unknown>): Promise<Prisma.TestLocationWhereInput> {
  const objectId = optionalObjectId(query.testObjectId);
  // Явно запрошенный удалённый объект не выдаём за пустой действующий объект.
  if (objectId !== undefined) await assertActiveObject(prisma, objectId);
  const where: Prisma.TestLocationWhereInput = {
    deletedAt: null,
    testObject: { is: { deletedAt: null } },
    ...(objectId === undefined ? {} : { testObjectId: objectId }),
  };
  const search = catalogSearch(query.search);
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { note: { contains: search, mode: 'insensitive' } },
  ];
  return where;
}

export const objectUsageInclude = {
  _count: { select: { locations: { where: { deletedAt: null } } } },
} satisfies Prisma.TestObjectInclude;
export const locationUsageInclude = {
  testObject: { select: { id: true, name: true, fullName: true } },
  _count: { select: { samplingTests: { where: { deletedAt: null } } } },
} satisfies Prisma.TestLocationInclude;

export interface CatalogInput {
  name: string
  note: string | null | undefined
  fullName?: string | null
}


export interface LocationInput extends CatalogInput {
  testObjectId?: number
}


export function readCatalogInput(
  value: unknown,
  kind: CatalogKind,
): CatalogInput {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value)
  ) {
    catalogError(
      400,
      'INVALID_CATALOG_BODY',
      'Ожидается объект с данными справочника.',
    )
  }

  const body =
    value as Record<string, unknown>

  if (
    typeof body.name !== 'string' ||
    !body.name.trim()
  ) {
    catalogError(
      400,
      'INVALID_CATALOG_NAME',
      'Название обязательно для заполнения.',
      { field: 'name' },
    )
  }

  const name =
    kind === 'location'
      ? normalizeLocationName(body.name)
      : body.name.trim()

  if (
    !name ||
    name.includes('\u0000')
  ) {
    catalogError(
      400,
      'INVALID_CATALOG_NAME',
      'Название пустое или содержит недопустимый символ.',
      { field: 'name' },
    )
  }

  const note =
    body.note

  if (
    note !== undefined &&
    note !== null &&
    typeof note !== 'string'
  ) {
    catalogError(
      400,
      'INVALID_CATALOG_NOTE',
      'Примечание должно быть строкой или null.',
      { field: 'note' },
    )
  }

  if (
    typeof note === 'string' &&
    note.includes('\u0000')
  ) {
    catalogError(
      400,
      'INVALID_CATALOG_NOTE',
      'Примечание содержит недопустимый символ.',
      { field: 'note' },
    )
  }

  let fullName:
    string | null | undefined

  if (kind === 'object') {
    const rawFullName =
      body.fullName

    if (
      rawFullName !== undefined &&
      rawFullName !== null &&
      typeof rawFullName !== 'string'
    ) {
      catalogError(
        400,
        'INVALID_OBJECT_FULL_NAME',
        'Полное название объекта должно быть строкой или null.',
        { field: 'fullName' },
      )
    }

    if (
      typeof rawFullName === 'string' &&
      rawFullName.includes('\u0000')
    ) {
      catalogError(
        400,
        'INVALID_OBJECT_FULL_NAME',
        'Полное название объекта содержит недопустимый символ.',
        { field: 'fullName' },
      )
    }

    fullName =
      typeof rawFullName === 'string'
        ? (
            rawFullName.trim()
              ? rawFullName.trim()
              : null
          )
        : rawFullName
  }

  return {
    name,

    note:
      typeof note === 'string' &&
      !note.trim()
        ? null
        : note,

    ...(kind === 'object'
      ? { fullName }
      : {}),
  }
}

export function readLocationInput(value: unknown, creating: boolean): LocationInput {
  const input = readCatalogInput(value, 'location');
  const body = value as Record<string, unknown>;
  if (creating || body.testObjectId !== undefined) {
    return { ...input, testObjectId: catalogId(body.testObjectId, 'testObjectId') };
  }
  return input;
}

export async function assertActiveObject(db: Prisma.TransactionClient, id: number) {
  const object = await db.testObject.findFirst({ where: { id, deletedAt: null } });
  if (!object) catalogError(404, 'OBJECT_NOT_FOUND', 'Объект не найден или удалён из справочника.');
  return object;
}

/** PostgreSQL: все новые изменения мест берут блокировку их родителя ПЕРЕД местом. */
export async function lockObject(tx: Prisma.TransactionClient, id: number, requireActive = true) {
  await tx.$queryRaw<{ id: number }[]>`SELECT "id" FROM "test_objects" WHERE "id" = ${id} FOR UPDATE`;
  const object = await tx.testObject.findUnique({ where: { id } });
  if (!object || (requireActive && object.deletedAt !== null)) {
    catalogError(404, 'OBJECT_NOT_FOUND', 'Объект не найден или удалён из справочника.');
  }
  return object;
}

export async function lockLocation(tx: Prisma.TransactionClient, id: number, requireActive = true) {
  const first = await tx.testLocation.findUnique({ where: { id } });
  if (!first) catalogError(404, 'LOCATION_NOT_FOUND', 'Место отбора не найдено.');
  await lockObject(tx, first.testObjectId, requireActive);
  await tx.$queryRaw<{ id: number }[]>`SELECT "id" FROM "test_locations" WHERE "id" = ${id} FOR UPDATE`;
  const location = await tx.testLocation.findUnique({ where: { id } });
  if (!location || (requireActive && location.deletedAt !== null)) {
    catalogError(404, 'LOCATION_NOT_FOUND', 'Место отбора не найдено или удалено.');
  }
  if (location.testObjectId !== first.testObjectId) {
    catalogError(409, 'LOCATION_STATE_CHANGED', 'Место перемещено другим запросом. Обновите данные.');
  }
  return location;
}

export async function assertObjectNameAvailable(tx: Prisma.TransactionClient, name: string, currentId?: number) {
  const other = await tx.testObject.findUnique({ where: { name }, select: { id: true, deletedAt: true } });
  if (!other || other.id === currentId) return;
  catalogError(409, other.deletedAt ? 'OBJECT_NAME_RESERVED' : 'OBJECT_NAME_EXISTS',
    other.deletedAt ? 'Название занято мягко удалённым объектом.' : 'Объект с таким названием уже существует.');
}

export async function locationNameMatches(db: Prisma.TransactionClient, testObjectId: number, name: string,
  excludeId?: number) {
  // Только небольшой справочник ОДНОГО объекта, без поступлений и Реестра.
  // Учитываем старые варианты написания и удалённые строки, но не переименовываем их.
  const candidates = await db.testLocation.findMany({
    where: { testObjectId, ...(excludeId === undefined ? {} : { id: { not: excludeId } }) },
    select: { id: true, name: true, deletedAt: true },
    orderBy: { id: 'asc' },
  });
  const key = locationNameKey(name);
  return candidates.filter(item => locationNameKey(item.name) === key);
}

export async function assertLocationNameAvailable(tx: Prisma.TransactionClient, testObjectId: number,
  name: string, currentId?: number) {
  const matches = await locationNameMatches(tx, testObjectId, name, currentId);
  if (!matches.length) return;
  const active = matches.filter(item => item.deletedAt === null);
  catalogError(409, active.length ? 'LOCATION_NAME_EXISTS' : 'LOCATION_NAME_RESERVED',
    active.length
      ? 'В этом объекте уже есть место с таким или эквивалентным названием. Используйте существующее место.'
      : 'Название занято мягко удалённым местом этого объекта. Автоматическое восстановление запрещено.',
    { testObjectId, matches: matches.map(item => ({ id: item.id, name: item.name, deleted: item.deletedAt !== null })) });
}

export function rethrowCatalogNameConflict(error: unknown, kind: CatalogKind): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = error.meta?.target;
    const expected = kind === 'object' ? 'test_objects_name_key' : 'test_locations_testObjectId_name_key';
    const nameConflict = Array.isArray(target)
      ? target.includes('name') && (kind === 'object' || target.includes('testObjectId'))
      : target === expected || (kind === 'object' && target === 'name');
    if (nameConflict) catalogError(409, kind === 'object' ? 'OBJECT_NAME_EXISTS' : 'LOCATION_NAME_EXISTS',
      'Название уже занято. Обновите справочник и используйте существующий элемент.');
  }
  throw error;
}

export async function catalogActor(tx: Prisma.TransactionClient, userId: number) {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true, login: true, authType: true } });
  if (!user) catalogError(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
  return { actorUserId: userId, actorLogin: user.login, actorEmail: user.email || user.login || `user:${userId}`,
    actorAuthType: user.authType };
}
export type CatalogActor = Awaited<ReturnType<typeof catalogActor>>;

export async function catalogAudit(event: H3Event, tx: Prisma.TransactionClient, actor: CatalogActor,
  kind: CatalogKind, action: 'CREATE' | 'UPDATE' | 'DELETE', id: number, note: string, changes: AuditDelta) {
  await writeAuditEvent({ event, db: tx, ...actor, category: 'DATA', result: 'SUCCESS', action,
    entityType: kind === 'object' ? 'TestObject' : 'TestLocation', entityId: id,
    resourceKey: kind === 'object' ? OBJECT_RESOURCE_KEY : LOCATION_RESOURCE_KEY, note, changes });
}

export async function catalogTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>, retry = false): Promise<T> {
  const attempts = retry ? 3 : 1;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try { return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }); }
    catch (error: unknown) {
      const conflict = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
      if (!conflict) throw error;
      if (attempt === attempts) catalogError(409, 'CATALOG_CONCURRENT_UPDATE',
        'Данные меняются другим пользователем. Обновите справочник и повторите операцию.');
      await new Promise<void>(resolve => setTimeout(resolve, 50 * attempt));
    }
  }
  throw new Error('Unexpected end of catalog transaction');
}

export function rethrowCatalogError(error: unknown, kind: CatalogKind, operation: CatalogOperation): never {
  if (isError(error)) throw error;
  console.error(`[lab/${kind} ${operation}]`, error);
  catalogError(500, 'CATALOG_OPERATION_FAILED', 'Не удалось выполнить операцию. Повторите попытку или обратитесь к администратору.');
}
