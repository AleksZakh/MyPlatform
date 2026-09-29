// server/api/lab/sampling-test/index.post.ts

import { defineEventHandler, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';
import { logAudit, getActorEmail, getRequestMeta } from '~~/server/utils/auditLog';
import { AccessAction,} from '@prisma/client';

import {
  requirePermission,
} from '../../../services/access-control.service';

import { prisma } from '../../../utils/prisma';

export default defineEventHandler(async (event) => {
  await requirePermission(
    event,
    'lab.sampling-tests',
    AccessAction.CREATE,
  );
  try {
    const multipartData = await readMultipartFormData(event);

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Форма не содержит данных',
      });
    }

    const { body, fileDbPaths } = await handleFileUpload(multipartData);

    // ========================================
    // ВАЛИДАЦИЯ
    // ========================================
    
    // Проверяем ПЛП
    if (!body.plpId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'ПЛП обязателен для заполнения',
      });
    }
    const plpId = parseInt(body.plpId);
    if (isNaN(plpId) || plpId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID ПЛП',
      });
    }

    // Проверяем Инспектора
    if (!body.inspectorId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Инспектор обязателен для заполнения',
      });
    }
    const inspectorId = parseInt(body.inspectorId);
    if (isNaN(inspectorId) || inspectorId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID Инспектора',
      });
    }

    // Проверяем Место отбора
    if (!body.testLocationId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Место отбора обязательно для заполнения',
      });
    }
    const testLocationId = parseInt(body.testLocationId);
    if (isNaN(testLocationId) || testLocationId <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID места отбора',
      });
    }

    // Проверяем Номер акта
    if (!body.sActNumber?.trim()) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Номер акта обязателен для заполнения',
      });
    }

    // Проверяем уникальность номера акта
    const existingAct = await prisma.samplingTest.findFirst({
      where: {
        samplingActNumber: body.sActNumber.trim(),
        deletedAt: null,  // ← не считаем удалённые дубликатами
      },
    });
    if (existingAct) {
      throw createError({
        statusCode: 400,
        statusMessage: `Акт с номером "${body.sActNumber}" уже существует`,
      });
    }

    // Проверяем существование связанных записей
    const [plp, inspector, testLocation] = await Promise.all([
      prisma.plp.findUnique({ where: { id: plpId } }),
      prisma.inspector.findUnique({ where: { id: inspectorId } }),
      prisma.testLocation.findUnique({ where: { id: testLocationId } }),
    ]);

    if (!plp) {
      throw createError({
        statusCode: 404,
        statusMessage: `ПЛП с ID ${plpId} не найден`,
      });
    }
    if (!inspector) {
      throw createError({
        statusCode: 404,
        statusMessage: `Инспектор с ID ${inspectorId} не найден`,
      });
    }
    if (!testLocation) {
      throw createError({
        statusCode: 404,
        statusMessage: `Место отбора с ID ${testLocationId} не найдено`,
      });
    }

    // Проверяем Поступление материала (если указано)
    let receiptMaterialId: number | null = null;
    if (body.receiptMaterialId) {
      const rmId = parseInt(body.receiptMaterialId);
      if (!isNaN(rmId) && rmId > 0) {
        const receiptMaterial = await prisma.receiptMaterial.findUnique({
          where: { id: rmId },
        });
        if (!receiptMaterial) {
          throw createError({
            statusCode: 404,
            statusMessage: `Поступление материала с ID ${rmId} не найдено`,
          });
        }
        receiptMaterialId = rmId;
      }
    }

    // Проверяем Протокол испытаний (если указан)
    let testProtocolId: number | null = null;
    if (body.testProtocolId) {
      const tpId = parseInt(body.testProtocolId);
      if (!isNaN(tpId) && tpId > 0) {
        const testProtocol = await prisma.testProtocol.findUnique({
          where: { id: tpId },
        });
        if (!testProtocol) {
          throw createError({
            statusCode: 404,
            statusMessage: `Протокол испытаний с ID ${tpId} не найден`,
          });
        }
        testProtocolId = tpId;
      }
    }

    if (receiptMaterialId === null) {
      throw createError({ statusCode: 400, statusMessage: 'Receipt required', message: 'Для акта отбора необходимо выбрать поступление материала.' });
    }

    const authorEmail = body.authorEmail || event.context.user?.email || 'system@user';

    // ========================================
    // СОЗДАНИЕ АКТА ОТБОРА
    // ========================================
    const newSamplingTest = await prisma.samplingTest.create({
      data: {
        samplingActNumber: body.sActNumber.trim(),
        samplingDate: parseDate(body.sActDate) || new Date(),
        samplingDocumentPath: fileDbPaths.sDoc || null,
        note: body.note || null,
        plpId: parseInt(body.plpId),
        inspectorId: parseInt(body.inspectorId),
        testLocationId: parseInt(body.testLocationId),
        testProtocolId,
        receiptMaterialId,
        authorEmail,
        createdAt: new Date(),
      },
    });

    // 2. Логируем в AuditLog
    await logAudit({
      entityType: 'SamplingTest',
      entityId: newSamplingTest.id,
      action: 'CREATE',
      actorEmail: authorEmail,
      note: `Создан акт отбора № ${newSamplingTest.samplingActNumber}`,
      afterData: newSamplingTest as any,
      ...getRequestMeta(event),
    });

    return {
      success: true,
      data: newSamplingTest,
      message: 'Акт отбора успешно создан',
    };

  } catch (error: any) {
    console.error('Ошибка при создании акта отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при создании акта отбора',
    });
  }
});