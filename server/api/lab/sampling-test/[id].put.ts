// server/api/lab/sampling-test/[id].put.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const idParam = getRouterParam(event, 'id');
    const id = parseInt(idParam || '', 10);

    if (isNaN(id) || id <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Некорректный ID акта отбора',
      });
    }

    // Проверяем существование записи
    const existingSamplingTest = await prisma.samplingTest.findUnique({
      where: { id },
    });

    if (!existingSamplingTest) {
      throw createError({
        statusCode: 404,
        statusMessage: `Акт отбора с ID ${id} не найден`,
      });
    }

    const multipartData = await readMultipartFormData(event);

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Форма не содержит данных',
      });
    }

    const { body, fileDbPaths } = await handleFileUpload(multipartData);

    // ========================================
    // ПОДГОТОВКА ДАННЫХ ДЛЯ ОБНОВЛЕНИЯ
    // ========================================
    
    const updateData: any = {};
    const relationsData: any = {};

    // Проверяем ПЛП
    if (body.plpId) {
      const plpId = parseInt(body.plpId);
      if (isNaN(plpId) || plpId <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Некорректный ID ПЛП',
        });
      }
      const plp = await prisma.plp.findUnique({ where: { id: plpId } });
      if (!plp) {
        throw createError({
          statusCode: 404,
          statusMessage: `ПЛП с ID ${plpId} не найден`,
        });
      }
      relationsData.plpId = plpId;
    }

    // Проверяем Инспектора
    if (body.inspectorId) {
      const inspectorId = parseInt(body.inspectorId);
      if (isNaN(inspectorId) || inspectorId <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Некорректный ID Инспектора',
        });
      }
      const inspector = await prisma.inspector.findUnique({ where: { id: inspectorId } });
      if (!inspector) {
        throw createError({
          statusCode: 404,
          statusMessage: `Инспектор с ID ${inspectorId} не найден`,
        });
      }
      relationsData.inspectorId = inspectorId;
    }

    // Проверяем Место отбора
    if (body.testLocationId) {
      const testLocationId = parseInt(body.testLocationId);
      if (isNaN(testLocationId) || testLocationId <= 0) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Некорректный ID места отбора',
        });
      }
      const testLocation = await prisma.testLocation.findUnique({ where: { id: testLocationId } });
      if (!testLocation) {
        throw createError({
          statusCode: 404,
          statusMessage: `Место отбора с ID ${testLocationId} не найдено`,
        });
      }
      relationsData.testLocationId = testLocationId;
    }

    // Проверяем уникальность номера акта (если изменился)
    if (body.sActNumber?.trim() && body.sActNumber.trim() !== existingSamplingTest.sActNumber) {
      const duplicate = await prisma.samplingTest.findUnique({
        where: { sActNumber: body.sActNumber.trim() },
      });
      if (duplicate) {
        throw createError({
          statusCode: 400,
          statusMessage: `Акт с номером "${body.sActNumber}" уже существует`,
        });
      }
      updateData.sActNumber = body.sActNumber.trim();
    }

    // Проверяем Поступление материала
    if (body.receiptMaterialId !== undefined) {
      if (body.receiptMaterialId) {
        const rmId = parseInt(body.receiptMaterialId);
        if (isNaN(rmId) || rmId <= 0) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Некорректный ID поступления материала',
          });
        }
        const receiptMaterial = await prisma.receiptMaterial.findUnique({
          where: { id: rmId },
        });
        if (!receiptMaterial) {
          throw createError({
            statusCode: 404,
            statusMessage: `Поступление материала с ID ${rmId} не найдено`,
          });
        }
        relationsData.receiptMaterialId = rmId;
      } else {
        relationsData.receiptMaterialId = null;
      }
    }

    // Проверяем Протокол испытаний
    if (body.testProtocolId !== undefined) {
      if (body.testProtocolId) {
        const tpId = parseInt(body.testProtocolId);
        if (isNaN(tpId) || tpId <= 0) {
          throw createError({
            statusCode: 400,
            statusMessage: 'Некорректный ID протокола испытаний',
          });
        }
        const testProtocol = await prisma.testProtocol.findUnique({
          where: { id: tpId },
        });
        if (!testProtocol) {
          throw createError({
            statusCode: 404,
            statusMessage: `Протокол испытаний с ID ${tpId} не найден`,
          });
        }
        relationsData.testProtocolId = tpId;
      } else {
        relationsData.testProtocolId = null;
      }
    }

    // Обновляем поля
    if (body.sActDate) {
      updateData.sActDate = parseDate(body.sActDate);
    }
    if (body.note !== undefined) {
      updateData.note = body.note || null;
    }
    if (fileDbPaths.sDoc) {
      updateData.sDocPath = fileDbPaths.sDoc;
    }

    // Объединяем данные
    const finalData = { ...updateData, ...relationsData };

    // Добавляем системные поля
    finalData.editorEmail = body.editorEmail || event.context.user?.email || 'system@user';
    finalData.editedAt = new Date();

    // ========================================
    // ОБНОВЛЕНИЕ АКТА ОТБОРА
    // ========================================
    const updatedSamplingTest = await prisma.samplingTest.update({
      where: { id },
      data: finalData,
    });

    return {
      success: true,
      data: updatedSamplingTest,
      message: 'Акт отбора успешно обновлен',
    };

  } catch (error: any) {
    console.error('Ошибка при обновлении акта отбора:', error);
    
    if (error.statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении акта отбора',
    });
  }
});