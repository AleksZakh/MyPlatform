import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default defineEventHandler(async () => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
      },

      orderBy: {
        sortOrder: 'asc',
      },

      select: {
        id: true,
        key: true,
        name: true,
        description: true,

        resources: {
          where: {
            resource: {
              isActive: true,
            },
          },

          orderBy: {
            resource: {
              sortOrder: 'asc',
            },
          },

          select: {
            resource: {
              select: {
                id: true,
                key: true,
                name: true,
                description: true,
                type: true,
              },
            },
          },
        },
      },
    });

    const result = departments.map((department) => ({
      id: department.id,
      key: department.key,
      name: department.name,
      description: department.description,

      resources: department.resources.map(({ resource }) => ({
        id: resource.id,
        key: resource.key,
        name: resource.name,
        description: resource.description,
        type: resource.type,
      })),
    }));

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error(
      'Ошибка получения ресурсов для регистрации:',
      error,
    );

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to load registration resources',
      message: 'Не удалось загрузить список доступных ресурсов',
    });
  }
});