// server/api/incoming-control/index.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

// МАППИНГ ПОЛЕЙ
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
    
    const page = parseInt(query.page as string) || 1
    const pageSize = parseInt(query.pageSize as string) || 25
    
    // ✅ ИСПРАВЛЕНО: читаем sortBy (как приходит с фронтенда)
    const sortKey = (query.sortBy as string) || 'Дата отбора проб'
    const sortOrder = (query.sortOrder as string)?.toLowerCase() || 'desc'

    console.log(`🔍 page: ${page}, pageSize: ${pageSize}`)
    console.log(`🔍 sortKey: "${sortKey}"`)
    console.log(`🔍 sortOrder: "${sortOrder}"`)

    const validPage = Math.max(1, page)
    const validPageSize = Math.min(100, Math.max(1, pageSize))
    const skip = (validPage - 1) * validPageSize

    // МАППИНГ ПОЛЯ ДЛЯ СОРТИРОВКИ
    const dbField = sortFieldMap[sortKey] || 'id'
    console.log(`📊 Маппинг: "${sortKey}" → "${dbField}"`)

    const orderBy: Record<string, string> = {}
    orderBy[dbField] = sortOrder
    console.log(`📊 Сортировка по:`, orderBy)

    const [data, totalCount] = await Promise.all([
      prisma.aEng.findMany({
        skip: skip,
        take: validPageSize,
        orderBy: orderBy,
      }),
      prisma.aEng.count(),
    ])

    console.log(`✅ Найдено ${data.length} записей из ${totalCount}`)

    // ТРАНСФОРМИРУЕМ ДАННЫЕ
    const transformedData = data.map(item => ({
      'ПЛП': item.plp || '',
      'Наименование объект': item.objectName || '',
      'Номер акта отбора проб': item.samplingActNumber || '',
      'Дата отбора проб': item.samplingDate || '',
      'Место отбора проб': item.samplingPlace || '',
      'Лицо, предоставившее пробу': item.personProvidedSample || '',
      'Дата поступления материала': item.materialReceiptDate || '',
      'Наименование материала': item.materialName || '',
      'Документ о качестве': item.qualityDocument || '',
      'Предприятие-изготовитель': item.manufacturer || '',
      'Номер протокола': item.protocolNumber || '',
      'Дата протокола': item.protocolDate || '',
      'Результат испытаний': item.testResult || '',
      'Примечание': item.note || ''
    }))

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