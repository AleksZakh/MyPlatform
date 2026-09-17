import {
  PrismaClient,
  AccessResourceType,
} from '@prisma/client';

const prisma = new PrismaClient();

const laboratoryResources = [
  {
    key: 'lab.sampling-tests',
    name: 'Акты отбора проб',
    description: 'Акты отбора проб и связанные с ними данные',
    sortOrder: 10,
  },
  {
    key: 'lab.receipt-materials',
    name: 'Поступления материалов',
    description: 'Данные о поступлении материалов',
    sortOrder: 20,
  },
  {
    key: 'lab.materials',
    name: 'Материалы',
    description: 'Справочник материалов',
    sortOrder: 30,
  },
  {
    key: 'lab.manufacturers',
    name: 'Производители',
    description: 'Справочник производителей материалов',
    sortOrder: 40,
  },
  {
    key: 'lab.test-protocols',
    name: 'Протоколы испытаний',
    description: 'Протоколы лабораторных испытаний',
    sortOrder: 50,
  },
  {
    key: 'lab.test-objects',
    name: 'Объекты испытаний',
    description: 'Справочник объектов испытаний',
    sortOrder: 60,
  },
  {
    key: 'lab.test-locations',
    name: 'Места отбора',
    description: 'Справочник мест отбора проб',
    sortOrder: 70,
  },
  {
    key: 'lab.inspectors',
    name: 'Инспекторы',
    description: 'Справочник инспекторов',
    sortOrder: 80,
  },
  {
    key: 'lab.plps',
    name: 'ПЛП',
    description: 'Справочник ПЛП',
    sortOrder: 90,
  },
] as const;

async function seedAccessSystem() {
  console.log('Начинаем заполнение справочников системы доступа Space...');

  await prisma.$transaction(async (tx) => {
    // ========================================================
    // 1. Создаём подразделение
    // ========================================================

    const laboratoryDepartment = await tx.department.upsert({
      where: {
        key: 'laboratory-control',
      },

      update: {
        name: 'Лабораторный контроль',
        description: 'Отдел лабораторного контроля',
        isActive: true,
        sortOrder: 10,
      },

      create: {
        key: 'laboratory-control',
        name: 'Лабораторный контроль',
        description: 'Отдел лабораторного контроля',
        isActive: true,
        sortOrder: 10,
      },
    });

    console.log(
      `Подразделение: ${laboratoryDepartment.name} [id=${laboratoryDepartment.id}]`,
    );

    // ========================================================
    // 2. Создаём ресурсы
    // ========================================================

    for (const definition of laboratoryResources) {
      const resource = await tx.accessResource.upsert({
        where: {
          key: definition.key,
        },

        update: {
          name: definition.name,
          description: definition.description,
          type: AccessResourceType.TABLE,
          isActive: true,
          sortOrder: definition.sortOrder,
        },

        create: {
          key: definition.key,
          name: definition.name,
          description: definition.description,
          type: AccessResourceType.TABLE,
          isActive: true,
          sortOrder: definition.sortOrder,
        },
      });

      // ======================================================
      // 3. Связываем ресурс с подразделением
      // ======================================================

      await tx.departmentResource.upsert({
        where: {
          departmentId_resourceId: {
            departmentId: laboratoryDepartment.id,
            resourceId: resource.id,
          },
        },

        update: {
          isOwner: true,
        },

        create: {
          departmentId: laboratoryDepartment.id,
          resourceId: resource.id,
          isOwner: true,
        },
      });

      console.log(
        `Ресурс: ${resource.name} (${resource.key})`,
      );
    }
  });

  console.log('Заполнение справочников Space завершено.');
}

async function main() {
  await seedAccessSystem();
}

main()
  .catch((error) => {
    console.error('Ошибка выполнения seed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });