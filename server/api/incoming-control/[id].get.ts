// server/api/sampling-tests/[id].get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParam } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const idParam = getRouterParam(event, 'id');
    const id = parseInt(idParam || '', 10);
    
    if (isNaN(id)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Некорректный ID записи',
        });
    }
    
    try {
        const record = await prisma.samplingTest.findUnique({
            where: { id },
            include: {
                plp: true,
                inspector: true,
                testLocation: {
                    include: {
                        testObject: true
                    }
                },
                testProtocol: {
                    include: {
                        receiptMaterial: {
                            include: {
                                material: {
                                    include: {
                                        manufacturer: true  // ← ДОБАВЛЕНО!
                                    }
                                }
                            }
                        }
                    }
                },
                // ДОБАВЛЯЕМ ПРЯМУЮ СВЯЗЬ С ПОСТУПЛЕНИЕМ
                receiptMaterial: {
                    include: {
                        material: {
                            include: {
                                manufacturer: true  // ← ДОБАВЛЕНО!
                            }
                        }
                    }
                }
            }
        });
        
        if (!record) {
            throw createError({
                statusCode: 404,
                statusMessage: `Запись с ID ${id} не найдена`,
            });
        }

        // Получаем данные из связей (приоритет у receiptMaterial)
        const receipt = record.receiptMaterial || record.testProtocol?.receiptMaterial;
        const material = receipt?.material;
        const manufacturer = material?.manufacturer;
        const protocol = record.testProtocol;
        const location = record.testLocation;
        const object = location?.testObject;

        const transformedData = {
            'ID': record.id || '',
            'ПЛП': record.plp?.name || '',
            'Наименование объекта': object?.name || '',
            'Место отбора проб': location?.name || '',
            'Номер акта отбора проб': record.sActNumber || '',
            'Дата отбора проб': record.sActDate
                ? new Date(record.sActDate).toLocaleDateString('ru-RU')
                : '',
            'Документ отбора проб': record.sDocPath || '',
            'Лицо, предоставившее пробу': record.inspector?.name || '',
            'Примечание (акт)': record.note || '',
            
            // ======= ИНФОРМАЦИЯ О МАТЕРИАЛЕ =======
            'Наименование материала': material?.name || '',
            'Предприятие-изготовитель': manufacturer?.name || '',  // ← ТЕПЕРЬ ЗАПОЛНЯЕТСЯ!
            
            // ======= ИНФОРМАЦИЯ О ПОСТУПЛЕНИИ =======
            'Дата поступления материала': receipt?.qualDate
                ? new Date(receipt.qualDate).toLocaleDateString('ru-RU')
                : '',
            'Документ о качестве': receipt?.qualDocPath || '',
            'Номер документа о качестве': receipt?.qualDocNumber || '',
            
            // ======= ИНФОРМАЦИЯ О ПРОТОКОЛЕ =======
            'Номер протокола': protocol?.protocolNumber || '',
            'Дата протокола': protocol?.protocolDate
                ? new Date(protocol.protocolDate).toLocaleDateString('ru-RU')
                : '',
            'Документ протокола': protocol?.protocolDocPath || '',
            'Результат испытаний': protocol?.testResult || '',
            'Примечание (протокол)': protocol?.note || '',
            
            // ======= СИСТЕМНЫЕ ПОЛЯ =======
            'Автор (акт)': record.authorEmail || '',
            'Дата создания (акт)': record.createdAt
                ? new Date(record.createdAt).toLocaleString('ru-RU')
                : '',
            'Редактор (акт)': record.editorEmail || '',
            'Дата редактирования (акт)': record.editedAt
                ? new Date(record.editedAt).toLocaleString('ru-RU')
                : '',
        };

        return {
            success: true,
            data: transformedData
        };
        
    } catch (error: any) {
        if (error.statusCode) throw error;
        console.error('Ошибка при получении записи:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Ошибка при получении данных с сервера',
            data: error.message,
        });
    }
});