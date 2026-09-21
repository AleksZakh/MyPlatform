// Установить как server/api/lab/material/[id].delete.ts
import { AccessAction, Prisma } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { writeAuditEvent } from '~~/server/utils/auditLog';

const RESOURCE_KEY = 'lab.materials';
const MAX_DATABASE_INT = 2_147_483_647;
const MAX_TRANSACTION_ATTEMPTS = 3;

/**
 * Использование материала проверяем через ReceiptMaterial -> SamplingTest.
 *
 * 1. Есть действующая запись Реестра — удалять материал нельзя.
 *    Учитываем её даже при несогласованном deletedAt самого поступления.
 * 2. Связанная запись Реестра мягко удалена — это НЕ использование,
 *    независимо от того, очищен ли deletedAt у поступления.
 * 3. Отдельное действующее поступление без Реестра — тоже использование.
 *    Такое поступление не объявляем ненужным автоматически.
 * 4. Отдельное мягко удалённое поступление — не препятствие для удаления.
 */
const blockingReceiptWhere: Prisma.ReceiptMaterialWhereInput = {
  OR: [
    { samplingTest: { is: { deletedAt: null } } },
    { deletedAt: null, samplingTest: { is: null } },
  ],
};

function rejectRequest(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, message, data: { code, message } });
}

export default defineEventHandler(async (event) => {
  // Не доверяем авторству и правам, переданным в теле запроса.
  const permission = await requirePermission(event, RESOURCE_KEY, AccessAction.DELETE);

  const idParam = getRouterParam(event, 'id') ?? '';
  const id = Number(idParam);
  if (!/^[1-9]\d*$/.test(idParam) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    rejectRequest(400, 'INVALID_MATERIAL_ID', 'Некорректный ID материала.');
  }

  try {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const material = await tx.material.findUnique({ where: { id } });
          if (!material) {
            rejectRequest(404, 'MATERIAL_NOT_FOUND', 'Материал не найден.');
          }

          // Повторный DELETE не меняет дату удаления и не дублирует аудит.
          if (material.deletedAt !== null) {
            return {
              success: true,
              id,
              alreadyDeleted: true,
              message: 'Материал уже удалён из справочника.',
            };
          }

          const activeReferences = await tx.receiptMaterial.count({
            where: {
              materialId: id,
              ...blockingReceiptWhere,
            },
          });

          if (activeReferences > 0) {
            const message =
              `Нельзя удалить материал «${material.name}»: ` +
              `он используется в действующих записях Реестра или отдельных ` +
              `действующих поступлениях (связей: ${activeReferences}).`;
            throw createError({
              statusCode: 409,
              statusMessage: 'MATERIAL_IN_USE',
              message,
              data: { code: 'MATERIAL_IN_USE', message, activeReferences },
            });
          }

          const actor = await tx.user.findUnique({
            where: { id: permission.userId },
            select: { email: true, login: true, authType: true },
          });
          if (!actor) {
            rejectRequest(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
          }
          const actorIdentifier = actor.email || actor.login || `user:${permission.userId}`;

          // Используем тот же предикат, что в count. Физических удалений нет:
          // ID материала и все ссылки, в том числе исторические, сохраняются.
          const updated = await tx.material.updateMany({
            where: {
              id,
              deletedAt: null,
              receipts: { none: blockingReceiptWhere },
            },
            data: {
              deletedAt: new Date(),
              deletedBy: actorIdentifier,
              editorEmail: actorIdentifier,
            },
          });

          if (updated.count !== 1) {
            rejectRequest(409, 'MATERIAL_STATE_CHANGED',
              'Состояние материала изменилось. Обновите справочник и повторите операцию.');
          }

          // deletedAt имеет тип @db.Date: для аудита читаем значение из БД.
          const deletedMaterial = await tx.material.findUniqueOrThrow({ where: { id } });

          // Delta указана явно: computeAuditDelta исключает поля мягкого удаления.
          // Ошибка аудита должна прервать транзакцию и отменить изменение материала.
          await writeAuditEvent({
            event,
            db: tx,
            category: 'DATA',
            result: 'SUCCESS',
            action: 'DELETE',
            resourceKey: RESOURCE_KEY,
            entityType: 'Material',
            entityId: id,
            actorUserId: permission.userId,
            actorLogin: actor.login,
            actorEmail: actorIdentifier,
            actorAuthType: actor.authType,
            note: `Мягко удалён материал «${material.name}». Действующих связей нет.`,
            changes: {
              deletedAt: { before: null, after: deletedMaterial.deletedAt?.toISOString() ?? null },
              deletedBy: { before: material.deletedBy, after: deletedMaterial.deletedBy },
            },
          });

          return {
            success: true,
            id,
            alreadyDeleted: false,
            message: 'Материал мягко удалён из справочника.',
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable) throw error;
        if (attempt === MAX_TRANSACTION_ATTEMPTS) {
          rejectRequest(409, 'MATERIAL_CONCURRENT_UPDATE',
            'Данные изменяются другим пользователем. Повторите удаление.');
        }

        // Только подтверждённый конфликт транзакций. Ожидание — вне транзакции.
        await new Promise<void>((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }

    throw new Error('Unexpected end of material deletion retry loop');
  } catch (error: unknown) {
    if (isError(error)) throw error;

    console.error('[lab/material DELETE] Ошибка удаления материала:', error);
    rejectRequest(500, 'MATERIAL_DELETE_FAILED',
      'Не удалось удалить материал. Повторите попытку или обратитесь к администратору.');
  }
});
