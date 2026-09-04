// server/api/sampling-tests/[id].put.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParams, readMultipartFormData } from 'h3';
import { handleFileUpload, parseDate } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const { id } = getRouterParams(event);
    const idNum = Number(id);

    if (Number.isNaN(idNum) || idNum <= 0) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Неверный ID записи',
      });
    }

    // ========================================
    // 1. ПРОВЕРКА СУЩЕСТВОВАНИЯ ЗАПИСИ
    // ========================================
    const existingRecord = await prisma.samplingTest.findUnique({
      where: { id: idNum },
      include: {
        plp: true,
        inspector: true,
        testLocation: {
          include: {
            testObject: true,
          },
        },
        receiptMaterial: {
          include: {
            material: {
              include: {
                manufacturer: true,
              },
            },
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

    if (!existingRecord) {
      throw createError({
        statusCode: 404,
        statusMessage: `Запись с ID ${id} не найдена`,
      });
    }

    // ========================================
    // 2. ОБРАБОТКА МУЛЬТИПАРТ ДАННЫХ
    // ========================================
    const multipartData = await readMultipartFormData(event);

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Форма не содержит данных',
      });
    }

    console.log('multipartData ===> ', multipartData)

    const { body, fileDbPaths } = await handleFileUpload(multipartData);

    const editorEmail = body.editorEmail || existingRecord.editorEmail || 'system@user';
    const authorEmail = body.authorEmail || existingRecord.authorEmail || editorEmail;

    // ========================================
    // 3. ПРОВЕРКА НАЛИЧИЯ ДАННЫХ
    // ========================================
    const hasProtocolData = body.testProtocolNumber?.trim() || 
                           body.testResult?.trim() || 
                           body.protocolDate ||
                           fileDbPaths.protocolDoc;

    const hasReceiptData = body.material?.trim() || 
                          body.qualDocNumber?.trim() || 
                          body.qualDocDate ||
                          fileDbPaths.qualDoc;

    // ========================================
    // 4. ВЫПОЛНЕНИЕ ОБНОВЛЕНИЯ
    // ========================================
    const result = await prisma.$transaction(async (tx) => {
      // ========================================
      // 4.1 ОБНОВЛЕНИЕ СПРАВОЧНИКОВ
      // ========================================

      // 4.1.1 ПЛП
      let plpId = existingRecord.plpId;
      if (body.plp?.trim()) {
        const plpName = body.plp.trim();
        const plp = await tx.plp.findUnique({
          where: { name: plpName },
        });
        if (!plp) {
          throw createError({
            statusCode: 400,
            statusMessage: `ПЛП "${plpName}" не найден в справочнике`,
          });
        }
        plpId = plp.id;
      }

      // 4.1.2 Инспектор
      let inspectorId = existingRecord.inspectorId;
      if (body.sPerson?.trim()) {
        const inspectorName = body.sPerson.trim();
        const inspector = await tx.inspector.findUnique({
          where: { name: inspectorName },
        });
        if (!inspector) {
          throw createError({
            statusCode: 400,
            statusMessage: `Инспектор "${inspectorName}" не найден в справочнике`,
          });
        }
        inspectorId = inspector.id;
      }

      // 4.1.3 Объект испытаний и Место отбора
      let testLocationId = existingRecord.testLocationId;
      
      if (body.objName?.trim() || body.sPlace?.trim()) {
        const objectName = body.objName?.trim() || existingRecord.testLocation?.testObject?.name || 'Неизвестный объект';
        const testObject = await tx.testObject.findUnique({
          where: { name: objectName },
        });
        if (!testObject) {
          throw createError({
            statusCode: 400,
            statusMessage: `Объект "${objectName}" не найден в справочнике`,
          });
        }

        const locationName = body.sPlace?.trim() || existingRecord.testLocation?.name || 'Неизвестное место';
        let testLocation = await tx.testLocation.findUnique({
          where: {
            testObjectId_name: {
              testObjectId: testObject.id,
              name: locationName,
            },
          },
        });

        if (!testLocation) {
          testLocation = await tx.testLocation.create({
            data: {
              name: locationName,
              testObjectId: testObject.id,
              note: `Создано при обновлении записи`,
              authorEmail,
              createdAt: new Date(),
            },
          });
        }
        testLocationId = testLocation.id;
      }

      // ========================================
      // 4.2 ОБНОВЛЕНИЕ ПРОИЗВОДИТЕЛЯ (НОВОЕ!)
      // ========================================
      let manufacturerId: number | null = null;
      
      if (body.manufacturer?.trim()) {
        const manufacturerName = body.manufacturer.trim();
        
        // Ищем производителя в справочнике
        let manufacturer = await tx.manufacturer.findUnique({
          where: { name: manufacturerName },
        });
        
        if (!manufacturer) {
          // Если производитель не найден, создаем новый
          manufacturer = await tx.manufacturer.create({
            data: {
              name: manufacturerName,
              note: `Создан при редактировании записи ${idNum}`,
              authorEmail: authorEmail,
              createdAt: new Date(),
            },
          });
        }
        manufacturerId = manufacturer.id;
      }

      // ========================================
      // 4.3 ОБНОВЛЕНИЕ ПОСТУПЛЕНИЯ МАТЕРИАЛА
      // ========================================
      let receiptMaterialId = existingRecord.receiptMaterial?.id || 
                              existingRecord.testProtocol?.receiptMaterial?.id || 
                              null;

      if (hasReceiptData) {
        const materialName = body.material?.trim();
        let material = null;
        
        if (materialName) {
          material = await tx.material.findUnique({
            where: { name: materialName },
          });
          
          // Если материал не найден, создаем новый с производителем
          if (!material) {
            material = await tx.material.create({
              data: {
                name: materialName,
                manufacturerId: manufacturerId,
                note: `Создан при редактировании записи ${idNum}`,
                authorEmail: authorEmail,
                createdAt: new Date(),
              },
            });
          } else {
            // Если материал найден, обновляем у него производителя
            if (manufacturerId !== null && material.manufacturerId !== manufacturerId) {
              await tx.material.update({
                where: { id: material.id },
                data: {
                  manufacturerId: manufacturerId,
                  editorEmail: editorEmail,
                  editedAt: new Date(),
                },
              });
            }
          }
        } else {
          // Если материал не указан, используем существующий
          const existingMaterial = existingRecord.receiptMaterial?.material || 
                                   existingRecord.testProtocol?.receiptMaterial?.material;
          if (existingMaterial) {
            material = existingMaterial;
          } else {
            // Создаем дефолтный материал
            const defaultMaterial = await tx.material.findUnique({
              where: { name: 'Неизвестный материал' },
            });
            if (defaultMaterial) {
              material = defaultMaterial;
            } else {
              material = await tx.material.create({
                data: {
                  name: 'Неизвестный материал',
                  manufacturerId: manufacturerId,
                  note: 'Создан автоматически',
                  authorEmail: authorEmail,
                  createdAt: new Date(),
                },
              });
            }
          }
        }

        const qualDocPath = fileDbPaths.qualDoc || body.qualDocPath || null;

        if (receiptMaterialId) {
          // Обновляем существующее поступление
          await tx.receiptMaterial.update({
            where: { id: receiptMaterialId },
            data: {
              qualDate: parseDate(body.qualDocDate) || undefined,
              qualDocNumber: body.qualDocNumber || undefined,
              qualDocPath: qualDocPath || undefined,
              materialId: material.id,
              editorEmail: editorEmail,
              editedAt: new Date(),
            },
          });
        } else {
          // Создаем новое поступление
          const newReceipt = await tx.receiptMaterial.create({
            data: {
              qualDate: parseDate(body.qualDocDate),
              qualDocNumber: body.qualDocNumber || '',
              qualDocPath: qualDocPath,
              materialId: material.id,
              authorEmail: authorEmail,
              createdAt: new Date(),
              editorEmail: editorEmail,
              editedAt: new Date(),
            },
          });
          receiptMaterialId = newReceipt.id;
        }
      }

      // ========================================
      // 4.4 ОБНОВЛЕНИЕ ПРОТОКОЛА ИСПЫТАНИЙ
      // ========================================
      let testProtocolId = existingRecord.testProtocolId;

      if (hasProtocolData && receiptMaterialId) {
        const protocolDocPath = fileDbPaths.protocolDoc || body.protocolDocPath || null;

        if (testProtocolId) {
          await tx.testProtocol.update({
            where: { id: testProtocolId },
            data: {
              protocolNumber: body.testProtocolNumber || undefined,
              protocolDate: parseDate(body.protocolDate) || undefined,
              protocolDocPath: protocolDocPath || undefined,
              testResult: body.testResult || undefined,
              note: body.protocolNote || undefined,
              receiptMaterialId: receiptMaterialId,
              editorEmail: editorEmail,
              editedAt: new Date(),
            },
          });
        } else if (receiptMaterialId) {
          const newProtocol = await tx.testProtocol.create({
            data: {
              protocolNumber: body.testProtocolNumber || `Без номера-${Date.now()}`,
              protocolDate: parseDate(body.protocolDate),
              protocolDocPath: protocolDocPath,
              testResult: body.testResult || 'Не указан',
              note: body.protocolNote || null,
              receiptMaterialId: receiptMaterialId,
              authorEmail: authorEmail,
              createdAt: new Date(),
              editorEmail: editorEmail,
              editedAt: new Date(),
            },
          });
          testProtocolId = newProtocol.id;
        }
      }

      // ========================================
      // 4.5 ОБНОВЛЕНИЕ ГЛАВНОЙ ЗАПИСИ (АКТ ОТБОРА)
      // ========================================
      const sDocPath = fileDbPaths.sDoc || body.sDocPath || existingRecord.sDocPath;

      const updatedSamplingTest = await tx.samplingTest.update({
        where: { id: idNum },
        data: {
          sActNumber: body.actNumber || existingRecord.sActNumber,
          sActDate: parseDate(body.sDate) || existingRecord.sActDate,
          sDocPath: sDocPath,
          note: body.sNote || existingRecord.note,
          plpId: plpId,
          inspectorId: inspectorId,
          testLocationId: testLocationId,
          testProtocolId: testProtocolId,
          receiptMaterialId: receiptMaterialId,
          editorEmail: editorEmail,
          editedAt: new Date(),
        },
      });

      // ========================================
      // 4.6 ВОЗВРАЩАЕМ ОБНОВЛЕННУЮ ЗАПИСЬ
      // ========================================
      return await tx.samplingTest.findUnique({
        where: { id: updatedSamplingTest.id },
        include: {
          plp: true,
          inspector: true,
          testLocation: {
            include: {
              testObject: true,
            },
          },
          receiptMaterial: {
            include: {
              material: {
                include: {
                  manufacturer: true,
                },
              },
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
    }, {
      timeout: 30000,
    });

    return {
      success: true,
      message: `Запись с ID ${id} успешно обновлена`,
      data: result,
    };

  } catch (error: any) {
    console.error('❌ Ошибка при обновлении записи:', error);
    
    if (error.statusCode) throw error;

    throw createError({
      statusCode: 500,
      statusMessage: error.message || 'Ошибка при обновлении записи',
    });
  }
});