// server/api/incoming-control/[id].get.ts

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
  getRouterParam,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'

import {
  requirePermission,
} from '~~/server/services/access-control.service'

import {
  buildIncomingControlEditLocks,
} from '~~/server/services/lab/incoming-control-edit-lock.service'


const RESOURCE_KEY =
  'lab.sampling-tests'


export default defineEventHandler(
  async event => {
    const permission =
      await requirePermission(
        event,
        RESOURCE_KEY,
        AccessAction.VIEW,
      )


    const id =
      Number.parseInt(
        getRouterParam(
          event,
          'id',
        ) ?? '',
        10,
      )


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Некорректный ID записи',
      })
    }


    try {
      const record =
        await prisma.samplingTest
          .findFirst({
            where: {
              id,
              deletedAt: null,
            },

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

              testProtocol:
                true,
            },
          })


      if (!record) {
        throw createError({
          statusCode: 404,
          statusMessage:
            `Запись с ID ${id} не найдена`,
        })
      }


      const serverNow =
        new Date()


      const editLocks =
        await buildIncomingControlEditLocks({
          userId:
            permission.userId,

          samplingTestCreatedAt:
            record.createdAt,

          protocolCreatedAt:
            record
              .testProtocol
              ?.createdAt ??
            null,

          now:
            serverNow,
        })


      return {
        success: true,

        data:
          record,

        /**
         * Клиент использует serverNow, чтобы локальный
         * countdown не зависел от расхождения часов ПК и сервера.
         */
        serverNow:
          serverNow.toISOString(),

        editLocks,
      }

    } catch (error: any) {
      if (error?.statusCode) {
        throw error
      }


      console.error(
        `[incoming-control/${id}] Ошибка получения записи:`,
        error,
      )


      throw createError({
        statusCode: 500,

        statusMessage:
          'Ошибка при получении данных с сервера',

        data:
          error instanceof Error
            ? error.message
            : undefined,
      })
    }
  },
)
