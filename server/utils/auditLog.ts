// server/utils/auditLog.ts
import { Prisma,} from '@prisma/client';
import type { H3Event,} from 'h3';
import { prisma,} from './prisma';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditEntityType =
  | 'SamplingTest'
  | 'ReceiptMaterial'
  | 'TestProtocol'
  | 'TestObject'
  | 'TestLocation';

interface LogAuditParams {
  entityType:
    AuditEntityType;

  entityId:
    number;

  action:
    AuditAction;

  actorEmail:
    string;


  note?: string;

  beforeData?:
    Prisma.InputJsonValue;

  afterData?:
    Prisma.InputJsonValue;

  changedFields?:
    string[];

  /**
   * Новый формат UPDATE.
   */
  changes?:
    AuditDelta;


  ipAddress?:
    string;

  userAgent?:
    string;
}

/**
 * Записывает действие в журнал аудита.
 * Не выбрасывает ошибку при сбое — чтобы не ломать бизнес-операцию.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
    
  try {
    await prisma.auditLog.create({
      data: {
        entityType:
          params.entityType,

        entityId:
          params.entityId,

        action:
          params.action,

        actorEmail:
          params.actorEmail,

        note:
          params.note ??
          null,


        /**
         * Если передан новый delta-format,
         * полные snapshots больше не пишем.
         */
        beforeData:
          params.changes
            ? Prisma.JsonNull
            : (
                params.beforeData ??
                Prisma.JsonNull
              ),

        afterData:
          params.changes
            ? Prisma.JsonNull
            : (
                params.afterData ??
                Prisma.JsonNull
              ),

        changedFields:
          params.changes
            ? Prisma.JsonNull
            : (
                params.changedFields ??
                Prisma.JsonNull
              ),

        changes:
          params.changes
            ? (
                params.changes as
                  Prisma.InputJsonValue
              )
            : Prisma.JsonNull,


        ipAddress:
          params.ipAddress ??
          null,

        userAgent:
          params.userAgent ??
          null,
      },
    });
  } catch (error) {
    console.error('[audit] Ошибка записи в AuditLog:', error);
  }
}

/**
 * Вычисляет список изменённых полей для UPDATE.
 */
export function computeChangedFields(
  before: Record<string, any> | null,
  after: Record<string, any> | null
): string[] {
    // console.log('Рассчитывает разницу')
  if (!before || !after) return [];

  const IGNORED = [
    'id', 'createdAt', 'editedAt', 'editorEmail', 'authorEmail',
    'deletedAt', 'deletedBy',
  ];
  const changed: string[] = [];

  for (const key of Object.keys(after)) {
    if (IGNORED.includes(key)) continue;
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changed.push(key);
    }
  }
  return changed;
}

/**
 * Достаёт email актора из контекста запроса.
 */
export function getActorEmail(event: any): string {
  return event?.context?.user?.email
      || event?.context?.user?.login
      || 'anonymous';
}

/**
 * Достаёт IP и User-Agent.
 */
export function getRequestMeta(event: any): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress: event?.node?.req?.socket?.remoteAddress || undefined,
    userAgent: event?.node?.req?.headers?.['user-agent'] || undefined,
  };
}

/**
 * Универсальная функция мягкого удаления для любой модели.
 * Возвращает обновлённую запись.
 */
export async function softDelete(
  model: string,
  id: number,
  actorEmail: string
): Promise<any> {
  return (prisma as any)[model].update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: actorEmail,
    },
  });
}

export interface LogAccessDeniedParams {
  event: any;

  actorUserId: number;

  actorLogin?: string | null;
  actorEmail?: string | null;
  actorAuthType?: string | null;

  resourceKey: string;

  action: string;
}



type AuditJsonValue =
  | string
  | number
  | boolean
  | null
  | AuditJsonValue[]
  | {
      [key: string]:
        AuditJsonValue;
    };


