import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any // кастуем к any для динамического обращения к моделям

// Белый список: какие модели и какие поля разрешено искать через этот эндпоинт
const ALLOWED_TARGETS: Record<string, string[]> = {
  aEng: ['objectName', 'plp', 'samplingPlace', 'personProvidedSample', 'materialName', 'manufacturer'], // Ваша таблица и её поля
  buildingMaterials: ['materialName', 'vendorCode'],     // Пример другой таблицы
  regions: ['title']                                     // Пример третьей таблицы
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
//   console.log('query == >', query)
  
//   const search = String(query.search || '').trim()
//   const limit = Number(query.limit) || 20
  
  // Новые параметры динамического запроса
  const targetModel = String(query.model || '')
  const targetField = String(query.field || '')

  // 1. Валидация безопасности
  if (!ALLOWED_TARGETS[targetModel] || !ALLOWED_TARGETS[targetModel].includes(targetField)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Недопустимая модель или поле для поиска',
    })
  }

//   if (!search) return []

  try {
    // Динамически обращаемся к модели Prisma, например: prisma.aEng
    const modelDelegate = prisma[targetModel]

    const records = await modelDelegate.groupBy({
        by: [targetField],
        where: {
            [targetField]: {        // Динамическое имя поля (например, objectName)
            mode: 'insensitive',  // Уберите эту строку, если у вас MySQL
            },
        },
        select: {
            [targetField]: true,    // Выбираем только id и нужное текстовое поле
        },
        orderBy: {
            [targetField]: 'asc', // ЯВНО задаем сортировку по этому же полю по алфавиту
        }
    })

    // Преобразуем массив объектов [{ objectName: 'А' }, { objectName: 'Б' }] 
    // в плоский массив строк: ['А', 'Б']
    return records.map((item: any) => item[targetField])

  } catch (error) {
    console.error(`Ошибка универсального поиска (${targetModel}.${targetField}):`, error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Внутренняя ошибка сервера при поиске',
    })
  }
})