// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const CHUNK_SIZE = 1000;

// ============================================
// СЛОВАРЬ НОРМАЛИЗАЦИИ ПРОИЗВОДИТЕЛЕЙ
// ============================================
const manufacturerNormalization: Record<string, string> = {
  // Группа: ООО СУ-910
  'ООО СУ910': 'ООО СУ-910',
  'ООО СУ 910': 'ООО СУ-910',
  'ООО СУ-910': 'ООО СУ-910',
  'ООО "СУ910"': 'ООО СУ-910',
  'ООО "СУ 910"': 'ООО СУ-910',
  'ООО "СУ-910"': 'ООО СУ-910',
  'ООО СУ 910 ': 'ООО СУ-910',
  'ООО Строительное управление №910': 'ООО СУ-910',
  'Строительное управление №910': 'ООО СУ-910',
  
  // Группа: ООО СУ-926
  'ООО СУ№926': 'ООО СУ-926',
  'ООО СУ №926': 'ООО СУ-926',
  'ООО "СУ№926"': 'ООО СУ-926',
  'ООО "СУ №926"': 'ООО СУ-926',
  'ООО СУ-926': 'ООО СУ-926',
  
  // Группа: ООО Трансстроймеханизация
  'ООО НПС//Трансстроймеханизация': 'ООО Трансстроймеханизация',
  'ООО Трансстроймеханизация': 'ООО Трансстроймеханизация',
  'ООО "Трансстроймеханизация"': 'ООО Трансстроймеханизация',
  
  // Группа: АО Донаэродорстрой
  'АО Донаэродорстрой': 'АО Донаэродорстрой',
  'АО "Донаэродорстрой"': 'АО Донаэродорстрой',
  'АО ДОНАЭРОДОРСТРОЙ': 'АО Донаэродорстрой',
  
  // Группа: ООО СКАвтодор
  'ООО СКАвтодор': 'ООО СК-Автодор',
  'ООО СК-Автодор': 'ООО СК-Автодор',
  'ООО "СКАвтодор"': 'ООО СК-Автодор',
  'ООО "СК-Автодор"': 'ООО СК-Автодор',
  
  // Группа: ООО СУ905
  'ООО СУ905': 'ООО СУ-905',
  'ООО СУ 905': 'ООО СУ-905',
  'ООО СУ-905': 'ООО СУ-905',
  'ООО "СУ905"': 'ООО СУ-905',
  'ООО "СУ 905"': 'ООО СУ-905',
  'ООО "СУ-905"': 'ООО СУ-905',
  
  // Группа: ООО ТЕХАЛЬЯНС
  'ООО ТЕХАЛЬЯНС': 'ООО ТехАльянс',
  'ООО ТехАльянс': 'ООО ТехАльянс',
  'ООО "ТЕХАЛЬЯНС"': 'ООО ТехАльянс',
  
  // Группа: ООО А-МОСТ
  'ООО А-МОСТ': 'ООО А-Мост',
  'ООО "А-МОСТ"': 'ООО А-Мост',
  'ООО А-Мост': 'ООО А-Мост',
  
  // Группа: ООО Динскойавтодор
  'ООО ДИК/ ООО Динскойавтодор': 'ООО Динскойавтодор',
  'ООО Динскойавтодор': 'ООО Динскойавтодор',
  'ООО "Динскойавтодор"': 'ООО Динскойавтодор',
  
  // Дополнительные производители из CSV
  'ООО ТехСтройКонтракт': 'ООО ТехСтройКонтракт',
  'ООО ДРСУ Магистраль': 'ООО ДРСУ Магистраль',
  'к-p Спас-Загорье': 'Карьер Спас-Загорье',
  'Карьер Спас-Загорье': 'Карьер Спас-Загорье',
  'ООО ТСМ ПРОМБАЗА': 'ООО ТСМ ПРОМБАЗА',
  'ООО Штарком': 'ООО Штарком',
  'ООО ЗАРЯ БЕТОН': 'ООО ЗАРЯ БЕТОН',
  'ООО БизнесТрансСтрой': 'ООО БизнесТрансСтрой',
  'ООО ЗемДорСтрой': 'ООО ЗемДорСтрой',
  'ООО АБЗ Капотня': 'ООО АБЗ Капотня',
  'ООО "Карьер-Инвест"': 'ООО Карьер-Инвест',
  'ООО ?А-МОСТ?': 'ООО А-Мост',
  'ООО ?ТВОЙ БЕТОН?': 'ООО Твой Бетон',
  'ООО ДРСУ ?МАГИСТРАЛЬ?': 'ООО ДРСУ Магистраль',
};

function normalizeManufacturer(name: string): string {
  if (!name) return 'Не указан';
  const trimmed = name.trim().replace(/\s+/g, ' ');
  return manufacturerNormalization[trimmed] || trimmed;
}

