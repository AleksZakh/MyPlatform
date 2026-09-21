// Установить как server/api/lab/material/index.post.ts
import { AccessAction, Prisma } from '@prisma/client';
import { createError, defineEventHandler, isError, readBody } from 'h3';

import { prisma } from '~~/server/utils/prisma';
import { requirePermission } from '~~/server/services/access-control.service';
import { buildCreateAuditDelta, writeAuditEvent } from '~~/server/utils/auditLog';

const RESOURCE_KEY = 'lab.materials';

interface MaterialCreateInput {
  name: string;
  note: string | null;
}

function rejectRequest(statusCode: number, code: string, message: string): never {
  throw createError({ statusCode, statusMessage: code, message, data: { code, message } });
}

function parseInput(value: unknown): MaterialCreateInput {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    rejectRequest(400, 'INVALID_MATERIAL_BODY', 'Ожидается объект с данными материала.');
  }

  const body = value as Record<string, unknown>;
  if (typeof body.name !== 'string' || !body.name.trim()) {
    rejectRequest(400, 'INVALID_MATERIAL_NAME', 'Название материала обязательно для заполнения.');
  }

  // В актуальной схеме Material.name — @db.Text, а не VarChar(255), как у ПЛП.
  // Ограничение ПЛП в этот справочник не переносим.
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

  // Разрешённые пользовательские поля: только name и note.
  // Старая форма пока может присылать manufacturerId/manufacturer: игнорируем их.
  // Производитель выбирается для ReceiptMaterial, а не закрепляется за Material.
  // id, authorEmail, editorEmail, createdAt, deletedAt и прочие служебные поля
  // из тела запроса не используются. Никакого ...body в prisma.material.create().
  return {
    name,
    note: typeof rawNote === 'string' && rawNote.trim() ? rawNote : null,
  };
}

function isNameConflict(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
    return false;
  }

  // Конфликт первичного ключа или ошибки аудита не выдаём за занятое имя.
  const target = error.meta?.target;
  return Array.isArray(target)
    ? target.includes('name')
    : target === 'name' || target === 'materials_name_key';
}

export default defineEventHandler(async (event) => {
  // Проверка прав до чтения тела и изменения справочника.
  const permission = await requirePermission(event, RESOURCE_KEY, AccessAction.CREATE);

  try {
    const input = parseInput(await readBody<unknown>(event));

    return await prisma.$transaction(async (tx) => {
      // name имеет @unique во всей таблице, включая мягко удалённые материалы.
      // Не создаём дубль и не восстанавливаем удалённый элемент неявно.
      const existing = await tx.material.findUnique({
        where: { name: input.name },
        select: { id: true, deletedAt: true },
      });

      if (existing) {
        if (existing.deletedAt !== null) {
          rejectRequest(409, 'MATERIAL_NAME_RESERVED',
            'Это название занято мягко удалённым материалом. Укажите другое название.');
        }
        rejectRequest(409, 'MATERIAL_NAME_EXISTS', 'Материал с таким названием уже существует.');
      }

      // Автор — проверенный пользователь приложения, а не значение из формы.
      const actor = await tx.user.findUnique({
        where: { id: permission.userId },
        select: { email: true, login: true, authType: true },
      });
      if (!actor) {
        rejectRequest(401, 'USER_NOT_FOUND', 'Учётная запись пользователя не найдена.');
      }
      const actorIdentifier = actor.email || actor.login || `user:${permission.userId}`;

      // Явный тип не позволяет вновь добавить несуществующее поле производителя.
      const data: Prisma.MaterialCreateInput = {
        name: input.name,
        note: input.note,
        authorEmail: actorIdentifier,
      };

      const newMaterial = await tx.material.create({ data }).catch((error: unknown): never => {
        // Название могли занять между проверкой и CREATE.
        // Этот catch обрабатывает только создание Material, не запись аудита.
        if (isNameConflict(error)) {
          rejectRequest(409, 'MATERIAL_NAME_EXISTS',
            'Название материала уже занято. Обновите справочник и выберите другое название.');
        }
        throw error;
      });

      // Успешный аудит — часть той же транзакции. Ошибка записи события
      // передаётся наружу и отменяет создание материала.
      await writeAuditEvent({
        event,
        db: tx,
        category: 'DATA',
        result: 'SUCCESS',
        action: 'CREATE',
        resourceKey: RESOURCE_KEY,
        entityType: 'Material',
        entityId: newMaterial.id,
        actorUserId: permission.userId,
        actorLogin: actor.login,
        actorEmail: actorIdentifier,
        actorAuthType: actor.authType,
        note: `Создан материал «${newMaterial.name}».`,
        changes: buildCreateAuditDelta(
          { name: newMaterial.name, note: newMaterial.note },
          ['name', 'note'],
        ),
      });

      // Прежняя оболочка ответа формы. Данные — реальные поля Material.
      return { success: true, data: newMaterial, message: 'Материал успешно создан' };
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch (error: unknown) {
    // Ожидаемые HTTP-отказы не превращаем в 500 и не логируем как поломку.
    if (isError(error)) throw error;

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      rejectRequest(409, 'MATERIAL_CONCURRENT_UPDATE',
        'Данные изменяются другим пользователем. Повторите создание материала.');
    }

    console.error('[lab/material POST] Ошибка создания материала:', error);
    rejectRequest(500, 'MATERIAL_CREATE_FAILED',
      'Не удалось создать материал. Повторите попытку или обратитесь к администратору.');
  }
});
