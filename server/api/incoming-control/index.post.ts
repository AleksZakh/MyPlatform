import { PrismaClient } from '@prisma/client';
import { handleFileUpload, parseDate, updateFilePathsInData } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const multipartData = await readMultipartFormData(event);
    

    if (!multipartData) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Bad Request: Данные не найдены',
      });
    }

    // Используем универсальный обработчик
    const { body, fileDbPaths } = await handleFileUpload(multipartData);
    // console.log('body ============== ', body)

    // Создаем запись в БД
    const newRecord = await prisma.aEng.create({
      data: {
        authorEmail: body.authorEmail || '',
        editorEmail: body.editorEmail || '',
        plp: body.plp || '',
        objectName: body.objName || '',
        samplingActNumber: body.actNumber || '',
        samplingDate: parseDate(body.sDate) || '',
        samplingPlace: body.sPlace || '',
        personProvidedSample: body.sPerson || '',
        materialReceiptDate: parseDate(body.receiptDate),
        materialName: body.material || '',
        manufacturer: body.manufacturer || null,
        protocolNumber: body.testProtocolNumber || '',
        protocolDate: parseDate(body.protocolDate),
        qualDocDate: parseDate(body.qualDocDate),
        testResult: body.testResult || '',
        note: body.sNote || null,
        sDocPath: fileDbPaths.sDoc || null,
        qualDocPath: fileDbPaths.qualDoc || null,
        protocolDocPath: fileDbPaths.protocolDoc || null,
        qualDocNumber: body.qualDocNumber || '',
        qualityDocument: fileDbPaths.qualDoc || '',
        createdAt: new Date(),
      },
    });

    return {
      success: true,
      data: newRecord,
    };
  } catch (error: any) {
    console.error('Server Error:', error);
    if (error.statusCode) throw error;

    throw createError({
      statusCode: 500,
      statusMessage: `Internal Server Error: ${error.message || 'Ошибка сервера'}`,
    });
  }
});