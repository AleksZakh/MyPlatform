// server/api/reference/search.get.ts
import { PrismaClient } from '@prisma/client';
import { defineEventHandler, getQuery } from 'h3';

const prisma = new PrismaClient();

// Белый список: какие модели и какие поля разрешено искать через этот эндпоинт
const ALLOWED_TARGETS: Record<string, string[]> = {
  // Справочники (новая структура)
  plp: ['name'],                    // ПЛП
  inspector: ['name'],              // Инспекторы (лицо, предоставившее пробу)
  manufacturer: ['name'],           // Производители
  material: ['name'],               // Материалы
  testObject: ['name'],             // Объекты испытаний
  testLocation: ['name'],           // Места отбора
  receiptMaterial: ['qualDocNumber'], // Поступления материалов
  testProtocol: ['protocolNumber', 'testResult'], // Протоколы испытаний
  samplingTest: ['sActNumber'],     // Акты отбора проб (ГЛАВНАЯ ТАБЛИЦА)
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  console.log('query ====> ', query)
  const targetModel = String(query.model || '');
  const targetField = String(query.field || '');
  const searchValue = String(query.search || '').trim();

  // 1. Валидация безопасности
  if (!ALLOWED_TARGETS[targetModel] || !ALLOWED_TARGETS[targetModel].includes(targetField)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Недопустимая модель или поле для поиска',
    });
  }

  try {
    // Динамически обращаемся к модели Prisma
    const modelDelegate = (prisma as any)[targetModel];

    if (!modelDelegate) {
      throw createError({
        statusCode: 400,
        statusMessage: `Модель "${targetModel}" не найдена`,
      });
    }

    // Строим where условие с поиском по частичному совпадению
    const whereCondition: any = {};
    
    if (searchValue) {
      // Для PostgreSQL используем contains с insensitive режимом
      whereCondition[targetField] = {
        contains: searchValue,
        mode: 'insensitive',
      };
    }

    // Выполняем поиск с группировкой по уникальным значениям
    const records = await modelDelegate.findMany({
      where: whereCondition,
      select: {
        [targetField]: true,
      },
      distinct: [targetField],
      orderBy: {
        [targetField]: 'asc',
      },
      // take: 50, // Максимум 50 записей для производительности
    });

    // Преобразуем массив объектов в плоский массив строк
    return records.map((item: any) => item[targetField]);

  } catch (error) {
    console.error(`Ошибка поиска (${targetModel}.${targetField}):`, error);
    
    if ((error as any).statusCode) throw error;
    
    throw createError({
      statusCode: 500,
      statusMessage: 'Внутренняя ошибка сервера при поиске',
    });
  }
});