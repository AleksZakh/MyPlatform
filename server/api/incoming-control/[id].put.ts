import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getRouterParams, readBody } from 'h3';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {

    try {
        // 1. Получаем ID из параметров маршрута
        const { id } = getRouterParams(event);
        // 2. Получаем данные для обновления из тела запроса
        const body = await readBody(event);

        console.log('PUT request received for ID:', id, 'with body:', body);

        // Проверяем, что ID корректен (getRouterParams возвращает строку или undefined)
        if (typeof id === 'undefined') {
            return {
                success: false,
                error: 'ID отсутствует'
            };
        }
        const idNum = Number(id);
        if (Number.isNaN(idNum) || idNum <= 0) {
            return {
                success: false,
                error: 'Неверный ID записи'
            };
        }

        // 3. Проверяем, существует ли запись
        const existingRecord = await prisma.aEng.findUnique({
        where: { id: idNum }
        })
        if (!existingRecord) {
            return {
                success: false,
                error: `Запись с ID ${id} не найдена`
            }
        }

        // 4. Создаем объект с данными для обновления
        // Маппинг полей: русские названия → поля в БД
        const updateData: any = {}
        
        // Текстовые поля
        if (body.plp !== undefined) updateData.plp = body.plp
        if (body.objName !== undefined) updateData.objectName = body.objName
        if (body.actNumber !== undefined) updateData.samplingActNumber = body.actNumber
        if (body.sPlace !== undefined) updateData.samplingPlace = body.sPlace
        if (body.sPerson !== undefined) updateData.personProvidedSample = body.sPerson
        if (body.material !== undefined) updateData.materialName = body.material
        if (body.qualDoc !== undefined) updateData.qualityDocument = body.qualDoc
        if (body.manufacturer !== undefined) updateData.manufacturer = body.manufacturer
        if (body.testProtocolNumber !== undefined) updateData.protocolNumber = body.testProtocolNumber
        if (body.note !== undefined) updateData.note = body.sNote

        // Даты (преобразуем строки в объекты Date)
        if (body.sDate) {
            updateData.samplingDate = body.sDate
        }
        if (body.receiptDate) {
            updateData.materialReceiptDate = body.receiptDate
        }
        if (body.testProtocolDate) {
            updateData.protocolDate = body.testProtocolDate
        }
        
        // Выпадающие списки
        if (body.testResult !== undefined) updateData.testResult = body.testResult

        // Проверяем, есть ли что обновлять
        if (Object.keys(updateData).length === 0) {
            return {
                success: false,
                error: 'Нет данных для обновления'
            }
        }
        // 5. Обновляем запись
        const updatedRecord = await prisma.aEng.update({
            where: { id: idNum },
            data: updateData
        })

        console.log(`✅ Обновлена запись с ID: ${id}`);
        return {
            success: true,
            message: `Запись с ID ${id} успешно обновлена`,
            data: updatedRecord // Можно вернуть обновленные данные, если нужно
        }

    } catch (error) {
        const e: any = error;
        console.error('Error occurred while handling PUT request:', e);
        console.error('❌ Ошибка при обновлении записи:', e)

        // Обработка специфических ошибок Prisma
        if (e && e.code === 'P2025') {
            return {
                success: false,
                error: 'Запись не найдена'
            }
        }

        return {
            success: false,
            error: (e && e.message) || 'Ошибка при обновлении записи'
        }
    }
    
})