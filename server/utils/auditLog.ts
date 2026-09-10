// server/utils/auditLog.ts
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE';

export type AuditEntityType =
  | 'SamplingTest'
  | 'ReceiptMaterial'
  | 'TestProtocol'
  | 'TestObject'
  | 'TestLocation';

interface LogAuditParams {
  entityType: AuditEntityType;
  entityId: number;
  action: AuditAction;
  actorEmail: string;
  note?: string;
  beforeData?: Prisma.InputJsonValue;
  afterData?: Prisma.InputJsonValue;
  changedFields?: string[];
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Записывает действие в журнал аудита.
 * Не выбрасывает ошибку при сбое — чтобы не ломать бизнес-операцию.
 */
export async function logAudit(params: LogAuditParams): Promise<void> {
    
  try {
    await prisma.auditLog.create({
      data: {
        entityType: params.entityType,
        entityId: params.entityId,
        action: params.action,
        actorEmail: params.actorEmail,
        note: params.note ?? null,
        beforeData: params.beforeData ?? Prisma.JsonNull,
        afterData: params.afterData ?? Prisma.JsonNull,
        changedFields: params.changedFields ?? Prisma.JsonNull,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
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