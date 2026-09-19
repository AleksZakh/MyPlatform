// server/api/incoming-control/index.get.ts

import {
  AccessAction,
  Prisma,
} from '@prisma/client';

import {
  defineEventHandler,
  getCookie,
  getQuery,
} from 'h3';

import { prisma } from '~~/server/utils/prisma';

import {
  requirePermission,
} from '~~/server/services/access-control.service';


const RESOURCE_KEY = 'lab.sampling-tests';


function parseDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}


export default defineEventHandler(async (event) => {
  await requirePermission(
    event,
    RESOURCE_KEY,
    AccessAction.VIEW,
  );

  try {
    const query = getQuery(event);

    const page = Math.max(
      1,
      Number.parseInt(String(query.page ?? '1'), 10) || 1,
    );

    const pageSize = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(String(query.pageSize ?? '25'), 10) || 25,
      ),
    );

    const skip = (page - 1) * pageSize;

    const sortOrder =
      query.sortOrder === 'asc'
        ? 'asc'
        : 'desc';

    const sortKey =
      typeof query.sortKey === 'string'
        ? query.sortKey
        : 'samplingDate';


    // ============================================================
    // ФИЛЬТРЫ
    //
    // Названия ключей cookie пока оставлены прежними, чтобы
    // текущая панель фильтров продолжала работать.
    // После перевода frontend переименуем и их.
    // ============================================================

    let cookieFilters: Record<string, any> = {};

    const rawCookie = getCookie(
      event,
      'lab_reestrTable_filter',
    );

    if (rawCookie) {
      try {
        const parsed =
          JSON.parse(decodeURIComponent(rawCookie));

        cookieFilters =
          parsed?.filter && typeof parsed.filter === 'object'
            ? parsed.filter
            : {};
      } catch (error) {
        console.error(
          '[incoming-control] Ошибка чтения cookie фильтров:',
          error,
        );
      }
    }


    const AND: Prisma.SamplingTestWhereInput[] = [
      {
        deletedAt: null,
      },
    ];


    // ПЛП
    if (cookieFilters.plp) {
      AND.push({
        plp: {
          name: {
            contains: String(cookieFilters.plp),
            mode: 'insensitive',
          },
        },
      });
    }


    // Объект
    if (cookieFilters.objName) {
      AND.push({
        testLocation: {
          testObject: {
            name: {
              contains: String(cookieFilters.objName),
              mode: 'insensitive',
            },
          },
        },
      });
    }


    // Номер акта отбора проб
    if (cookieFilters.samplActNumber) {
      AND.push({
        samplingActNumber: {
          contains: String(cookieFilters.samplActNumber),
          mode: 'insensitive',
        },
      });
    }


    // Место отбора
    if (cookieFilters.sPlace) {
      AND.push({
        testLocation: {
          name: {
            contains: String(cookieFilters.sPlace),
            mode: 'insensitive',
          },
        },
      });
    }


    // Лицо, предоставившее пробу
    if (cookieFilters.sProvaider) {
      AND.push({
        inspector: {
          name: {
            contains: String(cookieFilters.sProvaider),
            mode: 'insensitive',
          },
        },
      });
    }


    // Материал
    if (cookieFilters.materialName) {
      AND.push({
        receiptMaterial: {
          material: {
            name: {
              contains: String(cookieFilters.materialName),
              mode: 'insensitive',
            },
          },
        },
      });
    }


    // Производитель
    if (cookieFilters.manufacturer) {
      AND.push({
        receiptMaterial: {
          manufacturer: {
            name: {
              contains: String(cookieFilters.manufacturer),
              mode: 'insensitive',
            },
          },
        },
      });
    }


    // Номер документа о качестве
    if (cookieFilters.qualiDocNumber) {
      AND.push({
        receiptMaterial: {
          qualityDocumentNumber: {
            contains: String(cookieFilters.qualiDocNumber),
            mode: 'insensitive',
          },
        },
      });
    }


    // Результат испытаний
    if (cookieFilters.testResult) {
      AND.push({
        testProtocol: {
          testResult: {
            contains: String(cookieFilters.testResult),
            mode: 'insensitive',
          },
        },
      });
    }


    // Номер протокола
    if (cookieFilters.testProtocolNumber) {
      AND.push({
        testProtocol: {
          protocolNumber: {
            contains: String(cookieFilters.testProtocolNumber),
            mode: 'insensitive',
          },
        },
      });
    }


    // ============================================================
    // ДАТЫ
    // ============================================================

    const samplingDateStart =
      parseDate(cookieFilters.sDateStart);

    const samplingDateEnd =
      parseDate(cookieFilters.sDateEnd);

    if (samplingDateStart || samplingDateEnd) {
      AND.push({
        samplingDate: {
          ...(samplingDateStart
            ? { gte: samplingDateStart }
            : {}),
          ...(samplingDateEnd
            ? { lte: samplingDateEnd }
            : {}),
        },
      });
    }


    const receiptDateStart =
      parseDate(cookieFilters.receiveDateStart);

    const receiptDateEnd =
      parseDate(cookieFilters.receiveDateEnd);

    if (receiptDateStart || receiptDateEnd) {
      AND.push({
        receiptMaterial: {
          receiptDate: {
            ...(receiptDateStart
              ? { gte: receiptDateStart }
              : {}),
            ...(receiptDateEnd
              ? { lte: receiptDateEnd }
              : {}),
          },
        },
      });
    }


    const qualityDocumentDateStart =
      parseDate(cookieFilters.qualiDateStart);

    const qualityDocumentDateEnd =
      parseDate(cookieFilters.qualiDateEnd);

    if (
      qualityDocumentDateStart ||
      qualityDocumentDateEnd
    ) {
      AND.push({
        receiptMaterial: {
          qualityDocumentDate: {
            ...(qualityDocumentDateStart
              ? { gte: qualityDocumentDateStart }
              : {}),
            ...(qualityDocumentDateEnd
              ? { lte: qualityDocumentDateEnd }
              : {}),
          },
        },
      });
    }


    const protocolDateStart =
      parseDate(cookieFilters.testReportDataStart);

    const protocolDateEnd =
      parseDate(cookieFilters.testReportDataEnd);

    if (protocolDateStart || protocolDateEnd) {
      AND.push({
        testProtocol: {
          protocolDate: {
            ...(protocolDateStart
              ? { gte: protocolDateStart }
              : {}),
            ...(protocolDateEnd
              ? { lte: protocolDateEnd }
              : {}),
          },
        },
      });
    }


    // ============================================================
    // ГЛОБАЛЬНЫЙ ПОИСК
    // ============================================================

    if (
      typeof query.search === 'string' &&
      query.search.trim()
    ) {
      const search = query.search.trim();

      AND.push({
        OR: [
          {
            samplingActNumber: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            note: {
              contains: search,
              mode: 'insensitive',
            },
          },
          {
            plp: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            inspector: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            testLocation: {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            testLocation: {
              testObject: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            receiptMaterial: {
              material: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            receiptMaterial: {
              manufacturer: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          },
          {
            receiptMaterial: {
              qualityDocumentNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            testProtocol: {
              protocolNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
          {
            testProtocol: {
              testResult: {
                contains: search,
                mode: 'insensitive',
              },
            },
          },
        ],
      });
    }


    const where: Prisma.SamplingTestWhereInput = {
      AND,
    };


    // ============================================================
    // СОРТИРОВКА
    //
    // Старые sortKey временно поддерживаются, пока frontend
    // не переведён на новые имена.
    // ============================================================

    let orderBy: Prisma.SamplingTestOrderByWithRelationInput;

    switch (sortKey) {
      case 'plp':
        orderBy = {
          plp: {
            name: sortOrder,
          },
        };
        break;

      case 'inspector':
        orderBy = {
          inspector: {
            name: sortOrder,
          },
        };
        break;

      case 'object':
        orderBy = {
          testLocation: {
            testObject: {
              name: sortOrder,
            },
          },
        };
        break;

      case 'location':
        orderBy = {
          testLocation: {
            name: sortOrder,
          },
        };
        break;

      case 'material':
        orderBy = {
          receiptMaterial: {
            material: {
              name: sortOrder,
            },
          },
        };
        break;

      case 'manufacturer':
        orderBy = {
          receiptMaterial: {
            manufacturer: {
              name: sortOrder,
            },
          },
        };
        break;

      case 'sActDate':
      case 'samplingDate':
        orderBy = {
          samplingDate: sortOrder,
        };
        break;

      case 'sActNumber':
      case 'samplingActNumber':
        orderBy = {
          samplingActNumber: sortOrder,
        };
        break;

      case 'receiptDate':
        orderBy = {
          receiptMaterial: {
            receiptDate: sortOrder,
          },
        };
        break;

      case 'protocolDate':
        orderBy = {
          testProtocol: {
            protocolDate: sortOrder,
          },
        };
        break;

      default:
        orderBy = {
          samplingDate: 'desc',
        };
    }


    // ============================================================
    // ЗАПРОС
    //
    // ВАЖНО:
    // Никакого преобразования в русские ключи.
    // API возвращает поля под теми же именами, что и Prisma.
    // ============================================================

    const [records, totalCount] =
      await Promise.all([
        prisma.samplingTest.findMany({
          where,
          include: {
            plp: true,
            inspector: true,

            testLocation: {
              include: {
                testObject: true,
              },
            },

            receiptMaterial: {
              include: {
                material: true,
                manufacturer: true,
              },
            },

            testProtocol: true,
          },

          skip,
          take: pageSize,
          orderBy,
        }),

        prisma.samplingTest.count({
          where,
        }),
      ]);


    const totalPages =
      Math.ceil(totalCount / pageSize);


    return {
      success: true,

      data: records,

      pagination: {
        currentPage: page,
        pageSize,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };

  } catch (error) {
    console.error(
      '[incoming-control] Ошибка загрузки Реестра:',
      error,
    );

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Ошибка при получении данных',
    };
  }
});
