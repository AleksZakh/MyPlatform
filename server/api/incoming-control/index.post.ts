// server/api/incoming-control/index.post.ts
import { PrismaClient } from '@prisma/client'

// Инициализируем Prisma Client (обычно его выносят в отдельный плагин или utils, но для простоты создадим здесь)
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // 1. Читаем данные, отправленные из формы на клиенте
    const body = await readBody(event)

    // 2. Базовая валидация обязательных полей
    // if (!body.title || !body.status) {
    //   throw createError({
    //     statusCode: 400,
    //     statusMessage: 'Bad Request: Title and Status are required fields',
    //   })
    // }

    /**
     * actNumber: "цауцвцсу"
manufacturer: "йсййцс"
material: "Backlog"
objName: "Todo"
plp: "Backlog"
protocolDoc: ""
qualDoc: ""

qualDocDate: 
_$2aaf608024c21ca1$export$99faa760c7908e4f {calendar: $93635573935797de$export$80ee6245ec4f29ec, era: 'AD', year: 2023, month: 9, #type: undefined, …}

qualDocNumber: "йцсйцс111"

receiptDate: 
_$2aaf608024c21ca1$export$99faa760c7908e4f {calendar: $93635573935797de$export$80ee6245ec4f29ec, era: 'AD', year: 2023, month: 9, #type: undefined, …}
sDate: 
_$2aaf608024c21ca1$export$99faa760c7908e4f {calendar: $93635573935797de$export$80ee6245ec4f29ec, era: 'AD', year: 2023, month: 9, #type: undefined, …}

sDoc: ""
sNote: "йсйцсйцсй"
sPerson: "Todo"
sPlace: "Backlog"

testProtocolData: 
_$2aaf608024c21ca1$export$99faa760c7908e4f {calendar: $93635573935797de$export$80ee6245ec4f29ec, era: 'AD', year: 2023, month: 9, #type: undefined, …}

testProtocolNumber: "йус1с121"
testResult: "In Progress"
     */

    // 3. Сохраняем данные в базу через Prisma
    // Предположим, что в вашей схеме Prisma модель называется "IncomingControl"
    const newRecord = await prisma.aEng.create({
      data: {
        // title: body.plp || '',
        // status: 'created', // Можно задать статус по умолчанию
        // description: body.description || '', // Необязательное поле
        plp: body.plp || '',
        objectName: body.objName || '',
        samplingActNumber: body.actNumber || '',
        samplingDate: '2026-07-03T08:42:00.000Z',
        samplingPlace: body.sPlace || '',
        personProvidedSample: body.sPerson || '',
        materialReceiptDate: '2026-07-03T08:42:00.000Z',
        materialName: body.material || '',
        qualityDocument: body.qualDoc || '',
        manufacturer: body.manufacturer || '',
        protocolNumber: body.qualDocNumber || '',
        protocolDate: '2026-07-03T08:42:00.000Z',
        testResult: body.testResult || '',
        note: body.sNote || '',
        createdAt: new Date()
      }
    })

    // 4. Возвращаем успешный ответ и созданную запись на клиент
    return {
      success: true,
      data: newRecord
    }

  } catch (error: any) {
    // Логируем ошибку на сервере для отладки
    console.error('Prisma Error:', error)

    // Если это наша кастомная ошибка валидации, пробрасываем её
    if (error.statusCode) throw error

    // В остальных случаях (например, упала БД) возвращаем 500 ошибку
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Server Error: Failed to save data',
    })
  }
})