export type AuditDelta =
  Record<
    string,
    {
      before:
        AuditJsonValue;

      after:
        AuditJsonValue;
    }
  >;


/**
 * Приводим произвольное значение
 * к безопасному JSON-представлению.
 */
function toAuditJson(
  value: unknown,
): AuditJsonValue {

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }


  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }


  if (
    typeof value === 'bigint'
  ) {
    return value.toString();
  }


  if (
    value instanceof Date
  ) {
    return value.toISOString();
  }


  if (
    Array.isArray(value)
  ) {
    return value.map(
      toAuditJson,
    );
  }


  if (
    typeof value === 'object'
  ) {
    const result:
      Record<
        string,
        AuditJsonValue
      > = {};


    for (
      const [key, item]
      of Object.entries(value)
    ) {
      result[key] =
        toAuditJson(item);
    }


    return result;
  }


  return String(value);
}


/**
 * Формирует только реальные изменения:
 *
 * {
 *   testResult: {
 *     before: "PENDING",
 *     after: "PASSED"
 *   }
 * }
 */

export function buildCreateAuditDelta(
  data: Record<string, unknown>,
  fields: string[],
): AuditDelta {

  const changes: AuditDelta = {};

  for (const field of fields) {

    if (!(field in data)) {
      continue;
    }

    changes[field] = {
      before: null,
      after: toAuditJson(
        data[field],
      ),
    };
  }

  return changes;
}


