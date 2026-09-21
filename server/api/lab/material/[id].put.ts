// Установить как server/api/lab/material/[id].put.ts
import { AccessAction, Prisma } from '@prisma/client';
import { createError, defineEventHandler, getRouterParam, isError, readBody } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { computeAuditDelta, writeAuditEvent } from '~~/server/utils/auditLog';

const RESOURCE_KEY = 'lab.materials';
const MAX_DATABASE_INT = 2_147_483_647;

interface MaterialInput {
  name: string;
  // undefined — сохранить прежнее примечание; null — явно очистить.
  note: string | null | undefined;
}

function rejectRequest(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, message, data: { code, message } });
}

function parseInput(value: unknown): MaterialInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    rejectRequest(400, 'INVALID_MATERIAL_BODY', 'Ожидается объект с данными материала.');
  }

  const body = value as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim()) {
    rejectRequest(400, 'INVALID_MATERIAL_NAME', 'Название материала обязательно для заполнения.');
  }

  // Как и в новом POST: Material.name имеет @db.Text.
  // Ограничение в 255 символов из справочника ПЛП сюда не переносим.
  const name = body.name.trim();
  if (name.includes('\u0000')) {
    rejectRequest(400, 'INVALID_MATERIAL_NAME', 'Название материала содержит недопустимый нулевой символ.');
  }

  const rawNote = body.note;
  if (rawNote !== undefined && rawNote !== null && typeof rawNote !== 'string') {
    rejectRequest(400, 'INVALID_MATERIAL_NOTE', 'Примечание должно быть строкой или null.');
  }
  if (typeof rawNote === 'string' && rawNote.includes('\u0000')) {
    rejectRequest(400, 'INVALID_MATERIAL_NOTE', 'Примечание содержит недопустимый нулевой символ.');
  }

  // Старая форма может присылать manufacturerId/manufacturer и служебные поля.
  // Они игнорируются. Производителя конкретного ReceiptMaterial здесь не меняем.
  // Не передаём ...body в Prisma и не доверяем клиентскому editorEmail.
  return {
    name,
    note: typeof rawNote === 'string' && !rawNote.trim() ? null : rawNote,
  };
}

function isNameConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  // Не выдаём нарушение другого уникального ограничения за занятое название.
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('name')
    : target === 'name' || target === 'materials_name_key';
}

export default defineEventHandler(async (event) => {
  // Отказы в доступе сохраняют исходный статус и не превращаются в 500.
  const permission = await requirePermission(event, RESOURCE_KEY, AccessAction.UPDATE);

  const idParam = getRouterParam(event, 'id') ?? '';
  const id = Number(idParam);
  if (!/^[1-9]\d*$/.test(idParam) || !Number.isSafeInteger(id) || id > MAX_DATABASE_INT) {
    rejectRequest(400, 'INVALID_MATERIAL_ID', 'Некорректный ID материала.');
  }

  try {
    const input = parseInput(await readBody<unknown>(event));

    return await prisma.$transaction(async (tx) => {
      const current = await tx.material.findFirst({ where: { id, deletedAt: null } });
      if (!current) {
        rejectRequest(404, 'MATERIAL_NOT_FOUND', 'Материал не найден или удалён из справочника.');
      }

      const nextNote = input.note === undefined ? current.note : input.note;
      const changes = computeAuditDelta(
        { name: current.name, note: current.note },
        { name: input.name, note: nextNote },
      );

      // Без фактических изменений не трогаем editedAt и не пишем пустой аудит.
      if (Object.keys(changes).length === 0) {
        return { success: true, data: current, message: 'Данные материала не изменились.' };
      }

      if (input.name !== current.name) {
        // name остаётся уникальным для всей таблицы, включая удалённые строки.
        // Редактирование не создаёт дубль и не восстанавливает другой материал.
        const duplicate = await tx.material.findUnique({
          where: { name: input.name },
          select: { id: true, deletedAt: true },
        });
        if (duplicate && duplicate.id !== id) {
          if (duplicate.deletedAt !== null) {
            rejectRequest(409, 'MATERIAL_NAME_RESERVED',
              'Это название занято мягко удалённым материалом. Укажите другое название.');
          }
          rejectRequest(409, 'MATERIAL_NAME_EXISTS', 'Материал с таким названием уже существует.');
        }
      }

      // Редактор — проверенный пользователь приложения, а не поле формы.
      const actor = await tx.user.findUnique({
        where: { id: permission.userId },
        select: { email: true, login: true, authType: true },
      });
      if (!actor) {
        rejectRequest(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
      }
      const actorIdentifier = actor.email || actor.login || `user:${permission.userId}`;

      // Явный тип: только реальные поля Material, без вложенного изменения связей.
      const data: Prisma.MaterialUpdateManyMutationInput = {
        name: input.name,
        note: nextNote,
        editorEmail: actorIdentifier,
        editedAt: new Date(),
      };

      let updateResult: { count: number };
      try {
        updateResult = await tx.material.updateMany({
          // Не обновляем удалённую/изменённую после чтения строку.
          // Это защита внутри операции, НЕ проверка версии формы с её открытия.
          where: {
            id,
            deletedAt: null,
            name: current.name,
            note: current.note,
            editedAt: current.editedAt,
          },
          data,
        });
      } catch (error: unknown) {
        // Имя могли занять после предварительного SELECT.
        // Обрабатываем только изменение Material; ошибки аудита сюда не попадут.
        if (isNameConflict(error)) {
          rejectRequest(409, 'MATERIAL_NAME_EXISTS',
            'Название материала уже занято. Обновите справочник и выберите другое название.');
        }
        throw error;
      }

      if (updateResult.count !== 1) {
        rejectRequest(409, 'MATERIAL_STATE_CHANGED',
          'Материал изменён или удалён другим пользователем. Обновите справочник перед повторным сохранением.');
      }

      const updated = await tx.material.findUniqueOrThrow({ where: { id } });

      // ID и связи остаются прежними. Поступления и Реестр не пересохраняем,
      // их производителей, даты и десятиминутные окна не изменяем.
      // Ошибка записи события прерывает общую транзакцию.
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'UPDATE',
        resourceKey: RESOURCE_KEY,
        entityType: 'Material',
        entityId: id,
        actorUserId: permission.userId,
        actorLogin: actor.login,
        actorEmail: actorIdentifier,
        actorAuthType: actor.authType,
        note: `Изменён материал «${updated.name}».`,
        changes,
      });

      // Сохраняем оболочку ответа формы. Данные — реальные поля Material.
      return { success: true, data: updated, message: 'Материал успешно обновлён.' };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error: unknown) {
    if (isError(error)) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      rejectRequest(409, 'MATERIAL_CONCURRENT_UPDATE',
        'Данные изменяются другим пользователем. Обновите справочник и повторите сохранение.');
    }

    console.error('[lab/material PUT] Ошибка обновления материала:', error);
    rejectRequest(500, 'MATERIAL_UPDATE_FAILED',
      'Не удалось сохранить материал. Повторите попытку или обратитесь к администратору.');
  }
});
