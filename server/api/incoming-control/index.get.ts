// server/api/incoming-control/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

// МАППИНГ ПОЛЕЙ ДЛЯ СОРТИРОВКИ
const sortFieldMap: Record<string, string> = {
  'ПЛП': 'plp',
  'Наименование объект': 'objectName',
  'Номер акта отбора проб': 'samplingActNumber',
  'Дата отбора проб': 'samplingDate',
  'Место отбора проб': 'samplingPlace',
  'Лицо, предоставившее пробу': 'personProvidedSample',
  'Дата поступления материала': 'materialReceiptDate',
  'Наименование материала': 'materialName',
  'Документ о качестве': 'qualityDocument',
  'Предприятие-изготовитель': 'manufacturer',
  'Номер протокола': 'protocolNumber',
  'Дата протокола': 'protocolDate',
  'Результат испытаний': 'testResult',
  'Примечание': 'note'
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event)
    console.log('📥 Получены параметры:', JSON.stringify(query, null, 2))
    
    // ======= ОСНОВНЫЕ ПАРАМЕТРЫ =======
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 25
    const sortKey = (query.sortBy as string) || 'Дата отбора проб'
    const sortOrder = (query.sortOrder as string)?.toLowerCase() || 'desc'

    const validPage = Math.max(1, page)
    const validPageSize = Math.min(100, Math.max(1, pageSize))
    const skip = (validPage - 1) * validPageSize

    // ======= ПОСТРОЕНИЕ WHERE ДЛЯ ФИЛЬТРАЦИИ =======
    const where: any = {}
    
    // 1. Текстовые поля (поиск по частичному совпадению - contains)
    if (query.plp) {
      where.plp = { contains: query.plp as string, mode: 'insensitive' }
    }
    
    if (query.objectName) {
      where.objectName = { contains: query.objectName as string, mode: 'insensitive' }
    }
    
    if (query.samplingActNumber) {
      where.samplingActNumber = { contains: query.samplingActNumber as string, mode: 'insensitive' }
    }
    
    if (query.samplingPlace) {
      where.samplingPlace = { contains: query.samplingPlace as string, mode: 'insensitive' }
    }
    
    if (query.personProvidedSample) {
      where.personProvidedSample = { contains: query.personProvidedSample as string, mode: 'insensitive' }
    }
    
    if (query.materialName) {
      where.materialName = { contains: query.materialName as string, mode: 'insensitive' }
    }
    
    if (query.qualityDocument) {
      where.qualityDocument = { contains: query.qualityDocument as string, mode: 'insensitive' }
    }
    
    if (query.manufacturer) {
      where.manufacturer = { contains: query.manufacturer as string, mode: 'insensitive' }
    }
    
    if (query.protocolNumber) {
      where.protocolNumber = { contains: query.protocolNumber as string, mode: 'insensitive' }
    }
    
    if (query.note) {
      where.note = { contains: query.note as string, mode: 'insensitive' }
    }
    
    // 2. Точное совпадение (выпадающий список)
    if (query.testResult) {
      where.testResult = query.testResult as string
    }
    
    // 3. Диапазоны дат
    if (query.samplingDateFrom) {
      where.samplingDate = {
        ...where.samplingDate,
        gte: new Date(query.samplingDateFrom as string)
      }
    }
    
    if (query.samplingDateTo) {
      where.samplingDate = {
        ...where.samplingDate,
        lte: new Date(query.samplingDateTo as string)
      }
    }
    
    if (query.materialReceiptDateFrom) {
      where.materialReceiptDate = {
        ...where.materialReceiptDate,
        gte: new Date(query.materialReceiptDateFrom as string)
      }
    }
    
    if (query.materialReceiptDateTo) {
      where.materialReceiptDate = {
        ...where.materialReceiptDate,
        lte: new Date(query.materialReceiptDateTo as string)
      }
    }
    
    if (query.protocolDateFrom) {
      where.protocolDate = {
        ...where.protocolDate,
        gte: new Date(query.protocolDateFrom as string)
      }
    }
    
    if (query.protocolDateTo) {
      where.protocolDate = {
        ...where.protocolDate,
        lte: new Date(query.protocolDateTo as string)
      }
    }

    console.log('🔍 WHERE условие:', JSON.stringify(where, null, 2))

    // ======= СОРТИРОВКА =======
    const dbField = sortFieldMap[sortKey] || 'id'
    const orderBy: Record<string, string> = {}
    orderBy[dbField] = sortOrder
    console.log(`📊 Сортировка: ${sortKey} → ${dbField} ${sortOrder}`)

    // 👇 ДВА ЗАПРОСА: общее количество и отфильтрованное
    const [data, filteredCount, totalCount] = await Promise.all([
      prisma.aEng.findMany({
        where: where,
        skip: skip,
        take: validPageSize,
        orderBy: orderBy,
      }),
      prisma.aEng.count({
        where: where,  // 👈 Отфильтрованные
      }),
      prisma.aEng.count(),  // 👈 Все записи в БД
    ])

    console.log(`✅ Найдено ${data.length} записей из ${totalCount}`)

    // ======= ТРАНСФОРМАЦИЯ ДАННЫХ =======
    const transformedData = data.map(item => ({
      'ПЛП': item.plp || '',
      'Наименование объект': item.objectName || '',
      'Номер акта отбора проб': item.samplingActNumber || '',
      'Дата отбора проб': item.samplingDate ? new Date(item.samplingDate).toLocaleDateString('ru-RU') : '',
      'Место отбора проб': item.samplingPlace || '',
      'Лицо, предоставившее пробу': item.personProvidedSample || '',
      'Дата поступления материала': item.materialReceiptDate ? new Date(item.materialReceiptDate).toLocaleDateString('ru-RU') : '',
      'Наименование материала': item.materialName || '',
      'Документ о качестве': item.qualityDocument || '',
      'Предприятие-изготовитель': item.manufacturer || '',
      'Номер протокола': item.protocolNumber || '',
      'Дата протокола': item.protocolDate ? new Date(item.protocolDate).toLocaleDateString('ru-RU') : '',
      'Результат испытаний': item.testResult || '',
      'Примечание': item.note || ''
    }))

    return {
      success: true,
      data: transformedData,
      pagination: {
        currentPage: validPage,
        pageSize: validPageSize,
        totalCount: totalCount,        // 👈 Общее количество в БД
        filteredCount: filteredCount,  // 👈 Количество после фильтрации
        totalPages: Math.ceil(filteredCount / validPageSize), // 👈 Страницы считаем от filteredCount
        hasNext: validPage < Math.ceil(filteredCount / validPageSize),
        hasPrev: validPage > 1,
      },
    }
  } catch (error) {
    console.error('❌ Ошибка при получении данных:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Ошибка при получении данных',
    }
  }
})