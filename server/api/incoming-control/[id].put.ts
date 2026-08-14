import { PrismaClient } from '@prisma/client';
import { handleFileUpload, parseDate, cleanOldFilesFromDisk } from '~~/server/utils/fileUploadHandler';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
  try {
    const { id } = getRouterParams(event);
    const idNum = Number(id);

    if (Number.isNaN(idNum) || idNum <= 0) {
      return {
        success: false,
        error: 'Неверный ID записи',
      };
    }

    // Проверяем существование записи
    const existingRecord = await prisma.aEng.findUnique({
      where: { id: idNum },
    });

    if (!existingRecord) {
      return {
        success: false,
        error: `Запись с ID ${id} не найдена`,
      };
    }

    const multipartData = await readMultipartFormData(event);

    if (!multipartData) {
      return {
        success: false,
        error: 'Форма не содержит данных',
      };
    }

    // Собираем пути к старым файлам для удаления
    const oldFilePaths = {
      sDoc: existingRecord.sDocPath,
      qualDoc: existingRecord.qualDocPath,
      protocolDoc: existingRecord.protocolDocPath,
    };

    // Используем универсальный обработчик с удалением старых файлов
    const { body, fileDbPaths } = await handleFileUpload(multipartData, {
      cleanOldFiles: true,
      oldFilePaths,
    });

    console.log('body - редактируемые данные ======== ', body)

    // Формируем данные для обновления
    const updateData: any = {};

    // Текстовые поля
    if (body.plp !== undefined) updateData.plp = body.plp || '';
    if (body.objName !== undefined) updateData.objectName = body.objName || '';
    if (body.actNumber !== undefined) updateData.samplingActNumber = body.actNumber || '';
    if (body.sPlace !== undefined) updateData.samplingPlace = body.sPlace || '';
    if (body.sPerson !== undefined) updateData.personProvidedSample = body.sPerson || '';
    if (body.material !== undefined) updateData.materialName = body.material || '';
    if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer || null;
    if (body.testProtocolNumber !== undefined) updateData.protocolNumber = body.testProtocolNumber || '';
    if (body.sNote !== undefined) updateData.note = body.sNote || null;
    if (body.qualDocNumber !== undefined) updateData.qualDocNumber = body.qualDocNumber || '';

    if (body.editorEmail !== undefined) updateData.editorEmail = body.editorEmail;
    
    // Даты
    if (body.samplingDate !== undefined) {
      updateData.samplingDate = parseDate(body.samplingDate) ?? new Date();
    }
    if (body.receiptDate !== undefined) {
      updateData.materialReceiptDate = parseDate(body.receiptDate);
    }
    if (body.testProtocolDate !== undefined) {
      updateData.protocolDate = parseDate(body.testProtocolDate);
    }
    if (body.qualDocDate !== undefined) {
      updateData.qualDocDate = parseDate(body.qualDocDate);
    }

    // Результат испытаний
    if (body.testResult !== undefined) {
      updateData.testResult = body.testResult || '';
    }

    // Пути к файлам (только если есть новые файлы)
    if (fileDbPaths.sDoc) updateData.sDocPath = fileDbPaths.sDoc;
    if (fileDbPaths.qualDoc) {
      updateData.qualDocPath = fileDbPaths.qualDoc;
      updateData.qualityDocument = fileDbPaths.qualDoc;
    }
    if (fileDbPaths.protocolDoc) updateData.protocolDocPath = fileDbPaths.protocolDoc;

    // Если файлы не были загружены, но старые существуют - оставляем их
    // (ничего не делаем, они останутся в БД)

    // Проверяем, есть ли что обновлять
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'Нет данных для обновления',
      };
    }

    // Обновляем запись
    const updatedRecord = await prisma.aEng.update({
      where: { id: idNum },
      data: updateData,
    });

    return {
      success: true,
      message: `Запись с ID ${id} успешно обновлена`,
      data: updatedRecord,
    };

  } catch (error: any) {
    console.error('❌ Ошибка при обновлении записи:', error);
    return {
      success: false,
      error: error.message || 'Ошибка при обновлении записи',
    };
  }
});