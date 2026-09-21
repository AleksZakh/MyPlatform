// server/api/lab/event-journal/[type]/[id]/history.get.ts

import {
  AccessAction,
  Prisma,
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


const RESOURCE_KEY =
  'lab.event-journal'


type JournalType =
  | 'sampling'
  | 'receipt'
  | 'protocol'


interface TypeConfig {
  entityType:
    | 'SamplingTest'
    | 'ReceiptMaterial'
    | 'TestProtocol'

  label: string
}


const TYPE_CONFIG:
  Record<
    JournalType,
    TypeConfig
  > = {
    sampling: {
      entityType:
        'SamplingTest',

      label:
        'Отбор проб',
    },

    receipt: {
      entityType:
        'ReceiptMaterial',

      label:
        'Поступление материала',
    },

    protocol: {
      entityType:
        'TestProtocol',

      label:
        'Протокол испытаний',
    },
  }


function parseType(
  value:
    string | undefined,
): JournalType {
  if (
    value === 'sampling' ||
    value === 'receipt' ||
    value === 'protocol'
  ) {
    return value
  }

  throw createError({
    statusCode: 400,

    statusMessage:
      'Некорректный тип лабораторного события',

    data: {
      code:
        'INVALID_LAB_EVENT_TYPE',

      message:
        'Допустимые типы: sampling, receipt, protocol.',
    },
  })
}


function parseId(
  value:
    string | undefined,
): number {
  const text =
    value ?? ''

  const id =
    Number(text)

  if (
    !/^[1-9]\d*$/.test(
      text,
    ) ||
    !Number.isSafeInteger(
      id,
    ) ||
    id >
      2_147_483_647
  ) {
    throw createError({
      statusCode: 400,

      statusMessage:
        'Некорректный ID лабораторного события',

      data: {
        code:
          'INVALID_LAB_EVENT_ID',

        message:
          'Некорректный ID лабораторного события.',
      },
    })
  }

  return id
}


function jsonObjectOrNull(
  value:
    Prisma.JsonValue | null,
):
  Record<
    string,
    unknown
  > | null {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  return value as
    Record<
      string,
      unknown
    >
}


function jsonArrayOrNull(
  value:
    Prisma.JsonValue | null,
):
  unknown[] | null {
  return Array.isArray(
    value,
  )
    ? value
    : null
}


export default defineEventHandler(
  async event => {
    await requirePermission(
      event,
      RESOURCE_KEY,
      AccessAction.VIEW,
    )


    const type =
      parseType(
        getRouterParam(
          event,
          'type',
        ),
      )

    const id =
      parseId(
        getRouterParam(
          event,
          'id',
        ),
      )

    const config =
      TYPE_CONFIG[type]


    try {
      /**
       * Не ограничиваем только category=DATA/result=SUCCESS:
       * старые AuditLog-записи могли быть созданы до появления
       * новых полей Event Log.
       *
       * Стабильный ключ истории:
       * entityType + entityId.
       */
      const rows =
        await prisma.auditLog
          .findMany({
            where: {
              entityType:
                config.entityType,

              entityId:
                id,
            },

            orderBy: [
              {
                timestamp:
                  'asc',
              },
              {
                id:
                  'asc',
              },
            ],

            select: {
              id:
                true,

              entityType:
                true,

              entityId:
                true,

              action:
                true,

              category:
                true,

              result:
                true,

              resourceKey:
                true,

              actorUserId:
                true,

              actorLogin:
                true,

              actorEmail:
                true,

              actorAuthType:
                true,

              timestamp:
                true,

              note:
                true,

              changes:
                true,

              beforeData:
                true,

              afterData:
                true,

              changedFields:
                true,

              requestId:
                true,

              method:
                true,

              route:
                true,
            },
          })


      const history =
        rows.map(
          row => {
            const changes =
              jsonObjectOrNull(
                row.changes,
              )

            const beforeData =
              jsonObjectOrNull(
                row.beforeData,
              )

            const afterData =
              jsonObjectOrNull(
                row.afterData,
              )

            const changedFields =
              jsonArrayOrNull(
                row.changedFields,
              )


            return {
              auditId:
                row.id,

              action:
                row.action,

              category:
                row.category,

              result:
                row.result,

              resourceKey:
                row.resourceKey,

              timestamp:
                row.timestamp,

              actor: {
                userId:
                  row.actorUserId,

                login:
                  row.actorLogin,

                email:
                  row.actorEmail,

                authType:
                  row.actorAuthType,

                display:
                  row.actorLogin ||
                  row.actorEmail ||
                  (
                    row.actorUserId
                      ? `user:${row.actorUserId}`
                      : 'Неизвестный пользователь'
                  ),
              },

              note:
                row.note,

              /**
               * Современный формат:
               *
               * {
               *   field: {
               *     before: ...,
               *     after: ...
               *   }
               * }
               */
              changes,

              /**
               * Старые записи аудита оставляем доступными
               * для карточки истории.
               */
              legacy:
                beforeData ||
                afterData ||
                changedFields
                  ? {
                      beforeData,
                      afterData,
                      changedFields,
                    }
                  : null,

              request: {
                requestId:
                  row.requestId,

                method:
                  row.method,

                route:
                  row.route,
              },
            }
          },
        )


      const createEvent =
        history.find(
          item =>
            item.action ===
            'CREATE',
        ) ??
        null


      const updateEvents =
        history.filter(
          item =>
            item.action ===
            'UPDATE',
        )


      const deleteEvent =
        [...history]
          .reverse()
          .find(
            item =>
              item.action ===
              'DELETE',
          ) ??
        null


      const lastChange =
        history.length > 0
          ? history[
              history.length -
              1
            ]!
          : null


      return {
        success: true,

        event: {
          type,
          entityType:
            config.entityType,

          entityId:
            id,

          label:
            config.label,
        },

        summary: {
          totalEvents:
            history.length,

          created:
            createEvent
              ? {
                  timestamp:
                    createEvent
                      .timestamp,

                  actor:
                    createEvent
                      .actor,
                }
              : null,

          updatesCount:
            updateEvents.length,

          lastChange:
            lastChange
              ? {
                  action:
                    lastChange
                      .action,

                  timestamp:
                    lastChange
                      .timestamp,

                  actor:
                    lastChange
                      .actor,
                }
              : null,

          deleted:
            deleteEvent
              ? {
                  timestamp:
                    deleteEvent
                      .timestamp,

                  actor:
                    deleteEvent
                      .actor,
                }
              : null,
        },

        history,
      }

    } catch (error: any) {
      if (
        error?.statusCode
      ) {
        throw error
      }

      console.error(
        `[lab/event-journal history ${type}/${id}] Ошибка:`,
        error,
      )

      throw createError({
        statusCode: 500,

        statusMessage:
          'Не удалось загрузить историю лабораторного события',

        data: {
          code:
            'LAB_EVENT_HISTORY_LOAD_FAILED',

          message:
            'Не удалось загрузить историю лабораторного события.',
        },
      })
    }
  },
)
