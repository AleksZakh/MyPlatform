import { AccessAction, Prisma } from '@prisma/client';
import { getRouterParam, type H3Event } from 'h3';
import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { writeAuditEvent } from '~~/server/utils/auditLog';
import { deletionError, deletionId, readDeletionReason } from '~~/server/utils/deletion-input';
import { manufacturerAuditActor } from './manufacturer-api.service';

export const REGISTRY_RESOURCE_KEY = 'lab.sampling-tests';
type Kind = 'registry' | 'receipt' | 'protocol';
const keys = { registry: REGISTRY_RESOURCE_KEY, receipt: 'lab.receipt-materials', protocol: 'lab.test-protocols' } as const;

async function transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000, timeout: 30_000,
      });
    } catch (error) {
      // Не повторяем тайм-аут/обрыв соединения с неизвестным результатом COMMIT.
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034') throw error;
      if (attempt === 2) deletionError(409, 'DELETE_CONFLICT', 'Запись изменяется. Обновите таблицу и повторите удаление.');
      await new Promise(resolve => setTimeout(resolve, 50 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable transaction state');
}

/** Реестр — агрегат SamplingTest + принадлежащие ему связи 1:1.
 * Удаление агрегата разрешает DELETE lab.sampling-tests. Справочники и файлы не затрагиваются.
 * Отдельные поступления/протоколы требуют своих DELETE; связанные удаляются только через реестр.
 */
export async function deleteLabRecord(event: H3Event, kind: Kind = 'registry') {
  const permission = await requirePermission(event, keys[kind], AccessAction.DELETE);
  const id = deletionId(getRouterParam(event, 'id'));
  const reason = await readDeletionReason(event);
  return transaction(async tx => {
    const row = kind === 'registry'
      ? await tx.samplingTest.findUnique({ where: { id } })
      : kind === 'receipt'
        ? await tx.receiptMaterial.findUnique({ where: { id } })
        : await tx.testProtocol.findUnique({ where: { id } });
    if (!row) deletionError(404, 'RECORD_NOT_FOUND', 'Запись не найдена.');
    if (row.deletedAt !== null) return { success: true, id, alreadyDeleted: true, message: 'Запись уже удалена.' };
    if (kind !== 'registry') {
      const owner = await tx.samplingTest.findFirst({
        where: kind === 'receipt' ? { receiptMaterialId: id } : { testProtocolId: id },
        select: { id: true },
      });
      if (owner) deletionError(409, 'RECORD_LINKED', 'Запись связана с реестром. Удалите запись реестра целиком.');
    }
    const actor = await manufacturerAuditActor(tx, permission.userId);
    const data = { deletedAt: new Date(), deletedBy: actor.actorEmail, editorEmail: actor.actorEmail };
    // Аудит и все изменения выполняются в одной транзакции.
    const audit = async (entityType: string, before: { id: number; deletedAt: Date | null; deletedBy: string | null },
      after: { deletedAt: Date | null; deletedBy: string | null }) => {
      await writeAuditEvent({ event, db: tx, ...actor, category: 'DATA', result: 'SUCCESS', action: 'DELETE',
        resourceKey: keys[kind], entityType, entityId: before.id,
        note: `Мягкое удаление. Причина: ${reason}`,
        changes: {
          deletedAt: { before: before.deletedAt?.toISOString() ?? null, after: after.deletedAt?.toISOString() ?? null },
          deletedBy: { before: before.deletedBy, after: after.deletedBy },
        },
        afterData: { deletionReason: reason, aggregateId: kind === 'registry' ? id : null },
      });
    };
    const removeReceipt = async (receiptId: number) => {
      const before = await tx.receiptMaterial.findUniqueOrThrow({ where: { id: receiptId } });
      if (before.deletedAt !== null) return;
      const after = await tx.receiptMaterial.update({ where: { id: receiptId }, data });
      await audit('ReceiptMaterial', before, after);
    };
    const removeProtocol = async (protocolId: number) => {
      const before = await tx.testProtocol.findUniqueOrThrow({ where: { id: protocolId } });
      if (before.deletedAt !== null) return;
      const after = await tx.testProtocol.update({ where: { id: protocolId }, data });
      await audit('TestProtocol', before, after);
    };
    if (kind === 'registry') {
      const before = await tx.samplingTest.findUniqueOrThrow({ where: { id } });
      const after = await tx.samplingTest.update({ where: { id }, data });
      await audit('SamplingTest', before, after);
      await removeReceipt(before.receiptMaterialId);
      if (before.testProtocolId !== null) await removeProtocol(before.testProtocolId);
    } else if (kind === 'receipt') await removeReceipt(id);
    else await removeProtocol(id);
    return { success: true, id, alreadyDeleted: false, message: 'Запись мягко удалена. Документы сохранены.' };
  });
}
