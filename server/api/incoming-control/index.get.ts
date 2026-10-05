// server/api/incoming-control/index.get.ts

import {
  AccessAction,
  Prisma,
} from '@prisma/client';

import {
  defineEventHandler,
  getQuery,
} from 'h3';

import { readRegistryFilters, buildRegistryFilter } from '~~/server/utils/incoming-control-filter';
import { prisma } from '~~/server/utils/prisma';
import { buildIncomingControlSearch } from '~~/server/utils/incoming-control-search';

import {
  requirePermission,
} from '~~/server/services/access-control.service';


const RESOURCE_KEY = 'lab.sampling-tests';


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
        : 'createdAt';


    // ============================================================
    // ФИЛЬТРЫ
    //
    // Названия ключей cookie пока оставлены прежними, чтобы
    // текущая панель фильтров продолжала работать.
    // После перевода frontend переименуем и их.
    // ============================================================

    const filterWhere = buildRegistryFilter(readRegistryFilters(event));
    const AND: Prisma.SamplingTestWhereInput[] = [filterWhere];

    // ============================================================
    // ГЛОБАЛЬНЫЙ ПОИСК
    // ============================================================

    const searchFilter = buildIncomingControlSearch(query.search);
    if (searchFilter) AND.push(searchFilter);


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
      case 'plp.name':
      case 'plp':
        orderBy = {
          plp: {
            name: sortOrder,
          },
        };
        break;

      case 'inspector.name':
      case 'inspector':
        orderBy = {
          inspector: {
            name: sortOrder,
          },
        };
        break;

      case 'testLocation.testObject.name':
      case 'object':
        orderBy = {
          testLocation: {
            testObject: {
              name: sortOrder,
            },
          },
        };
        break;

      case 'createdAt':
        orderBy = {
          createdAt: sortOrder,
        };
        break;

      case 'testLocation.name':
      case 'location':
        orderBy = {
          testLocation: {
            name: sortOrder,
          },
        };
        break;

      case 'receiptMaterial.material.name':
      case 'material':
        orderBy = {
          receiptMaterial: {
            material: {
              name: sortOrder,
            },
          },
        };
        break;

      case 'receiptMaterial.manufacturer.name':
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

      case 'receiptMaterial.receiptDate':
      case 'receiptDate':
        orderBy = {
          receiptMaterial: {
            receiptDate: sortOrder,
          },
        };
        break;

      case 'testProtocol.protocolDate':
      case 'protocolDate':
        orderBy = {
          testProtocol: {
            protocolDate: sortOrder,
          },
        };
        break;

      case 'receiptMaterial.qualityDocumentDate':
        orderBy = { receiptMaterial: { qualityDocumentDate: { sort: sortOrder, nulls: 'last' } } };
        break;
      case 'testProtocol.protocolNumber':
        orderBy = { testProtocol: { protocolNumber: sortOrder } };
        break;
      case 'testProtocol.testResult':
        orderBy = { testProtocol: { testResult: { sort: sortOrder, nulls: 'last' } } };
        break;
      case 'note':
        orderBy = { note: { sort: sortOrder, nulls: 'last' } };
        break;
      default:
        orderBy = {
          createdAt: 'desc',
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
          orderBy: [
            orderBy,
            { id: 'desc' },
          ],
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
