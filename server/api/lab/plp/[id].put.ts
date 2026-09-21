// Установить как server/api/lab/plp/[id].put.ts
import { AccessAction, Prisma } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, isError, readBody } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { computeAuditDelta, writeAuditEvent } from '~~/server/utils/auditLog';

const RESOURCE_KEY = 'lab.plps';
const MAX_DATABASE_INT = 2_147_483_647;
const MAX_NAME_LENGTH = 255;

interface PlpInput {
  name: string;
  // undefined — поле не передано; null — явно очистить примечание.
  note: string | null | undefined;
}

function rejectRequest(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, message, data: { code, message } });
}

function parseInput(value: unknown): PlpInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    rejectRequest(400, 'INVALID_PLP_BODY', 'Ожидается объект с данными ПЛП.');
  }

  const body = value as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim()) {
    rejectRequest(400, 'INVALID_PLP_NAME', 'Название ПЛП обязательно для заполнения.');
  }

  const name = body.name.trim();
  if ([...name].length > MAX_NAME_LENGTH || name.includes('\u0000')) {
    rejectRequest(400, 'INVALID_PLP_NAME', 'Название ПЛП должно содержать не более 255 символов и не содержать нулевой символ.');
  }

  const rawNote = body.note;
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
    rejectRequest(400, 'INVALID_PLP_NOTE', 'Примечание должно быть строкой или null.');
  }
  if (typeof rawNote === 'string' && rawNote.includes('\u0000')) {
    rejectRequest(400, 'INVALID_PLP_NOTE', 'Примечание содержит недопустимый нулевой символ.');
  }

  // Не принимаем editorEmail, authorEmail, deletedAt и другие служебные поля
  // как источник изменений. Старые формы могут их прислать: они игнорируются.
  return {
    name,
    note: typeof rawNote === 'string' && !rawNote.trim() ? null : rawNote,
  };
}

export default defineEventHandler(async (event) => {
  const permission = await requirePermission(event, RESOURCE_KEY, AccessAction.UPDATE);

  const idParam = getRouterParam(event, 'id') ?? '';
  const id = Number(idParam);
  if (!/^[1-9]\d*$/.test(idParam) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    rejectRequest(400, 'INVALID_PLP_ID', 'Некорректный ID ПЛП.');
  }

  try {
    const input = parseInput(await readBody<unknown>(event));

    return await prisma.$transaction(async (tx) => {
      const current = await tx.plp.findFirst({ where: { id, deletedAt: null } });
      if (!current) {
        rejectRequest(404, 'PLP_NOT_FOUND', 'ПЛП не найден или удалён из справочника.');
      }

      const nextNote = input.note === undefined ? current.note : input.note;
      const changes = computeAuditDelta(
        { name: current.name, note: current.note },
        { name: input.name, note: nextNote },
      );

      // Нажатие «Сохранить» без фактических изменений не обновляет editedAt
      // и не создаёт пустое событие аудита.
      if (Object.keys(changes).length === 0) {
        return { success: true, data: current, message: 'Данные ПЛП не изменились.' };
      }

      if (input.name !== current.name) {
        // В схеме name имеет @unique для ВСЕХ ПЛП, включая мягко удалённые.
        // Не присваиваем занятое имя и не восстанавливаем удалённый элемент.
        const duplicate = await tx.plp.findUnique({
          where: { name: input.name },
          select: { id: true, deletedAt: true },
        });
        if (duplicate && duplicate.id !== id) {
          if (duplicate.deletedAt !== null) {
            rejectRequest(409, 'PLP_NAME_RESERVED',
              'Это название занято мягко удалённым ПЛП. Укажите другое название.');
          }
          rejectRequest(409, 'PLP_NAME_EXISTS', 'ПЛП с таким названием уже существует.');
        }
      }

      // Редактора определяем по учётной записи, проверенной requirePermission.
      const actor = await tx.user.findUnique({
        where: { id: permission.userId },
        select: { email: true, login: true, authType: true },
      });
      if (!actor) {
        rejectRequest(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
      }
      const actorIdentifier = actor.email || actor.login || `user:${permission.userId}`;

      let updateResult: { count: number };
      try {
        updateResult = await tx.plp.updateMany({
          // Защита от изменения/удаления после чтения внутри этой операции.
          // Это НЕ проверка версии формы с момента её открытия пользователем.
          where: {
            id,
            deletedAt: null,
            name: current.name,
            note: current.note,
            editedAt: current.editedAt,
          },
          data: {
            name: input.name,
            note: nextNote,
            editorEmail: actorIdentifier,
            editedAt: new Date(),
          },
        });
      } catch (error: unknown) {
        // Другой запрос мог занять имя после предварительной проверки.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          rejectRequest(409, 'PLP_NAME_EXISTS',
            'Название ПЛП уже занято. Обновите справочник и выберите другое название.');
        }
        throw error;
      }

      if (updateResult.count !== 1) {
        rejectRequest(409, 'PLP_STATE_CHANGED',
          'ПЛП изменён или удалён другим пользователем. Обновите справочник перед повторным сохранением.');
      }

      const updated = await tx.plp.findUniqueOrThrow({ where: { id } });

      // Обновляется только сам ПЛП. ID, ссылки SamplingTest.plpId и даты
      // создания связанных записей остаются прежними.
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'UPDATE',
        resourceKey: RESOURCE_KEY,
        entityType: 'Plp',
        entityId: id,
        actorUserId: permission.userId,
        actorLogin: actor.login,
        actorEmail: actorIdentifier,
        actorAuthType: actor.authType,
        note: `Изменён ПЛП «${updated.name}».`,
        changes,
      });

      // Сохраняем прежний контракт ответа формы справочника.
      return { success: true, data: updated, message: 'ПЛП успешно обновлён.' };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error: unknown) {
    if (isError(error)) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      rejectRequest(409, 'PLP_CONCURRENT_UPDATE',
        'Данные изменяются другим пользователем. Обновите справочник и повторите сохранение.');
    }

    console.error('[lab/plp PUT] Ошибка обновления ПЛП:', error);
    rejectRequest(500, 'PLP_UPDATE_FAILED',
      'Не удалось сохранить ПЛП. Повторите попытку или обратитесь к администратору.');
  }
});
