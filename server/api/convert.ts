import { defineEventHandler, createError, setResponseHeader, getHeader } from 'h3'
import fs from 'node:fs'
import path from 'node:path'
import libre from 'libreoffice-convert'
import { promisify } from 'node:util'


const convertAsync = promisify(libre.convert)

export default defineEventHandler(async (event) => {
  // 1. Получаем имя или путь к файлу из query-параметров (например, ?file=document.docx)
  
  const query = getQuery(event)
  const fileName = query.file as string
  

  if (!fileName) {
    throw createError({ statusCode: 400, statusMessage: 'Имя файла не указано' })
  }

  const host = getHeader(event, 'host') || ''
  let docxPath = ''

  // 2. Формируем абсолютный путь к вашему исходному DOCX-файлу
  // Предположим, файлы хранятся в корне проекта в папке .files/ или public/files/
  if (host.includes('space.avtodor-eng.ru') || host.startsWith('space')) {
    // Вариант 1: Запрос через боевой домен space...
    const UPLOADS_DIR = '/var/www/uploads-storage/files/'
    docxPath = path.join(UPLOADS_DIR, fileName)

    // Защита от Path Traversal (выхода за пределы разрешенной папки)
    if (!docxPath.startsWith(UPLOADS_DIR)) {
      throw createError({ statusCode: 400, statusMessage: 'Недопустимый путь к файлу' })
    }
  } else {
    // Вариант 2: Запрос через локальный IP 10.0.18.201:3000 или localhost
    const LOCAL_DIR = path.resolve(process.cwd(), 'public/files')
    docxPath = path.join(LOCAL_DIR, fileName)

    // Аналогичная защита для локальной папки
    if (!docxPath.startsWith(LOCAL_DIR)) {
      throw createError({ statusCode: 400, statusMessage: 'Недопустимый путь к файлу' })
    }
  }

  // Выводим в консоль сервера для отладки, какой путь в итоге выбрался
  console.log(`[Convert API] Request from Host: ${host} -> Target Path: ${docxPath}`)


  if (!fs.existsSync(docxPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Файл Word не найден на сервере' })
  }

  try {
    // 3. Читаем DOCX файл в буфер памяти
    console.log('docxPath ######### ==> ', docxPath)
    const docxBuffer = await fs.promises.readFile(docxPath)

    // 4. Конвертируем DOCX-буфер в PDF-буфер с помощью LibreOffice
    const pdfBuffer = await convertAsync(docxBuffer, '.pdf', undefined)

    // 5. Устанавливаем заголовок ответа, чтобы браузер понял, что это PDF
    setResponseHeader(event, 'Content-Type', 'application/pdf')
    
    // (Опционально) Можно заголовок кэширования добавить, чтобы не конвертировать каждый раз заново:
    // setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000')

    // 6. Отдаем готовый PDF-поток фронтенду
    return pdfBuffer
  } catch (error: any) {
    console.error('Ошибка конвертации на сервере Nitro:', error)
    throw createError({ statusCode: 500, statusMessage: 'Не удалось сконвертировать файл в PDF' })
  }
})
