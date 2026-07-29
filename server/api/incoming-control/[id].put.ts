// server/api/incoming-control/[id].put.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParams, readMultipartFormData } from 'h3';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

// 🔧 Функция для парсинга FormData в объект
const parseFormData = (formData: any[]) => {
  const result: any = {};
  
  for (const field of formData) {
    // Поля с текстовыми данными
    if (field.name && field.data) {
      // Проверяем, является ли это файлом (есть имя файла)
      if (field.filename) {
        // Это файл, обрабатываем отдельно
        result[field.name] = {
          filename: field.filename,
          data: field.data,
          type: field.type,
        };
      } else {
        // Это текстовое поле
        const value = field.data.toString('utf-8');
        result[field.name] = value;
      }
    }
  }
  
  return result;
};

export default defineEventHandler(async (event) => {
  try {
    const { id } = getRouterParams(event);
    
    // ✅ ЧИТАЕМ FORM DATA
    const formData = await readMultipartFormData(event);
    
    if (!formData) {
      return {
        success: false,
        error: 'Форма не содержит данных',
      };
    }

    // ✅ ПАРСИМ FORM DATA В ОБЪЕКТ
    const body = parseFormData(formData);
    // console.log('📦 Распарсенные данные:', body);

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

    // Создаем объект для обновления
    const updateData: any = {};

    // Текстовые поля
    if (body.plp !== undefined && body.plp !== '') updateData.plp = body.plp;
    if (body.objName !== undefined && body.objName !== '') updateData.objectName = body.objName;
    if (body.actNumber !== undefined && body.actNumber !== '') updateData.samplingActNumber = body.actNumber;
    if (body.sPlace !== undefined && body.sPlace !== '') updateData.samplingPlace = body.sPlace;
    if (body.sPerson !== undefined && body.sPerson !== '') updateData.personProvidedSample = body.sPerson;
    if (body.material !== undefined && body.material !== '') updateData.materialName = body.material;
    if (body.manufacturer !== undefined && body.manufacturer !== '') updateData.manufacturer = body.manufacturer;
    if (body.testProtocolNumber !== undefined && body.testProtocolNumber !== '') updateData.protocolNumber = body.testProtocolNumber;
    if (body.sNote !== undefined && body.sNote !== '') updateData.note = body.sNote;

    // Даты
    if (body.sDate && body.sDate !== '') {
      updateData.samplingDate = new Date(body.sDate);
    }
    if (body.receiptDate && body.receiptDate !== '') {
      updateData.materialReceiptDate = new Date(body.receiptDate);
    }
    if (body.testProtocolDate && body.testProtocolDate !== '') {
      updateData.protocolDate = new Date(body.testProtocolDate);
    }

    // Выпадающие списки
    if (body.testResult !== undefined && body.testResult !== '') {
      updateData.testResult = body.testResult;
    }

    // Обработка файлов (если есть)
    if (body.sDoc && body.sDoc.data) {
      // Сохраняем файл на диск
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}_${body.sDoc.filename}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, body.sDoc.data);
      
      // Сохраняем путь в БД
      updateData.sDoc = `/uploads/${fileName}`;
    }

    if (body.qualDoc && body.qualDoc.data) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}_${body.qualDoc.filename}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, body.qualDoc.data);
      
      updateData.qualityDocument  = `/uploads/${fileName}`;
    }

    if (body.protocolDoc && body.protocolDoc.data) {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      
      const fileName = `${Date.now()}_${body.protocolDoc.filename}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, body.protocolDoc.data);
      
      updateData.protocolDoc = `/uploads/${fileName}`;
    }

    // Проверяем, есть ли что обновлять
    if (Object.keys(updateData).length === 0) {
      return {
        success: false,
        error: 'Нет данных для обновления',
      };
    }

    console.groupCollapsed('updateData ===> ', updateData)

    // Обновляем запись
    const updatedRecord = await prisma.aEng.update({
      where: { id: idNum },
      data: updateData,
    });

    console.log(`✅ Обновлена запись с ID: ${id}`);

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