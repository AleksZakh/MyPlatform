// server/api/incoming-control/index.post.ts
import { PrismaClient } from '@prisma/client'

// Инициализируем Prisma Client (обычно его выносят в отдельный плагин или utils, но для простоты создадим здесь)
const prisma = new PrismaClient()

export default defineEventHandler(async (event) => {
  try {
    // 1. Читаем данные, отправленные из формы на клиенте
    const body = await readBody(event)
    console.log('Received data:', body)

    // 2. Базовая валидация обязательных полей
    // if (!body.title || !body.status) {
    //   throw createError({
    //     statusCode: 400,
    //     statusMessage: 'Bad Request: Title and Status are required fields',
    //   })
    // }

    
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
        samplingDate: body.sDate || '',
        samplingPlace: body.sPlace || '',
        personProvidedSample: body.sPerson || '',
        materialReceiptDate: body.receiptDate || '',
        materialName: body.material || '',
        qualityDocument: body.qualDoc || '',
        manufacturer: body.manufacturer || '',
        protocolNumber: body.qualDocNumber || '',
        protocolDate: body.testProtocolData || '',
        testResult: body.testResult || '',
        note: body.sNote || '',
        createdAt: new Date()
      }
    })
    console.log('New record created:', newRecord)

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
