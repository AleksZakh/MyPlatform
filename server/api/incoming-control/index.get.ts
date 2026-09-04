// server/api/sampling-tests/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const pageSize = parseInt(query.pageSize as string) || 25;
        const search = (query.search as string) || '';

        const validPage = Math.max(1, page);
        const validPageSize = Math.min(100, Math.max(1, pageSize));
        const skip = (validPage - 1) * validPageSize;

        // Фильтрация
        const where: any = {};

        if (search) {
            where.OR = [
                { sActNumber: { contains: search, mode: 'insensitive' } },
                { note: { contains: search, mode: 'insensitive' } },
                { plp: { name: { contains: search, mode: 'insensitive' } } },
                { inspector: { name: { contains: search, mode: 'insensitive' } } },
                { testLocation: { name: { contains: search, mode: 'insensitive' } } },
                { testLocation: { testObject: { name: { contains: search, mode: 'insensitive' } } } },
                { 
                    receiptMaterial: {
                        material: {
                            name: { contains: search, mode: 'insensitive' }
                        }
                    }
                },
                { 
                    receiptMaterial: {
                        material: {
                            manufacturer: {
                                name: { contains: search, mode: 'insensitive' }
                            }
                        }
                    }
                },
                { 
                    testProtocol: {
                        protocolNumber: { contains: search, mode: 'insensitive' }
                    }
                }
            ];
        }

        const [samplingTests, totalCount] = await Promise.all([
            prisma.samplingTest.findMany({
                where,
                include: {
                    plp: true,
                    inspector: true,
                    testLocation: {
                        include: {
                            testObject: true
                        }
                    },
                    receiptMaterial: {  // ← ДОБАВЛЕНА ПРЯМАЯ СВЯЗЬ
                        include: {
                            material: {
                                include: {
                                    manufacturer: true  // ← ДОБАВЛЕНО!
                                }
                            }
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
                    }
                },
                skip: skip,
                take: validPageSize,
                orderBy: {
                    sActDate: 'desc'
                }
            }),
            prisma.samplingTest.count({ where })
        ]);

        const transformedData = samplingTests.map((test) => {
            // Приоритет у прямой связи receiptMaterial
            const receipt = test.receiptMaterial || test.testProtocol?.receiptMaterial;
            const material = receipt?.material;
            const manufacturer = material?.manufacturer;
            const protocol = test.testProtocol;
            const location = test.testLocation;
            const object = location?.testObject;

            return {
                'ID': test.id || '',
                'ПЛП': test.plp?.name || '',
                'Наименование объекта': object?.name || '',
                'Место отбора проб': location?.name || '',
                'Номер акта отбора проб': test.sActNumber || '',
                'Дата отбора проб': test.sActDate
                    ? new Date(test.sActDate).toLocaleDateString('ru-RU')
                    : '',
                'Документ отбора проб': test.sDocPath || '',
                'Лицо, предоставившее пробу': test.inspector?.name || '',
                'Примечание (акт)': test.note || '',
                'Наименование материала': material?.name || '',
                'Предприятие-изготовитель': manufacturer?.name || '',  // ← ТЕПЕРЬ ЗАПОЛНЯЕТСЯ!
                'Дата поступления материала': receipt?.qualDate
                    ? new Date(receipt.qualDate).toLocaleDateString('ru-RU')
                    : '',
                'Документ о качестве': receipt?.qualDocPath || '',
                'Номер документа о качестве': receipt?.qualDocNumber || '',
                'Номер протокола': protocol?.protocolNumber || '',
                'Дата протокола': protocol?.protocolDate
                    ? new Date(protocol.protocolDate).toLocaleDateString('ru-RU')
                    : '',
                'Документ протокола': protocol?.protocolDocPath || '',
                'Результат испытаний': protocol?.testResult || '',
                'Примечание (протокол)': protocol?.note || '',
            };
        });

        return {
            success: true,
            data: transformedData,
            pagination: {
                currentPage: validPage,
                pageSize: validPageSize,
                totalCount: totalCount,
                totalPages: Math.ceil(totalCount / validPageSize),
                hasNext: validPage < Math.ceil(totalCount / validPageSize),
                hasPrev: validPage > 1,
            }
        };

    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Ошибка при получении данных',
        };
    }
});