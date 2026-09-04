// server/api/sampling-tests/index.post.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const multipartData = await readMultipartFormData(event);

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Данные не найдены',
      });
    }

    // Используем универсальный обработчик файлов
    const { body, fileDbPaths } = await handleFileUpload(multipartData);

    // Получаем email автора (из сессии или из формы)
    const authorEmail = body.authorEmail || 'system@user';
    const editorEmail = body.editorEmail || authorEmail;

    // Проверяем, есть ли данные для создания протокола
    const hasProtocolData = body.testProtocolNumber?.trim() || 
                          body.testResult?.trim() || 
                          body.protocolDate ||
                          fileDbPaths.protocolDoc;

    // Проверяем, есть ли данные для создания поступления
    const hasReceiptData = body.material?.trim() || 
                          body.qualDocNumber?.trim() || 
                          body.qualDocDate ||
                          fileDbPaths.qualDoc;

    // Выполняем все операции в одной транзакции
    const result = await prisma.$transaction(async (tx) => {
      // ========================================
      // 1. ПОЛУЧАЕМ ИДЕНТИФИКАТОРЫ ИЗ СПРАВОЧНИКОВ
      // ========================================

      // 1.1 ПЛП - получаем по имени
      const plpName = body.plp?.trim() || 'Не указан';
      let plp = await tx.plp.findUnique({
        where: { name: plpName },
      });
      
      // Если ПЛП не найден, но это обязательное поле, возвращаем ошибку
      if (!plp) {
        throw createError({
          statusCode: 400,
          statusMessage: `ПЛП "${plpName}" не найден в справочнике`,
        });
      }

      // 1.2 Инспектор - получаем по имени
      const inspectorName = body.sPerson?.trim() || 'Не указан';
      let inspector = await tx.inspector.findUnique({
        where: { name: inspectorName },
      });
      
      if (!inspector) {
        throw createError({
          statusCode: 400,
          statusMessage: `Инспектор "${inspectorName}" не найден в справочнике`,
        });
      }

      // 1.3 Объект испытаний - получаем по имени
      const objectName = body.objName?.trim() || 'Неизвестный объект';
      let testObject = await tx.testObject.findUnique({
        where: { name: objectName },
      });
      
      if (!testObject) {
        throw createError({
          statusCode: 400,
          statusMessage: `Объект "${objectName}" не найден в справочнике`,
        });
      }

      // ========================================
      // 2. СОЗДАЕМ/ПОЛУЧАЕМ МЕСТО ОТБОРА
      // ========================================
      const locationName = body.sPlace?.trim() || 'Неизвестное место';
      
      let testLocation = await tx.testLocation.findUnique({
        where: {
          testObjectId_name: {
            testObjectId: testObject.id,
            name: locationName,
          },
        },
      });

      if (!testLocation) {
        // Создаем новое место отбора
        testLocation = await tx.testLocation.create({
          data: {
            name: locationName,
            testObjectId: testObject.id,
            note: `Создано при добавлении записи ${body.actNumber}`,
            authorEmail,
            createdAt: new Date(),
          },
        });
      }

      // ========================================
      // 3. СОЗДАЕМ ПОСТУПЛЕНИЕ МАТЕРИАЛА (ЕСЛИ ЕСТЬ ДАННЫЕ)
      // ========================================
      let receiptMaterial = null;
      let receiptMaterialId: number | null = null;

      if (hasReceiptData) {
        // 3.1 Получаем производителя (если указан)
        let manufacturer = null;
        if (body.manufacturer?.trim()) {
          manufacturer = await tx.manufacturer.findUnique({
            where: { name: body.manufacturer.trim() },
          });
          // Если производитель не найден, не блокируем создание
        }

        // 3.2 Получаем материал
        const materialName = body.material?.trim();
        let material = null;
        
        if (materialName) {
          material = await tx.material.findUnique({
            where: { name: materialName },
          });
          
          if (!material) {
            throw createError({
              statusCode: 400,
              statusMessage: `Материал "${materialName}" не найден в справочнике`,
            });
          }
        } else {
          // Если материал не указан, но есть другие данные по поступлению
          // создаем запись с "Неизвестным материалом"
          const defaultMaterial = await tx.material.findUnique({
            where: { name: 'Неизвестный материал' },
          });
          
          if (defaultMaterial) {
            material = defaultMaterial;
          } else {
            // Создаем дефолтный материал, если его нет
            material = await tx.material.create({
              data: {
                name: 'Неизвестный материал',
                note: 'Создан автоматически для незаполненных поступлений',
                authorEmail,
                createdAt: new Date(),
              },
            });
          }
        }

        // 3.3 Создаем поступление
        const qualDocPath = fileDbPaths.qualDoc || body.qualDocPath || null;
        
        receiptMaterial = await tx.receiptMaterial.create({
          data: {
            qualDate: parseDate(body.qualDocDate),
            qualDocNumber: body.qualDocNumber || '',
            qualDocPath: qualDocPath,
            materialId: material.id,
            authorEmail,
            createdAt: new Date(),
          },
        });
        
        receiptMaterialId = receiptMaterial.id;
      }

      // ========================================
      // 4. СОЗДАЕМ ПРОТОКОЛ ИСПЫТАНИЙ (ЕСЛИ ЕСТЬ ДАННЫЕ)
      // ========================================
      let testProtocol = null;
      let testProtocolId: number | null = null;

      if (hasProtocolData && receiptMaterialId) {
        // Протокол может быть создан только если есть поступление
        const protocolDocPath = fileDbPaths.protocolDoc || body.protocolDocPath || null;
        
        testProtocol = await tx.testProtocol.create({
          data: {
            protocolNumber: body.testProtocolNumber || `Без номера-${Date.now()}`,
            protocolDate: parseDate(body.protocolDate),
            protocolDocPath: protocolDocPath,
            testResult: body.testResult || 'Не указан',
            note: body.protocolNote || null,
            receiptMaterialId: receiptMaterialId,
            authorEmail,
            createdAt: new Date(),
            editorEmail: editorEmail,
            editedAt: new Date(),
          },
        });
        
        testProtocolId = testProtocol.id;
      } else if (hasProtocolData && !receiptMaterialId) {
        // Если есть данные протокола, но нет поступления - создаем протокол без поступления?
        // В текущей схеме это невозможно, так как receiptMaterialId обязателен
        // Можно создать "пустое" поступление
        const defaultMaterial = await tx.material.findUnique({
          where: { name: 'Неизвестный материал' },
        });

        if (defaultMaterial) {
          // Создаем "пустое" поступление
          const emptyReceipt = await tx.receiptMaterial.create({
            data: {
              qualDate: null,
              qualDocNumber: '',
              qualDocPath: null,
              materialId: defaultMaterial.id,
              authorEmail,
              createdAt: new Date(),
            },
          });

          // Создаем протокол с этим поступлением
          const protocolDocPath = fileDbPaths.protocolDoc || body.protocolDocPath || null;
          
          testProtocol = await tx.testProtocol.create({
            data: {
              protocolNumber: body.testProtocolNumber || `Без номера-${Date.now()}`,
              protocolDate: parseDate(body.protocolDate),
              protocolDocPath: protocolDocPath,
              testResult: body.testResult || 'Не указан',
              note: body.protocolNote || null,
              receiptMaterialId: emptyReceipt.id,
              authorEmail,
              createdAt: new Date(),
              editorEmail: editorEmail,
              editedAt: new Date(),
            },
          });
          
          testProtocolId = testProtocol.id;
        }
      }

      // ========================================
      // 5. СОЗДАЕМ ГЛАВНУЮ ЗАПИСЬ - АКТ ОТБОРА ПРОБ
      // ========================================
      const sDocPath = fileDbPaths.sDoc || body.sDocPath || null;
      
      const samplingTest = await tx.samplingTest.create({
        data: {
          sActNumber: body.actNumber || `Без номера-${Date.now()}`,
          sActDate: parseDate(body.sDate) || new Date(),
          sDocPath: sDocPath,
          note: body.sNote || null,
          plpId: plp.id,
          inspectorId: inspector.id,
          testLocationId: testLocation.id,
          // testProtocolId может быть null, если протокол не создан
          testProtocolId: testProtocolId,
          authorEmail,
          createdAt: new Date(),
          editorEmail: editorEmail,
          editedAt: new Date(),
        },
      });

      // ========================================
      // 6. ВОЗВРАЩАЕМ СОЗДАННУЮ ЗАПИСЬ СО ВСЕМИ СВЯЗЯМИ
      // ========================================
      return await tx.samplingTest.findUnique({
        where: { id: samplingTest.id },
        include: {
          plp: true,
          inspector: true,
          testLocation: {
            include: {
              testObject: true,
            },
          },
          testProtocol: {
            include: {
              receiptMaterial: {
                include: {
                  material: {
                    include: {
                      manufacturer: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    });

    return {
      success: true,
      data: result,
      message: 'Запись успешно создана',
    };

  } catch (error: any) {
    console.error('Server Error:', error);
    
    if (error.statusCode) throw error;

    throw createError({
      statusCode: 500,
      statusMessage: `Internal Server Error: ${error.message || 'Ошибка сервера'}`,
    });
  }
});