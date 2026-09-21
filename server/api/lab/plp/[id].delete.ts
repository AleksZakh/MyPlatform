// Установить как server/api/lab/plp/[id].delete.ts
import { AccessAction, Prisma } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, isError } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { writeAuditEvent } from '~~/server/utils/auditLog';

// Ключ из ранее предоставленного prisma/seed.ts; это не путь API.
const RESOURCE_KEY = 'lab.plps';
const MAX_TRANSACTION_ATTEMPTS = 3;
const MAX_DATABASE_INT = 2_147_483_647;

export default defineEventHandler(async (event) => {
  const permission = await requirePermission(
    event,
    RESOURCE_KEY,
    AccessAction.DELETE,
  );

  const idParam = getRouterParam(event, 'id') ?? '';
  const id = Number(idParam);

  // Не принимаем "12abc", "1.5", ноль и значения вне диапазона Prisma Int.
  if (!/^[1-9]\d*$/.test(idParam) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid PLP ID',
      message: 'Некорректный ID ПЛП.',
      data: { code: 'INVALID_PLP_ID', message: 'Некорректный ID ПЛП.' },
    });
  }

  try {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const existingPlp = await tx.plp.findUnique({ where: { id } });

          if (!existingPlp) {
            throw createError({
              statusCode: 404,
              statusMessage: 'PLP not found',
              message: `ПЛП с ID ${id} не найден.`,
              data: { code: 'PLP_NOT_FOUND', message: `ПЛП с ID ${id} не найден.` },
            });
          }

          // Повторный DELETE не меняет дату удаления и не дублирует аудит.
          if (existingPlp.deletedAt !== null) {
            return {
              success: true,
              id,
              alreadyDeleted: true,
              message: 'ПЛП уже удалён из справочника.',
            };
          }

          const activeReferences = await tx.samplingTest.count({
            where: { plpId: id, deletedAt: null },
          });

          if (activeReferences > 0) {
            const message =
              `Нельзя удалить ПЛП «${existingPlp.name}»: ` +
              `он используется в действующих записях Реестра (${activeReferences}).`;

            throw createError({
              statusCode: 409,
              statusMessage: 'PLP is in use',
              message,
              data: { code: 'PLP_IN_USE', message, activeReferences },
            });
          }

          // Идентификатор автора берём из проверенной учётной записи,
          // а не из тела запроса или переданного клиентом deletedBy.
          const actor = await tx.user.findUnique({
            where: { id: permission.userId },
            select: { email: true, login: true, authType: true },
          });

          if (!actor) {
            throw createError({
              statusCode: 401,
              statusMessage: 'User not found',
              message: 'Учётная запись пользователя не найдена.',
              data: { code: 'USER_NOT_FOUND', message: 'Учётная запись пользователя не найдена.' },
            });
          }

          const actorIdentifier = actor.email || actor.login || `user:${permission.userId}`;

          // Физического DELETE нет. Ссылки мягко удалённых записей сохраняются.
          // Предикат использования повторён в UPDATE: проверяем и помечаем
          // удаление в одной транзакции, не разделяя их между запросами HTTP.
          const updateResult = await tx.plp.updateMany({
            where: {
              id,
              deletedAt: null,
              samplingTests: { none: { deletedAt: null } },
            },
            data: {
              deletedAt: new Date(),
              deletedBy: actorIdentifier,
              editorEmail: actorIdentifier,
            },
          });

          if (updateResult.count !== 1) {
            throw createError({
              statusCode: 409,
              statusMessage: 'PLP state changed',
              message: 'Состояние ПЛП изменилось. Обновите справочник и повторите операцию.',
              data: {
                code: 'PLP_STATE_CHANGED',
                message: 'Состояние ПЛП изменилось. Обновите справочник и повторите операцию.',
              },
            });
          }

          // deletedAt хранится как @db.Date. Для аудита читаем именно значение
          // из БД, а не выдаём локальное время за сохранённую точность поля.
          const deletedPlp = await tx.plp.findUniqueOrThrow({ where: { id } });

          // Явная delta: computeAuditDelta() в проекте исключает deletedAt/deletedBy.
          await writeAuditEvent({
            event,
            db: tx,
            category: 'DATA',
            result: 'SUCCESS',
            action: 'DELETE',
            resourceKey: RESOURCE_KEY,
            entityType: 'Plp',
            entityId: id,
            actorUserId: permission.userId,
            actorLogin: actor.login,
            actorEmail: actorIdentifier,
            actorAuthType: actor.authType,
            note: `Мягко удалён ПЛП «${existingPlp.name}». Действующих связей нет.`,
            changes: {
              deletedAt: {
                before: existingPlp.deletedAt,
                after: deletedPlp.deletedAt?.toISOString() ?? null,
              },
              deletedBy: {
                before: existingPlp.deletedBy,
                after: deletedPlp.deletedBy,
              },
            },
          });

          return {
            success: true,
            id,
            alreadyDeleted: false,
            message: 'ПЛП мягко удалён из справочника.',
          };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
      } catch (error: unknown) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

        if (!retryable) throw error;
        if (attempt === MAX_TRANSACTION_ATTEMPTS) {
          throw createError({
            statusCode: 409,
            statusMessage: 'Concurrent update',
            message: 'Данные изменяются другим пользователем. Повторите удаление.',
            data: {
              code: 'PLP_CONCURRENT_UPDATE',
              message: 'Данные изменяются другим пользователем. Повторите удаление.',
            },
          });
        }

        // Небольшая пауза вне транзакции, только при подтверждённом конфликте БД.
        await new Promise<void>((resolve) => setTimeout(resolve, 50 * attempt));
      }
    }

    throw new Error('Unexpected end of PLP deletion retry loop');
  } catch (error: unknown) {
    // Ожидаемые HTTP-отказы сохраняем, не выдаём за сбой программы.
    if (isError(error)) throw error;

    console.error('[lab/plp DELETE] Ошибка удаления ПЛП:', error);
    throw createError({
      statusCode: 500,
      statusMessage: 'PLP deletion failed',
      message: 'Не удалось удалить ПЛП. Повторите попытку или обратитесь к администратору.',
      data: {
        code: 'PLP_DELETE_FAILED',
        message: 'Не удалось удалить ПЛП. Повторите попытку или обратитесь к администратору.',
      },
    });
  }
});
