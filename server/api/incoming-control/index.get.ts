// server/api/lab/sampling-test/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery, getCookie } from 'h3';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    try {
        const query = getQuery(event);
        const page = parseInt(query.page as string) || 1;
        const pageSize = parseInt(query.pageSize as string) || 25;
        const sortKey = (query.sortKey as string) || 'sActDate';
        const sortOrder = (query.sortOrder as string) || 'desc';
        const rawCookie = getCookie(event, 'lab_reestrTable_filter')

        const validPage = Math.max(1, page);
        const validPageSize = Math.min(100, Math.max(1, pageSize));
        const skip = (validPage - 1) * validPageSize;

        // ============================================
        // ФОРМИРУЕМ УСЛОВИЯ ФИЛЬТРАЦИИ
        // ============================================
        const where: any = {};

        let cookieFilters = null

        // 2. Поскольку плагин сохраняет данные в куку как JSON-строку, нам нужно её распарсить
        if (rawCookie) {
            try {
            // Декодируем URI (на случай спецсимволов и кириллицы) и парсим в объект
            const parsedData = JSON.parse(decodeURIComponent(rawCookie))
            // console.log('--- СЕРВЕР ПРИНЯЛ КУКУ ---', rawCookie)
            
            // Обратите внимание: плагин pinia-plugin-persistedstate заворачивает стейт в объект.
            // Если в вашем сторе состояние называется `filter`, то в куке оно будет лежать как parsedData.filter
            if (parsedData && parsedData.filter) {
                cookieFilters = parsedData.filter
            }
            } catch (error) {
            console.error('Ошибка парсинга куки с фильтрами на сервере:', error)
            }
        }

        // Для отладки в консоли терминала (не браузера!):
        console.log('Полученные на сервере фильтры:', cookieFilters)
        

        // ---- Текстовые фильтры ----
        
        // ПЛП
        if (cookieFilters.plp) {
            where.plp = { name: { contains: cookieFilters.plp as string, mode: 'insensitive' as const } };
        }
        
        // Объект (Наименование объекта)
        if (cookieFilters.objName) {
            where.testLocation = { 
                testObject: { 
                    name: { contains: cookieFilters.objName as string, mode: 'insensitive' as const } 
                } 
            };
        }
        
        // Номер акта отбора проб
        if (cookieFilters.samplActNumber) {
            where.sActNumber = { contains: cookieFilters.samplActNumber as string, mode: 'insensitive' as const };
        }
        
        // Место отбора проб
        if (cookieFilters.sPlace) {
            where.testLocation = { 
                ...where.testLocation,
                name: { contains: cookieFilters.sPlace as string, mode: 'insensitive' as const } 
            };
        }
        
        // Лицо, предоставившее пробу (Инспектор)
        if (cookieFilters.sProvaider) {
            where.inspector = { name: { contains: cookieFilters.sProvaider as string, mode: 'insensitive' as const } };
        }
        
        // Наименование материала
        if (cookieFilters.materialName) {
            where.receiptMaterial = { 
                material: { 
                    name: { contains: cookieFilters.materialName as string, mode: 'insensitive' as const } 
                } 
            };
        }
        
        // Предприятие-изготовитель (Производитель)
        if (cookieFilters.manufacturer) {
            where.receiptMaterial = { 
                material: { 
                    manufacturer: { 
                        name: { contains: cookieFilters.manufacturer as string, mode: 'insensitive' as const } 
                    } 
                } 
            };
        }
        
        // Номер документа о качестве
        if (cookieFilters.qualiDocNumber) {
            where.receiptMaterial = { 
                ...where.receiptMaterial,
                qualDocNumber: { contains: cookieFilters.qualiDocNumber as string, mode: 'insensitive' as const } 
            };
        }
        
        // Результат испытаний
        if (cookieFilters.testResult) {
            where.testProtocol = { 
                testResult: { contains: cookieFilters.testResult as string, mode: 'insensitive' as const } 
            };
        }
        
        // Номер протокола
        if (cookieFilters.testProtocolNumber) {
            where.testProtocol = { 
                ...where.testProtocol,
                protocolNumber: { contains: cookieFilters.testProtocolNumber as string, mode: 'insensitive' as const } 
            };
        }

        // ---- Фильтры по датам ----
        
        // Дата отбора (начало)
        if (cookieFilters.sDateStart) {
            where.sActDate = { gte: new Date(cookieFilters.sDateStart as string) };
        }
        
        // Дата отбора (конец)
        if (cookieFilters.sDateEnd) {
            const endDate = new Date(cookieFilters.sDateEnd as string);
            endDate.setHours(23, 59, 59, 999);
            where.sActDate = { ...where.sActDate, lte: endDate };
        }
        
        // Дата поступления материала (начало)
        if (cookieFilters.receiveDateStart) {
            where.receiptMaterial = { 
                ...where.receiptMaterial,
                qualDate: { gte: new Date(cookieFilters.receiveDateStart as string) } 
            };
        }
        
        // Дата поступления материала (конец)
        if (cookieFilters.receiveDateEnd) {
            const endDate = new Date(cookieFilters.receiveDateEnd as string);
            endDate.setHours(23, 59, 59, 999);
            where.receiptMaterial = { 
                ...where.receiptMaterial,
                qualDate: { ...where.receiptMaterial?.qualDate, lte: endDate } 
            };
        }
        
        // Дата документа о качестве (начало)
        if (cookieFilters.qualiDateStart) {
            where.receiptMaterial = { 
                ...where.receiptMaterial,
                qualDate: { ...where.receiptMaterial?.qualDate, gte: new Date(cookieFilters.qualiDateStart as string) } 
            };
        }
        
        // Дата документа о качестве (конец)
        if (cookieFilters.qualiDateEnd) {
            const endDate = new Date(cookieFilters.qualiDateEnd as string);
            endDate.setHours(23, 59, 59, 999);
            where.receiptMaterial = { 
                ...where.receiptMaterial,
                qualDate: { ...where.receiptMaterial?.qualDate, lte: endDate } 
            };
        }
        
        // Дата протокола (начало)
        if (cookieFilters.testReportDataStart) {
            where.testProtocol = { 
                ...where.testProtocol,
                protocolDate: { gte: new Date(cookieFilters.testReportDataStart as string) } 
            };
        }
        
        // Дата протокола (конец)
        if (cookieFilters.testReportDataEnd) {
            const endDate = new Date(cookieFilters.testReportDataEnd as string);
            endDate.setHours(23, 59, 59, 999);
            where.testProtocol = { 
                ...where.testProtocol,
                protocolDate: { ...where.testProtocol?.protocolDate, lte: endDate } 
            };
        }

        // ---- Глобальный поиск (если есть) ----
        if (query.search) {
            const searchTerm = query.search as string;
            where.OR = [
                { sActNumber: { contains: searchTerm, mode: 'insensitive' as const } },
                { note: { contains: searchTerm, mode: 'insensitive' as const } },
                { plp: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
                { inspector: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
                { testLocation: { name: { contains: searchTerm, mode: 'insensitive' as const } } },
                { testLocation: { testObject: { name: { contains: searchTerm, mode: 'insensitive' as const } } } },
                { receiptMaterial: { material: { name: { contains: searchTerm, mode: 'insensitive' as const } } } },
                { receiptMaterial: { material: { manufacturer: { name: { contains: searchTerm, mode: 'insensitive' as const } } } } },
                { testProtocol: { protocolNumber: { contains: searchTerm, mode: 'insensitive' as const } } },
                { testProtocol: { testResult: { contains: searchTerm, mode: 'insensitive' as const } } },
            ];
        }

        // ============================================
        // СОРТИРОВКА
        // ============================================
        let orderBy: any = {};
        if (sortKey === 'plp') {
            orderBy = { plp: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
        } else if (sortKey === 'inspector') {
            orderBy = { inspector: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
        } else if (sortKey === 'object') {
            orderBy = { testLocation: { testObject: { name: sortOrder === 'asc' ? 'asc' : 'desc' } } };
        } else if (sortKey === 'location') {
            orderBy = { testLocation: { name: sortOrder === 'asc' ? 'asc' : 'desc' } };
        } else if (sortKey === 'material') {
            orderBy = { receiptMaterial: { material: { name: sortOrder === 'asc' ? 'asc' : 'desc' } } };
        } else if (sortKey === 'manufacturer') {
            orderBy = { receiptMaterial: { material: { manufacturer: { name: sortOrder === 'asc' ? 'asc' : 'desc' } } } };
        } else if (sortKey === 'sActDate') {
            orderBy = { sActDate: sortOrder === 'asc' ? 'asc' : 'desc' };
        } else {
            orderBy = { [sortKey]: sortOrder === 'asc' ? 'asc' : 'desc' };
        }

        // ============================================
        // ВЫПОЛНЯЕМ ЗАПРОС
        // ============================================
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
                    receiptMaterial: {
                        include: {
                            material: {
                                include: {
                                    manufacturer: true
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
                                            manufacturer: true
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                skip: skip,
                take: validPageSize,
                orderBy: orderBy
            }),
            prisma.samplingTest.count({ where })
        ]);

        // ============================================
        // ТРАНСФОРМАЦИЯ ДАННЫХ
        // ============================================
        const transformedData = samplingTests.map((test) => {
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
                'Предприятие-изготовитель': manufacturer?.name || '',
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