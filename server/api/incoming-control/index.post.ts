import { PrismaClient } from '@prisma/client'
import fs from 'node:fs'
import path from 'node:path'

const prisma = new PrismaClient()

// Функция для генерации имени подкаталога: 2025-11-30_17-45
function generateFolderName(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}_${hours}-${minutes}`
}

export default defineEventHandler(async (event) => {
  try {
    const multipartData = await readMultipartFormData(event)
    
    if (!multipartData) {
      throw createError({ statusCode: 400, statusMessage: 'Bad Request: Данные не найдены' })
    }

    // ИСПРАВЛЕНИЕ ОШИБКИ ПУТИ: process.cwd() надежно возвращает корень проекта в Ubuntu/Linux
    const rootDir = process.cwd()
    const baseUploadDir = '/var/www/uploads-storage/files'

    // Генерируем подкаталог (например: 2025-11-30_17-45)
    const folderName = generateFolderName()
    const targetDir = path.join(baseUploadDir, folderName)

    // Создаем директории, если их нет
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const body: Record<string, string> = {}
    const fileDbPaths: Record<string, string> = {
      sDoc: '',
      qualDoc: '',
      protocolDoc: ''
    }

    // Обрабатываем элементы из multipartData
    for (const item of multipartData) {
      if (!item.name) continue

      if (item.filename) {
        const fieldName = item.name
        
        // Исправление для Linux/Ubuntu: декодируем имя файла в utf-8, 
        // чтобы избежать кракозябр при загрузке файлов с русскими буквами
        const rawFilename = Buffer.from(item.filename, 'latin1').toString('utf-8')
        const safeFilename = path.basename(rawFilename)
        
        // Полный путь для сохранения файла на сервере
        const fullPath = path.join(targetDir, safeFilename)

        // Записываем буфер файла на диск
        fs.writeFileSync(fullPath, item.data)
        
        // Сохраняем относительный путь для БД (например: "2025-11-30_17-45/test.docx")
        fileDbPaths[fieldName] = path.join(folderName, safeFilename)
      } else {
        // Декодируем текстовые поля в UTF-8
        body[item.name] = item.data.toString('utf-8')
      }
    }

    // Сохраняем данные в PostgreSQL через Prisma
    const newRecord = await prisma.aEng.create({
      data: {
        plp: body.plp || '',
        objectName: body.objName || '',
        samplingActNumber: body.actNumber || '',
        
        // Конвертируем строки дат в объекты Date для PostgreSQL
        samplingDate: body.sDate ? new Date(body.sDate) : new Date(),
        samplingPlace: body.sPlace || '',
        personProvidedSample: body.sPerson || '',
        materialReceiptDate: body.receiptDate ? new Date(body.receiptDate) : new Date(),
        materialName: body.material || '',
        manufacturer: body.manufacturer || null,
        
        protocolNumber: body.testProtocolNumber || '', 
        protocolDate: body.testProtocolDate ? new Date(body.testProtocolDate) : new Date(),
        testResult: body.testResult || '',
        note: body.sNote || null,

        // Новые поля для путей к трем документам
        sDocPath: fileDbPaths.sDoc || null,
        qualDocPath: fileDbPaths.qualDoc || null,
        protocolDocPath: fileDbPaths.protocolDoc || null,
        qualDocNumber: body.qualDocNumber || '',
        
        // Старое поле (сохраняем для совместимости путь ко второму документу)
        qualityDocument: fileDbPaths.qualDoc || '', 
        createdAt: new Date(),
      }
    })

    return {
      success: true,
      data: newRecord
    }

  } catch (error: any) {
    console.error('Server Error:', error)
    if (error.statusCode) throw error
    
    throw createError({
      statusCode: 500,
      statusMessage: `Internal Server Error: ${error.message || 'Ошибка сервера'}`,
    })
  }
})