export function computeAuditDelta(
  before:
    Record<string, unknown> | null,

  after:
    Record<string, unknown> | null,
): AuditDelta {

  if (
    !before ||
    !after
  ) {
    return {};
  }


  const ignored =
    new Set([
      'id',
      'createdAt',
      'updatedAt',
      'editedAt',
      'editorEmail',
      'authorEmail',
      'deletedAt',
      'deletedBy',
    ]);


  const keys =
    new Set([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);


  const changes:
    AuditDelta = {};


  for (
    const key
    of keys
  ) {
    if (
      ignored.has(key)
    ) {
      continue;
    }


    const beforeValue =
      toAuditJson(
        before[key],
      );

    const afterValue =
      toAuditJson(
        after[key],
      );


    if (
      JSON.stringify(
        beforeValue,
      ) ===
      JSON.stringify(
        afterValue,
      )
    ) {
      continue;
    }


    changes[key] = {
      before:
        beforeValue,

      after:
        afterValue,
    };
  }


  return changes;
}


type AuditCategory =
  | 'AUTH'
  | 'DATA'
  | 'ACCESS'
  | 'SECURITY'
  | 'ADMIN'
  | 'SYSTEM';


type AuditResult =
  | 'SUCCESS'
  | 'DENIED'
  | 'FAILED';


interface WriteAuditEventParams {
  event: H3Event;

  /**
   * Если передали tx —
   * аудит станет частью бизнес-транзакции.
   */
  db?: Prisma.TransactionClient;

  category:
    AuditCategory;

  action:
    string;

  result:
    AuditResult;

  resourceKey?: string;

  entityType?: string;
  entityId?: number;

  targetUserId?: number;

  note?: string;

  changes?: AuditDelta;

  /**
   * Временно оставляем для CREATE,
   * пока его тоже не перевели
   * на компактный формат.
   */
  afterData?:
    Prisma.InputJsonValue;

  /**
   * Legacy fallback.
   */
  /**
   * Явные данные пользователя.
   *
   * Особенно полезны для ACCESS-событий,
   * где requirePermission() уже загрузил
   * пользователя из app_users.
   */
    actorUserId?: number | null;
    actorLogin?: string | null;
    actorEmail?: string | null;
    actorAuthType?: string | null;
}


/**
 * Низкоуровневая запись события.
 *
 * ВАЖНО:
 * функция намеренно НЕ проглатывает ошибку.
 *
 * Если она используется внутри Prisma transaction,
 * ошибка аудита должна откатить и бизнес-операцию.
 */
export async function writeAuditEvent(
  params: WriteAuditEventParams,
): Promise<void> {

  const user =
    (params.event.context?.user ??
      null) as
      | {
          id?: number;
          login?: string;
          email?: string;
          authType?: string;
        }
      | null;


  const actorUserId =
    params.actorUserId ??
    (
      typeof user?.id === 'number'
        ? user.id
        : null
    );


  const actorLogin =
    params.actorLogin ??
    user?.login?.trim() ??
    null;


  const actorEmail =
    params.actorEmail ??
    user?.email?.trim() ??
    actorLogin ??
    (
      actorUserId
        ? `user:${actorUserId}`
        : 'anonymous'
    );


  const actorAuthType =
    params.actorAuthType ??
    user?.authType ??
    null;


  const url =
    getRequestURL(
      params.event,
    );


  const requestId =
    getRequestHeader(
      params.event,
      'x-request-id',
    ) || null;


  const {
    ipAddress,
    userAgent,
  } =
    getRequestMeta(
      params.event,
    );


  const data = {
    category:
      params.category,

    action:
      params.action,

    result:
      params.result,

    resourceKey:
      params.resourceKey ??
      null,


    entityType:
      params.entityType ??
      null,

    entityId:
      params.entityId ??
      null,


    actorUserId,

    actorLogin,

    actorEmail,

    actorAuthType,


    targetUserId:
      params.targetUserId ??
      null,


    requestId,

    method:
      params.event.method ??
      null,

    route:
      url.pathname,


    note:
      params.note ??
      null,


    changes:
      params.changes
        ? (
            params.changes as
              Prisma.InputJsonValue
          )
        : undefined,

    afterData:
      params.afterData ??
      undefined,


    ipAddress:
      ipAddress ??
      null,

    userAgent:
      userAgent ??
      null,
  };


  if (params.db) {
    await params.db.auditLog.create({
      data,
    });

    return;
  }


  await prisma.auditLog.create({
    data,
  });
}


/**
 * Успешное изменение бизнес-данных.
 */
export async function auditDataChange(
  params: {
    event: H3Event;

    db?: Prisma.TransactionClient;

    resourceKey: string;

    entityType: string;
    entityId: number;

    action:
      'CREATE'
      | 'UPDATE'
      | 'DELETE';

    note?: string;

    changes?: AuditDelta;

    afterData?:
      Prisma.InputJsonValue;

    actorEmail?: string;
  },
): Promise<void> {

  await writeAuditEvent({
    event:
      params.event,

    db:
      params.db,

    category:
      'DATA',

    action:
      params.action,

    result:
      'SUCCESS',

    resourceKey:
      params.resourceKey,

    entityType:
      params.entityType,

    entityId:
      params.entityId,

    note:
      params.note,

    changes:
      params.changes,

    afterData:
      params.afterData,

    actorEmail:
      params.actorEmail,
  });
}

export async function auditDenied(
  params: {
    event: H3Event;

    resourceKey: string;

    action: string;

    actorUserId: number;

    actorLogin?: string | null;
    actorEmail?: string | null;
    actorAuthType?: string | null;

    note?: string;
  },
): Promise<void> {

  try {

    await writeAuditEvent({
      event:
        params.event,

      category:
        'ACCESS',

      action:
        params.action,

      result:
        'DENIED',

      resourceKey:
        params.resourceKey,

      actorUserId:
        params.actorUserId,

      actorLogin:
        params.actorLogin,

      actorEmail:
        params.actorEmail,

      actorAuthType:
        params.actorAuthType,

      note:
        params.note ??
        'Access denied',
    });

  }
  catch (error) {

    /**
     * КРИТИЧЕСКИ ВАЖНО:
     *
     * ошибка Event Log не должна
     * превращать запрет доступа
     * из 403 в 500.
     */
    console.error(
      '[audit] Ошибка записи ACCESS/DENIED:',
      error,
    );
  }
}