// ============================================
// ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ ОЧИСТКИ НОМЕРА ДОКУМЕНТА
// ============================================
function cleanDocNumber(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  // Если значение "-", "—", "–" или пустое - возвращаем пустую строку
  if (trimmed === '-' || trimmed === '—' || trimmed === '–' || trimmed === '') {
    return '';
  }
  return trimmed;
}

// ============================================
// ОСНОВНАЯ ФУНКЦИЯ МИГРАЦИИ
// ============================================
async function main() {
  console.log('🚀 СТАРТ МИГРАЦИИ В НОВУЮ СТРУКТУРУ БД');
  console.log('📋 ИСПРАВЛЕННАЯ ВЕРСИЯ С ПРАВИЛЬНЫМ МАППИНГОМ ПОЛЕЙ\n');

  let skip = 0;
  let hasMore = true;
  let totalProcessed = 0;
  let skippedRecords = 0;
  let receiptsCreated = 0;
  let protocolsCreated = 0;

  // Кэш-карты для СПРАВОЧНИКОВ
  const plpCache = new Map<string, number>();
  const inspectorCache = new Map<string, number>();
  const manufacturerCache = new Map<string, number>();
  const materialCache = new Map<string, number>();
  const objectCache = new Map<string, number>();
  const locationCache = new Map<string, Map<string, number>>();

  console.log('📋 МАППИНГ ПОЛЕЙ:');
  console.log('   qualDate ← materialReceiptDate (дата поступления материала)');
  console.log('   qualDocNumber ← qualDocNumber (очистка от "-")');
  console.log('   qualDocPath ← qualDocPath или qualityDocument');
  console.log('   note ← формируется из объекта, места и акта\n');

  while (hasMore) {
    const records = await prisma.aEng.findMany({
      skip: skip,
      take: CHUNK_SIZE,
      orderBy: { id: 'asc' },
    });

    if (records.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`📦 Обработка порции... Индекс: ${skip}, Записей: ${records.length}`);

    for (const record of records) {
      try {
        // ========================================
        // 1. ПЛП (справочник)
        // ========================================
        const plpName = record.plp?.trim() || 'Не указан';
        let plpId = plpCache.get(plpName);
        if (!plpId) {
          const plp = await prisma.plp.upsert({
            where: { name: plpName },
            update: {},
            create: { 
              name: plpName, 
              note: 'Создано при миграции',
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
            },
          });
          plpId = plp.id;
          plpCache.set(plpName, plpId);
        }

        // ========================================
        // 2. Инспектор (справочник)
        // ========================================
        const inspectorName = record.personProvidedSample?.trim() || 'Не указан';
        let inspectorId = inspectorCache.get(inspectorName);
        if (!inspectorId) {
          const inspector = await prisma.inspector.upsert({
            where: { name: inspectorName },
            update: {},
            create: { 
              name: inspectorName, 
              note: 'Импортирован из AEng',
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
            },
          });
          inspectorId = inspector.id;
          inspectorCache.set(inspectorName, inspectorId);
        }

        // ========================================
        // 3. Производитель (справочник)
        // ========================================
        let manufacturerId: number | null = null;
        if (record.manufacturer?.trim()) {
          const normalizedName = normalizeManufacturer(record.manufacturer.trim());
          const manufacturer = await prisma.manufacturer.upsert({
            where: { name: normalizedName },
            update: {},
            create: { 
              name: normalizedName,
              note: `Исходное название: "${record.manufacturer.trim()}"`,
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
            },
          });
          manufacturerId = manufacturer.id;
        }

        // ========================================
        // 4. Материал (справочник)
        // ========================================
        const materialName = record.materialName?.trim() || 'Неизвестный материал';
        let materialId = materialCache.get(materialName);
        if (!materialId) {
          const material = await prisma.material.upsert({
            where: { name: materialName },
            update: {
              manufacturerId: manufacturerId || undefined,
            },
            create: {
              name: materialName,
              manufacturerId: manufacturerId,
              note: `Из AEng`,
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
            },
          });
          materialId = material.id;
          materialCache.set(materialName, materialId);
        }

        // ========================================
        // 5. Объект испытаний (справочник)
        // ========================================
        const objectName = record.objectName?.trim() || 'Неизвестный объект';
        let objectId = objectCache.get(objectName);
        if (!objectId) {
          const object = await prisma.testObject.upsert({
            where: { name: objectName },
            update: {},
            create: { 
              name: objectName, 
              note: 'Создан при миграции из AEng',
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
            },
          });
          objectId = object.id;
          objectCache.set(objectName, objectId);
        }

        // ========================================
        // 6. Место отбора (справочник)
        // ========================================
        const locationName = record.samplingPlace?.trim() || 'Неизвестное место';
        
        if (!locationCache.has(objectName)) {
          locationCache.set(objectName, new Map());
        }
        const locationMap = locationCache.get(objectName)!;
        
        let locationId = locationMap.get(locationName);
        if (!locationId) {
          const location = await prisma.testLocation.upsert({
            where: {
              testObjectId_name: {
                testObjectId: objectId,
                name: locationName,
              }
            },
            update: {},
            create: {
              name: locationName,
              testObjectId: objectId,
              note: `Место отбора на объекте "${objectName}"`,
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
            },
          });
          locationId = location.id;
          locationMap.set(locationName, locationId);
        }

        // ========================================
        // 7. ПОСТУПЛЕНИЕ МАТЕРИАЛА (ИСПРАВЛЕННОЕ!)
        // ========================================
        // ВАЖНО: qualDate берем из materialReceiptDate (дата поступления материала)
        // ВАЖНО: qualDocNumber очищаем от "-"
        const cleanQualDocPath = record.qualDocPath || record.qualityDocument || null;
        const cleanQualDocNumber = cleanDocNumber(record.qualDocNumber);
        
        // Формируем примечание с информацией об объекте, месте и акте
        const receiptNote = `Объект: ${objectName}, Место: ${locationName}, Акт: ${record.samplingActNumber || 'без номера'}`;

        const receipt = await prisma.receiptMaterial.create({
          data: {
            // ← ИСПРАВЛЕНО: используем materialReceiptDate
            qualDate: record.materialReceiptDate || null,
            // ← ИСПРАВЛЕНО: очищаем от "-"
            qualDocNumber: cleanQualDocNumber,
            // ← ИСПРАВЛЕНО: путь к документу
            qualDocPath: cleanQualDocPath,
            // ← ИСПРАВЛЕНО: примечание с объектом и местом
            note: receiptNote,
            materialId: materialId,
            authorEmail: record.authorEmail || 'migration@system',
            createdAt: record.createdAt || new Date(),
            editorEmail: record.editorEmail,
            editedAt: record.editedAt,
          },
        });
        receiptsCreated++;

        // ========================================
        // 8. ПРОТОКОЛ ИСПЫТАНИЙ (ЕСЛИ ЕСТЬ ДАННЫЕ)
        // ========================================
        let protocolId: number | null = null;
        const hasProtocolData = record.protocolNumber?.trim() || 
                               record.protocolDate || 
                               record.protocolDocPath || 
                               record.testDocPath ||
                               record.testResult?.trim();

        if (hasProtocolData) {
          const cleanProtocolDocPath = record.protocolDocPath || record.testDocPath || null;
          
          const protocol = await prisma.testProtocol.create({
            data: {
              protocolNumber: record.protocolNumber || `Без номера-${record.id}`,
              protocolDate: record.protocolDate,
              protocolDocPath: cleanProtocolDocPath,
              testResult: record.testResult || 'Не указан',
              note: `Из AEng ID: ${record.id}`,
              receiptMaterialId: receipt.id,
              authorEmail: record.authorEmail || 'migration@system',
              createdAt: record.createdAt || new Date(),
              editorEmail: record.editorEmail,
              editedAt: record.editedAt,
            },
          });
          protocolId = protocol.id;
          protocolsCreated++;
        }

        // ========================================
        // 9. ГЛАВНАЯ ТАБЛИЦА - АКТ ОТБОРА ПРОБ
        // ========================================
        await prisma.samplingTest.create({
          data: {
            sActNumber: record.samplingActNumber || `Без номера-${record.id}`,
            sActDate: record.samplingDate,
            sDocPath: record.sDocPath,
            note: record.note || `Из AEng ID: ${record.id}`,
            plpId: plpId,
            inspectorId: inspectorId,
            testLocationId: locationId,
            testProtocolId: protocolId,
            receiptMaterialId: receipt.id,
            authorEmail: record.authorEmail || 'migration@system',
            createdAt: record.createdAt || new Date(),
            editorEmail: record.editorEmail,
            editedAt: record.editedAt,
          },
        });

        totalProcessed++;

        if (totalProcessed % 100 === 0) {
          console.log(`✅ Обработано записей: ${totalProcessed}`);
        }

      } catch (error) {
        console.error(`❌ Ошибка при обработке записи ID: ${record.id}`, error);
        console.error('   Данные записи:', {
          materialName: record.materialName,
          materialReceiptDate: record.materialReceiptDate,
          qualDocNumber: record.qualDocNumber,
          qualDocPath: record.qualDocPath,
        });
        skippedRecords++;
      }
    }

    console.log(`📊 Прогресс: ${totalProcessed} записей, пропущено: ${skippedRecords}`);
    console.log(`   📥 Создано поступлений: ${receiptsCreated}`);
    console.log(`   📊 Создано протоколов: ${protocolsCreated}`);
    skip += CHUNK_SIZE;
  }

  // ===== ИТОГОВАЯ СТАТИСТИКА =====
  console.log('\n🎉 МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!');
  console.log(`📊 ИТОГИ:`);
  console.log(`   ✅ Успешно перенесено записей: ${totalProcessed}`);
  console.log(`   ⚠️ Пропущено: ${skippedRecords}`);
  console.log(`   📥 Создано поступлений: ${receiptsCreated}`);
  console.log(`   📊 Создано протоколов: ${protocolsCreated}`);

  const stats = await prisma.$transaction([
    prisma.plp.count(),
    prisma.inspector.count(),
    prisma.manufacturer.count(),
    prisma.material.count(),
    prisma.receiptMaterial.count(),
    prisma.testObject.count(),
    prisma.testLocation.count(),
    prisma.testProtocol.count(),
    prisma.samplingTest.count(),
  ]);

  console.log(`\n📋 СТАТИСТИКА НОВЫХ ТАБЛИЦ:`);
  console.log(`   🏢 ПЛП: ${stats[0]}`);
  console.log(`   👤 Инспекторы: ${stats[1]}`);
  console.log(`   🏭 Производители: ${stats[2]}`);
  console.log(`   📦 Материалы: ${stats[3]}`);
  console.log(`   📥 Поступления материалов: ${stats[4]} ← ДОЛЖНО БЫТЬ ${totalProcessed}`);
  console.log(`   🏗️ Объекты испытаний: ${stats[5]}`);
  console.log(`   📍 Места отбора: ${stats[6]}`);
  console.log(`   📊 Протоколы испытаний: ${stats[7]}`);
  console.log(`   📄 Акты отбора проб (ГЛАВНАЯ): ${stats[8]}`);

  // ===== ПРОВЕРКА ЗАПОЛНЕННОСТИ =====
  console.log(`\n📋 ПРОВЕРКА ЗАПОЛНЕННОСТИ ПОЛЕЙ:`);
  
  // Проверка поступлений
  const receiptStats = await prisma.$queryRaw`
    SELECT 
      COUNT(*) as total,
      COUNT("qualDate") as has_date,
      COUNT("qualDocNumber") as has_number,
      COUNT("qualDocPath") as has_path,
      COUNT("note") as has_note
    FROM receipt_materials
  `;
  
  console.log(`   📥 Поступления материалов:`);
  console.log(`      📊 Всего: ${Number(receiptStats[0].total)}`);
  console.log(`      📅 С датой поступления: ${Number(receiptStats[0].has_date)}`);
  console.log(`      🔢 С номером документа: ${Number(receiptStats[0].has_number)}`);
  console.log(`      📄 С путем к документу: ${Number(receiptStats[0].has_path)}`);
  console.log(`      📝 С примечанием: ${Number(receiptStats[0].has_note)}`);

  // Проверка связей
  const actsWithoutReceipt = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM sampling_tests st
    LEFT JOIN receipt_materials rm ON st."receiptMaterialId" = rm.id
    WHERE rm.id IS NULL
  `;
  
  console.log(`\n   🔗 Проверка связей:`);
  console.log(`      📄 Актов без поступлений: ${Number(actsWithoutReceipt[0].count)}`);

  // Примеры поступлений с данными
  const samples = await prisma.receiptMaterial.findMany({
    take: 5,
    include: {
      material: true,
      samplingTests: {
        take: 1,
        include: {
          plp: true,
          inspector: true,
          testLocation: {
            include: {
              testObject: true
            }
          }
        }
      }
    },
    orderBy: { id: 'desc' }
  });

  console.log(`\n📋 ПРИМЕРЫ СОЗДАННЫХ ПОСТУПЛЕНИЙ:`);
  for (const sample of samples) {
    const act = sample.samplingTests[0];
    console.log(`   📥 Поступление ID: ${sample.id}`);
    console.log(`      📅 Дата: ${sample.qualDate ? new Date(sample.qualDate).toLocaleDateString('ru-RU') : 'не указана'}`);
    console.log(`      🔢 Номер документа: ${sample.qualDocNumber || 'не указан'}`);
    console.log(`      📦 Материал: ${sample.material?.name || 'неизвестен'}`);
    console.log(`      📝 Примечание: ${sample.note || 'нет'}`);
    if (act) {
      console.log(`      📄 Акт: ${act.sActNumber}`);
      console.log(`      🏗️ Объект: ${act.testLocation?.testObject?.name || 'неизвестен'}`);
    }
    console.log('');
  }
}

// ============================================
// ЗАПУСК
// ============================================
main()
  .catch((e) => {
    console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('👋 Соединение с БД закрыто');
  });