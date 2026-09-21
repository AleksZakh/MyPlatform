// Установить как server/api/lab/plp/index.post.ts
import { AccessAction, Prisma } from '@prisma/client';
import { createError, defineEventHandler, isError, readBody } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { buildCreateAuditDelta, writeAuditEvent } from '~~/server/utils/auditLog';

const RESOURCE_KEY = 'lab.plps';
const MAX_NAME_LENGTH = 255;

interface PlpCreateInput {
  name: string;
  note: string | null;
}

function rejectRequest(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, message, data: { code, message } });
}

function parseInput(value: unknown): PlpCreateInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    rejectRequest(400, 'INVALID_PLP_BODY', 'Ожидается объект с данными ПЛП.');
  }

  const body = value as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim()) {
    rejectRequest(400, 'INVALID_PLP_NAME', 'Название ПЛП обязательно для заполнения.');
  }

  // Те же правила имени, что в обновлённом [id].put.ts.
  const name = body.name.trim();
  if ([...name].length > MAX_NAME_LENGTH || name.includes('\u0000')) {
    rejectRequest(400, 'INVALID_PLP_NAME',
      'Название ПЛП должно содержать не более 255 символов и не содержать нулевой символ.');
  }

  const rawNote = body.note;
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
    rejectRequest(400, 'INVALID_PLP_NOTE', 'Примечание должно быть строкой или null.');
  }
  if (typeof rawNote === 'string' && rawNote.includes('\u0000')) {
    rejectRequest(400, 'INVALID_PLP_NOTE', 'Примечание содержит недопустимый нулевой символ.');
  }

  // Только name и note. Присланные клиентом id, authorEmail, editorEmail,
  // createdAt, deletedAt и другие служебные поля не используются.
  return {
    name,
    note: typeof rawNote === 'string' && rawNote.trim() ? rawNote : null,
  };
}

function isNameConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  // Не выдаём, например, конфликт первичного ключа за занятое название.
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('name')
    : target === 'name' || target === 'plps_name_key';
}

export default defineEventHandler(async (event) => {
  // Права проверяются до чтения и создания справочного элемента.
  const permission = await requirePermission(event, RESOURCE_KEY, AccessAction.CREATE);

  try {
    const input = parseInput(await readBody<unknown>(event));

    return await prisma.$transaction(async (tx) => {
      // name имеет @unique во всей таблице, включая мягко удалённые ПЛП.
      // Создание нового элемента не восстанавливает существующий.
      const existing = await tx.plp.findUnique({
        where: { name: input.name },
        select: { id: true, deletedAt: true },
      });

      if (existing) {
        if (existing.deletedAt !== null) {
          rejectRequest(409, 'PLP_NAME_RESERVED',
            'Это название занято мягко удалённым ПЛП. Укажите другое название.');
        }
        rejectRequest(409, 'PLP_NAME_EXISTS', 'ПЛП с таким названием уже существует.');
      }

      // Автор — пользователь, проверенный requirePermission, а не поле формы.
      const actor = await tx.user.findUnique({
        where: { id: permission.userId },
        select: { email: true, login: true, authType: true },
      });
      if (!actor) {
        rejectRequest(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
      }
      const actorIdentifier = actor.email || actor.login || `user:${permission.userId}`;

      const newPlp = await tx.plp.create({
        data: {
          name: input.name,
          note: input.note,
          authorEmail: actorIdentifier,
        },
      }).catch((error: unknown): never => {
        // Имя могли занять после предварительного SELECT.
        // Проверяем только ошибку CREATE ПЛП, не подменяем ошибки аудита.
        if (isNameConflict(error)) {
          rejectRequest(409, 'PLP_NAME_EXISTS',
            'Название ПЛП уже занято. Обновите справочник и выберите другое название.');
        }
        throw error;
      });

      // Запись и успешное событие создаются вместе. Ошибка аудита
      // передаётся наружу и отменяет транзакцию, а не игнорируется.
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'CREATE',
        resourceKey: RESOURCE_KEY,
        entityType: 'Plp',
        entityId: newPlp.id,
        actorUserId: permission.userId,
        actorLogin: actor.login,
        actorEmail: actorIdentifier,
        actorAuthType: actor.authType,
        note: `Создан ПЛП «${newPlp.name}».`,
        changes: buildCreateAuditDelta(
          { name: newPlp.name, note: newPlp.note },
          ['name', 'note'],
        ),
      });

      // Прежний ответ формы. Схему БД и названия полей не меняем.
      return { success: true, data: newPlp, message: 'ПЛП успешно создан' };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error: unknown) {
    // Ожидаемые 400/401/409 не превращаем в 500 и не логируем как поломку.
    if (isError(error)) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      rejectRequest(409, 'PLP_CONCURRENT_UPDATE',
        'Данные изменяются другим пользователем. Обновите справочник и повторите создание.');
    }

    console.error('[lab/plp POST] Ошибка создания ПЛП:', error);
    rejectRequest(500, 'PLP_CREATE_FAILED',
      'Не удалось создать ПЛП. Повторите попытку или обратитесь к администратору.');
  }
});
