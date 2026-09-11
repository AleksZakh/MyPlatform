// server/api/lab/sampling-test/[id].put.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';
import {
  logAudit,
  computeChangedFields,
  getActorEmail,
  getRequestMeta,
} from '~~/server/utils/auditLog';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    // ========================================
    // 1. ПОДГОТОВКА
    // ========================================
    console.log('Начало обновления')
    const idParam = getRouterParam(event, 'id');
    const id = parseInt(idParam || '', 10);

    if (isNaN(id) || id <= 0) {
      throw createError({ statusCode: 400, statusMessage: 'Некорректный ID акта отбора' });
    }

    const multipartData = await readMultipartFormData(event);
    if (!multipartData) {
      throw createError({ statusCode: 400, statusMessage: 'Форма не содержит данных' });
    }

    const { body, fileDbPaths } = await handleFileUpload(multipartData);
    const editorEmail = body.editorEmail || getActorEmail(event);
    const requestMeta = getRequestMeta(event);

    // console.log('body.protocolDate ===> ', body )

    // ========================================
    // 2. ЗАГРУЗКА СОСТОЯНИЯ "ДО" (вне транзакции — только чтение)
    // ========================================
    const beforeSamplingTest = await prisma.samplingTest.findUnique({
      where: { id },
      include: {
        receiptMaterial: true,
        testProtocol: true,
        testLocation: true,
      },
    });

    // console.log('beforeSamplingTest ===>', beforeSamplingTest)

    if (!beforeSamplingTest) {
      throw createError({ statusCode: 404, statusMessage: `Акт отбора с ID ${id} не найден` });
    }

    if (beforeSamplingTest.deletedAt) {
      throw createError({ statusCode: 400, statusMessage: 'Нельзя редактировать удалённую запись' });
    }

    // Загружаем beforeData для связанных сущностей
    const beforeReceiptMaterial = beforeSamplingTest.receiptMaterialId
      ? await prisma.receiptMaterial.findUnique({
          where: { id: beforeSamplingTest.receiptMaterialId },
          include: { material: true },
        })
      : null;

    const beforeTestProtocol = beforeSamplingTest.testProtocolId
      ? await prisma.testProtocol.findUnique({
          where: { id: beforeSamplingTest.testProtocolId },
        })
      : null;

    // ========================================
    // 3. ТРАНЗАКЦИЯ
    // ========================================
    const result = await prisma.$transaction(async (tx) => {
      // ----- Локальные переменные для результата -----
      const auditEntries: Array<{
        entityType: string;
        entityId: number;
        action: 'CREATE' | 'UPDATE' | 'DELETE';
        note: string;
        beforeData?: any;
        afterData?: any;
        changedFields?: string[];
      }> = [];

      // ----- 3.1 Подготовка данных для SamplingTest -----
      const updateSamplingTestData: any = {};
      const relationUpdates: any = {};

      // --- Проверка ПЛП ---
      if (body.plpId) {
        const plpId = parseInt(body.plpId);
        if (isNaN(plpId) || plpId <= 0) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный ID ПЛП' });
        }
        const plp = await tx.plp.findUnique({ where: { id: plpId } });
        if (!plp) {
          throw createError({ statusCode: 404, statusMessage: `ПЛП с ID ${plpId} не найден` });
        }
        relationUpdates.plpId = plpId;
      }

      // --- Проверка Инспектора ---
      if (body.inspectorId) {
        const inspectorId = parseInt(body.inspectorId);
        if (isNaN(inspectorId) || inspectorId <= 0) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный ID Инспектора' });
        }
        const inspector = await tx.inspector.findUnique({ where: { id: inspectorId } });
        if (!inspector) {
          throw createError({ statusCode: 404, statusMessage: `Инспектор с ID ${inspectorId} не найден` });
        }
        relationUpdates.inspectorId = inspectorId;
      }

      // --- Проверка/создание TestLocation ---
      if (body.testObjectId && body.testLocationName?.trim()) {
        const testObjectId = parseInt(body.testObjectId);
        if (isNaN(testObjectId) || testObjectId <= 0) {
          throw createError({ statusCode: 400, statusMessage: 'Некорректный ID объекта' });
        }

        const testObject = await tx.testObject.findUnique({ where: { id: testObjectId } });
        if (!testObject) {
          throw createError({ statusCode: 404, statusMessage: `Объект с ID ${testObjectId} не найден` });
        }

        const locationName = body.testLocationName.trim();

        let testLocation = await tx.testLocation.findUnique({
          where: { testObjectId_name: { testObjectId, name: locationName } },
        });

        if (!testLocation) {
          testLocation = await tx.testLocation.create({
            data: {
              name: locationName,
              testObjectId,
              note: `Создано при редактировании акта № ${id}`,
              authorEmail: editorEmail,
              createdAt: new Date(),
            },
          });

          auditEntries.push({
            entityType: 'TestLocation',
            entityId: testLocation.id,
            action: 'CREATE',
            note: `Создана новая локация "${locationName}" (объект: ${testObject.name})`,
            afterData: testLocation,
          });
        }

        relationUpdates.testLocationId = testLocation.id;
      }

      // --- Проверка уникальности номера акта ---
      if (body.sActNumber?.trim() && body.sActNumber.trim() !== beforeSamplingTest.sActNumber) {
        const duplicate = await tx.samplingTest.findFirst({
          where: {
            sActNumber: body.sActNumber.trim(),
            deletedAt: null,
            id: { not: id },
          },
        });
        if (duplicate) {
          throw createError({
            statusCode: 400,
            statusMessage: `Акт с номером "${body.sActNumber}" уже существует`,
          });
        }
        updateSamplingTestData.sActNumber = body.sActNumber.trim();
      }

      // ----- 3.2 Обновление ReceiptMaterial -----

      const isFilled = (val: any): boolean => {
        if (val === undefined || val === null) return false;
        if (typeof val === 'string' && val.trim() === '') return false;
        return true;
      };


      const hasReceiptData =
        isFilled(body.materialId) ||      // ID материала заполнен
        isFilled(body.material) ||        // или название материала
        isFilled(body.qualDate) ||        // или дата документа
        isFilled(body.receiptDate) ||     // или дата поступления
        isFilled(body.qualDocNumber) ||   // или номер документа
        isFilled(body.receiptNote) ||     // или примечание
        !!fileDbPaths.qualDoc;            // или загружен файл

      const hasReceiptChanges =
        isFilled(body.materialId) ||
        isFilled(body.material) ||
        isFilled(body.qualDate) ||
        isFilled(body.receiptDate) ||
        isFilled(body.qualDocNumber) ||
        isFilled(body.receiptNote) ||
        !!fileDbPaths.qualDoc;

      let receiptMaterialId = beforeSamplingTest.receiptMaterialId;

      if (hasReceiptChanges) {
        // ==========================================
        // ЕСЛИ У АКТА УЖЕ ЕСТЬ ПОСТУПЛЕНИЕ — ОБНОВЛЯЕМ
        // ==========================================
        if (receiptMaterialId) {
          const receiptUpdateData: any = {};

          // --- Материал ---
          if (isFilled(body.materialId)) {
            const materialId = parseInt(body.materialId);
            if (isNaN(materialId) || materialId <= 0) {
              throw createError({ statusCode: 400, statusMessage: 'Некорректный ID материала' });
            }
            const material = await tx.material.findUnique({ where: { id: materialId } });
            if (!material) {
              throw createError({ statusCode: 404, statusMessage: `Материал с ID ${materialId} не найден` });
            }
            receiptUpdateData.materialId = materialId;
          } else if (isFilled(body.material)) {
            // Если пришло название материала — ищем по имени
            const material = await tx.material.findUnique({ where: { name: body.material.trim() } });
            if (!material) {
              throw createError({ statusCode: 404, statusMessage: `Материал "${body.material}" не найден` });
            }
            receiptUpdateData.materialId = material.id;
          }

          if (body.receiptDate !== undefined) {
            receiptUpdateData.receiptDate = body.receiptDate ? parseDate(body.receiptDate) : null;
          }
          if (body.qualDate !== undefined) {
            receiptUpdateData.qualDate = body.qualDate ? parseDate(body.qualDate) : null;
          }
          if (body.qualDocNumber !== undefined) {
            receiptUpdateData.qualDocNumber = body.qualDocNumber?.trim() || null;
          }
          if (body.receiptNote !== undefined) {
            receiptUpdateData.note = body.receiptNote || null;
          }
          if (fileDbPaths.qualDoc) {
            receiptUpdateData.qualDocPath = fileDbPaths.qualDoc;
          }

          if (Object.keys(receiptUpdateData).length > 0) {
            receiptUpdateData.editorEmail = editorEmail;
            receiptUpdateData.editedAt = new Date();

            const updatedReceipt = await tx.receiptMaterial.update({
              where: { id: receiptMaterialId },
              data: receiptUpdateData,
            });

            const changedFields = computeChangedFields(beforeReceiptMaterial as any, updatedReceipt as any);
            if (changedFields.length > 0) {
              auditEntries.push({
                entityType: 'ReceiptMaterial',
                entityId: receiptMaterialId,
                action: 'UPDATE',
                note: `Изменено поступление материала. Поля: ${changedFields.join(', ')}`,
                beforeData: beforeReceiptMaterial,
                afterData: updatedReceipt,
                changedFields,
              });
            }
          }
        }
        // ==========================================
        // ЕСЛИ У АКТА НЕТ ПОСТУПЛЕНИЯ — СОЗДАЁМ НОВОЕ
        // НО ТОЛЬКО ЕСЛИ ЕСТЬ РЕАЛЬНЫЕ ДАННЫЕ
        // ==========================================
        else if (hasReceiptData) {
          // Находим materialId
          let materialId: number | null = null;

          if (isFilled(body.materialId)) {
            materialId = parseInt(body.materialId);
            if (isNaN(materialId) || materialId <= 0) {
              throw createError({ statusCode: 400, statusMessage: 'Некорректный ID материала' });
            }
          } else if (isFilled(body.material)) {
            const material = await tx.material.findUnique({ where: { name: body.material.trim() } });
            if (!material) {
              throw createError({ statusCode: 404, statusMessage: `Материал "${body.material}" не найден` });
            }
            materialId = material.id;
          }

          // Материал обязателен для создания поступления
          if (!materialId) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Для создания поступления материала нужно указать materialId или material',
            });
          }

          const createdReceipt = await tx.receiptMaterial.create({
            data: {
              receiptDate: body.receiptDate ? parseDate(body.receiptDate) : null,
              qualDate: body.qualDate ? parseDate(body.qualDate) : null,
              qualDocNumber: body.qualDocNumber || null,
              qualDocPath: fileDbPaths.qualDoc || null,
              note: body.receiptNote || null,
              materialId,
              authorEmail: editorEmail,
              createdAt: new Date(),
            },
          });

          receiptMaterialId = createdReceipt.id;

          auditEntries.push({
            entityType: 'ReceiptMaterial',
            entityId: createdReceipt.id,
            action: 'CREATE',
            note: `Создано поступление материала (акт № ${beforeSamplingTest.sActNumber})`,
            afterData: createdReceipt,
          });
        }

        // Привязываем поступление к акту (если оно было создано)
        if (receiptMaterialId) {
          relationUpdates.receiptMaterialId = receiptMaterialId;
        }
      }

      // ----- 3.3 Обновление TestProtocol -----
      // Определяем, есть ли РЕАЛЬНЫЕ данные для создания протокола
      const hasProtocolData =
        isFilled(body.testProtocolNumber) ||
        isFilled(body.testProtocolDate) ||
        isFilled(body.testResult) ||
        isFilled(body.protocolNote) ||
        !!fileDbPaths.protocolDoc;

      // Проверяем, есть ли изменения в существующем протоколе
      const hasProtocolChanges =
        isFilled(body.testProtocolNumber) ||
        isFilled(body.testProtocolDate) ||
        isFilled(body.testResult) ||
        isFilled(body.protocolNote) ||
        !!fileDbPaths.protocolDoc;

      let testProtocolId = beforeSamplingTest.testProtocolId;

      if (hasProtocolChanges) {
        // ==========================================
        // ЕСЛИ У АКТА УЖЕ ЕСТЬ ПРОТОКОЛ — ОБНОВЛЯЕМ
        // ==========================================
        if (testProtocolId) {
          const protocolUpdateData: any = {};

          if (body.testProtocolNumber !== undefined) {
            protocolUpdateData.protocolNumber = body.testProtocolNumber?.trim() || null;
          }
          if (body.testProtocolDate !== undefined) {
            protocolUpdateData.protocolDate = body.testProtocolDate ? parseDate(body.testProtocolDate) : null;
          }
          if (body.testResult !== undefined) {
            protocolUpdateData.testResult = body.testResult || null;
          }
          if (body.protocolNote !== undefined) {
            protocolUpdateData.note = body.protocolNote || null;
          }
          if (fileDbPaths.protocolDoc) {
            protocolUpdateData.protocolDocPath = fileDbPaths.protocolDoc;
          }

          if (Object.keys(protocolUpdateData).length > 0) {
            protocolUpdateData.editorEmail = editorEmail;
            protocolUpdateData.editedAt = new Date();

            const updatedProtocol = await tx.testProtocol.update({
              where: { id: testProtocolId },
              data: protocolUpdateData,
            });

            const changedFields = computeChangedFields(beforeTestProtocol as any, updatedProtocol as any);
            if (changedFields.length > 0) {
              auditEntries.push({
                entityType: 'TestProtocol',
                entityId: testProtocolId,
                action: 'UPDATE',
                note: `Изменён протокол испытаний. Поля: ${changedFields.join(', ')}`,
                beforeData: beforeTestProtocol,
                afterData: updatedProtocol,
                changedFields,
              });
            }
          }
        }
        // ==========================================
        // ЕСЛИ У АКТА НЕТ ПРОТОКОЛА — СОЗДАЁМ НОВЫЙ
        // НО ТОЛЬКО ЕСЛИ ЕСТЬ РЕАЛЬНЫЕ ДАННЫЕ
        // ==========================================
        else if (hasProtocolData) {
          // Для создания протокола нужно поступление материала
          if (!receiptMaterialId) {
            throw createError({
              statusCode: 400,
              statusMessage: 'Для создания протокола необходимо сначала создать поступление материала',
            });
          }

          const createdProtocol = await tx.testProtocol.create({
            data: {
              protocolNumber: body.protocolNumber?.trim() || `Без номера-${Date.now()}`,
              protocolDate: body.protocolDate ? parseDate(body.protocolDate) : null,
              protocolDocPath: fileDbPaths.protocolDoc || null,
              testResult: body.testResult || 'Не указан',
              note: body.protocolNote || null,
              receiptMaterialId,
              authorEmail: editorEmail,
              createdAt: new Date(),
            },
          });

          testProtocolId = createdProtocol.id;

          auditEntries.push({
            entityType: 'TestProtocol',
            entityId: createdProtocol.id,
            action: 'CREATE',
            note: `Создан протокол № ${createdProtocol.protocolNumber} (акт № ${beforeSamplingTest.sActNumber})`,
            afterData: createdProtocol,
          });
        }

        // Привязываем протокол к акту (если он был создан)
        if (testProtocolId) {
          relationUpdates.testProtocolId = testProtocolId;
        }
      }

      // ----- 3.4 Обновление самой SamplingTest -----
      if (body.sDate) {
        updateSamplingTestData.sActDate = parseDate(body.sDate);
      }
      if (body.sNote !== undefined) {
        updateSamplingTestData.note = body.sNote || null;
      }
      if (fileDbPaths.sDoc) {
        updateSamplingTestData.sDocPath = fileDbPaths.sDoc;
      }

      const finalData = {
        ...updateSamplingTestData,
        ...relationUpdates,
        editorEmail,
        editedAt: new Date(),
      };
      // console.log('finalData =======> ', finalData)

      const updatedSamplingTest = await tx.samplingTest.update({
        where: { id },
        data: finalData,
      });

      // ----- 3.5 Логирование изменений SamplingTest -----
      const samplingChangedFields = computeChangedFields(
        beforeSamplingTest as any,
        updatedSamplingTest as any
      );

      if (samplingChangedFields.length > 0) {
        auditEntries.push({
          entityType: 'SamplingTest',
          entityId: id,
          action: 'UPDATE',
          note: `Изменён акт отбора. Поля: ${samplingChangedFields.join(', ')}`,
          beforeData: beforeSamplingTest,
          afterData: updatedSamplingTest,
          changedFields: samplingChangedFields,
        });
      }

      // ----- 3.6 Запись всех audit-логов внутри транзакции -----
      for (const entry of auditEntries) {
        // console.log('Запись в журнал ==>')
        await tx.auditLog.create({
          data: {
            entityType: entry.entityType,
            entityId: entry.entityId,
            action: entry.action,
            actorEmail: editorEmail,
            note: entry.note,
            beforeData: entry.beforeData ?? undefined,
            afterData: entry.afterData ?? undefined,
            changedFields: entry.changedFields ?? undefined,
            ipAddress: requestMeta.ipAddress ?? null,
            userAgent: requestMeta.userAgent ?? null,
          },
        });
      }

      // ----- Возвращаем результат транзакции -----
      return {
        updatedSamplingTest,
        samplingChangedFields,
        auditEntries,
      };
    }, {
      // Таймаут транзакции — 30 секунд (на случай больших обновлений)
      timeout: 30000,
    });

    // ========================================
    // 4. ОТВЕТ
    // ========================================
    return {
      success: true,
      data: result.updatedSamplingTest,
      message: 'Акт отбора успешно обновлён',
      meta: {
        changedFields: result.samplingChangedFields,
        auditEntriesCount: result.auditEntries.length,
        auditEntries: result.auditEntries.map(e => ({
          entityType: e.entityType,
          action: e.action,
          note: e.note,
        })),
      },
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