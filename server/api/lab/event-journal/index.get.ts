// server/api/lab/event-journal/index.get.ts

import {
  AccessAction,
  Prisma,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
  getQuery,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'

import {
  requirePermission,
} from '~~/server/services/access-control.service'


export const LAB_EVENT_JOURNAL_RESOURCE_KEY =
  'lab.event-journal'


type JournalType =
  | 'all'
  | 'sampling'
  | 'receipt'
  | 'protocol'


interface JournalRow {
  eventType:
    | 'sampling'
    | 'receipt'
    | 'protocol'

  entityType:
    | 'SamplingTest'
    | 'ReceiptMaterial'
    | 'TestProtocol'

  entityId: number

  samplingTestId: number | null

  title: string
  subtitle: string | null

  businessDate: Date | null

  samplingActNumber: string | null
  materialName: string | null
  manufacturerName: string | null
  protocolNumber: string | null

  objectName: string | null
  locationName: string | null
  plpName: string | null
  inspectorName: string | null
  testResult: string | null

  documentPath: string | null
  note: string | null

  createdAt: Date
  authorEmail: string | null

  editedAt: Date | null
  editorEmail: string | null
}


function parsePositiveInt(
  value: unknown,
  fallback: number,
  max: number,
): number {
  const parsed =
    Number(value)

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    return fallback
  }

  return Math.min(
    parsed,
    max,
  )
}


function parseType(
  value: unknown,
): JournalType {
  const raw =
    typeof value === 'string'
      ? value.trim().toLowerCase()
      : 'all'

  if (
    raw === 'sampling' ||
    raw === 'receipt' ||
    raw === 'protocol'
  ) {
    return raw
  }

  return 'all'
}


function parseDateStart(
  value: unknown,
): Date | null {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return null
  }

  const date =
    new Date(
      `${value.trim()}T00:00:00.000Z`,
    )

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date
}


function parseDateEnd(
  value: unknown,
): Date | null {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    return null
  }

  const date =
    new Date(
      `${value.trim()}T23:59:59.999Z`,
    )

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date
}


export default defineEventHandler(
  async event => {
    await requirePermission(
      event,
      LAB_EVENT_JOURNAL_RESOURCE_KEY,
      AccessAction.VIEW,
    )


    const query =
      getQuery(event)

    const page =
      parsePositiveInt(
        query.page,
        1,
        1_000_000,
      )

    const pageSize =
      parsePositiveInt(
        query.pageSize,
        25,
        100,
      )

    const skip =
      (page - 1) *
      pageSize

    const type =
      parseType(
        query.type,
      )

    const search =
      typeof query.search === 'string'
        ? query.search.trim()
        : ''

    const actor =
      typeof query.actor === 'string'
        ? query.actor.trim()
        : ''

    const dateFrom =
      parseDateStart(
        query.dateFrom,
      )

    const dateTo =
      parseDateEnd(
        query.dateTo,
      )


    if (
      search.includes('\u0000') ||
      actor.includes('\u0000')
    ) {
      throw createError({
        statusCode: 400,
        statusMessage:
          'Некорректный фильтр журнала',
      })
    }


    /**
     * Одна строка CTE = одно текущее бизнес-событие.
     *
     * В AuditLog лежат ОПЕРАЦИИ над событием.
     * Их не смешиваем с основным списком — история будет отдельным endpoint.
     */
    const unionSql =
      Prisma.sql`
        SELECT
          'sampling'::text AS "eventType",
          'SamplingTest'::text AS "entityType",
          st.id AS "entityId",
          st.id AS "samplingTestId",

          (
            'Отбор проб · Акт № ' ||
            st."samplingActNumber"
          )::text AS title,

          (
            COALESCE(obj.name, '') ||
            CASE
              WHEN loc.name IS NOT NULL
              THEN ' · ' || loc.name
              ELSE ''
            END
          )::text AS subtitle,

          st."samplingDate" AS "businessDate",

          st."samplingActNumber" AS "samplingActNumber",
          NULL::text AS "materialName",
          NULL::text AS "manufacturerName",
          NULL::text AS "protocolNumber",

          obj.name AS "objectName",
          loc.name AS "locationName",
          plp.name AS "plpName",
          insp.name AS "inspectorName",
          NULL::text AS "testResult",

          st."samplingDocumentPath" AS "documentPath",
          st.note AS note,

          st."createdAt" AS "createdAt",
          st."authorEmail" AS "authorEmail",

          st."editedAt" AS "editedAt",
          st."editorEmail" AS "editorEmail",

          LOWER(
            COALESCE(st."samplingActNumber", '') || ' ' ||
            COALESCE(obj.name, '') || ' ' ||
            COALESCE(loc.name, '') || ' ' ||
            COALESCE(plp.name, '') || ' ' ||
            COALESCE(insp.name, '') || ' ' ||
            COALESCE(st.note, '')
          ) AS "searchText"

        FROM "sampling_tests" st

        LEFT JOIN "plps" plp
          ON plp.id = st."plpId"

        LEFT JOIN "inspectors" insp
          ON insp.id = st."inspectorId"

        LEFT JOIN "test_locations" loc
          ON loc.id = st."testLocationId"

        LEFT JOIN "test_objects" obj
          ON obj.id = loc."testObjectId"

        WHERE st."deletedAt" IS NULL


        UNION ALL


        SELECT
          'receipt'::text AS "eventType",
          'ReceiptMaterial'::text AS "entityType",
          rm.id AS "entityId",
          st.id AS "samplingTestId",

          (
            'Поступление материала · ' ||
            COALESCE(mat.name, 'Материал не указан')
          )::text AS title,

          (
            CASE
              WHEN st."samplingActNumber" IS NOT NULL
              THEN 'Акт № ' || st."samplingActNumber"
              ELSE ''
            END ||
            CASE
              WHEN man.name IS NOT NULL
              THEN ' · ' || man.name
              ELSE ''
            END
          )::text AS subtitle,

          rm."receiptDate" AS "businessDate",

          st."samplingActNumber" AS "samplingActNumber",
          mat.name AS "materialName",
          man.name AS "manufacturerName",
          NULL::text AS "protocolNumber",

          obj.name AS "objectName",
          loc.name AS "locationName",
          NULL::text AS "plpName",
          NULL::text AS "inspectorName",
          NULL::text AS "testResult",

          rm."qualityDocumentPath" AS "documentPath",
          rm.note AS note,

          rm."createdAt" AS "createdAt",
          rm."authorEmail" AS "authorEmail",

          rm."editedAt" AS "editedAt",
          rm."editorEmail" AS "editorEmail",

          LOWER(
            COALESCE(st."samplingActNumber", '') || ' ' ||
            COALESCE(mat.name, '') || ' ' ||
            COALESCE(man.name, '') || ' ' ||
            COALESCE(obj.name, '') || ' ' ||
            COALESCE(loc.name, '') || ' ' ||
            COALESCE(rm."qualityDocumentNumber", '') || ' ' ||
            COALESCE(rm.note, '')
          ) AS "searchText"

        FROM "receipt_materials" rm

        LEFT JOIN "sampling_tests" st
          ON st."receiptMaterialId" = rm.id
         AND st."deletedAt" IS NULL

        LEFT JOIN "materials" mat
          ON mat.id = rm."materialId"

        LEFT JOIN "manufacturers" man
          ON man.id = rm."manufacturerId"

        LEFT JOIN "test_locations" loc
          ON loc.id = st."testLocationId"

        LEFT JOIN "test_objects" obj
          ON obj.id = loc."testObjectId"

        WHERE rm."deletedAt" IS NULL


        UNION ALL


        SELECT
          'protocol'::text AS "eventType",
          'TestProtocol'::text AS "entityType",
          tp.id AS "entityId",
          st.id AS "samplingTestId",

          (
            'Протокол испытаний' ||
            CASE
              WHEN tp."protocolNumber" IS NOT NULL
              THEN ' · № ' || tp."protocolNumber"
              ELSE ''
            END
          )::text AS title,

          (
            CASE
              WHEN st."samplingActNumber" IS NOT NULL
              THEN 'Акт № ' || st."samplingActNumber"
              ELSE ''
            END ||
            CASE
              WHEN tp."testResult" IS NOT NULL
              THEN ' · ' || tp."testResult"
              ELSE ''
            END
          )::text AS subtitle,

          tp."protocolDate" AS "businessDate",

          st."samplingActNumber" AS "samplingActNumber",
          mat.name AS "materialName",
          man.name AS "manufacturerName",
          tp."protocolNumber" AS "protocolNumber",

          obj.name AS "objectName",
          loc.name AS "locationName",
          NULL::text AS "plpName",
          NULL::text AS "inspectorName",
          tp."testResult" AS "testResult",

          tp."protocolDocumentPath" AS "documentPath",
          tp.note AS note,

          tp."createdAt" AS "createdAt",
          tp."authorEmail" AS "authorEmail",

          tp."editedAt" AS "editedAt",
          tp."editorEmail" AS "editorEmail",

          LOWER(
            COALESCE(tp."protocolNumber", '') || ' ' ||
            COALESCE(tp."testResult", '') || ' ' ||
            COALESCE(st."samplingActNumber", '') || ' ' ||
            COALESCE(mat.name, '') || ' ' ||
            COALESCE(man.name, '') || ' ' ||
            COALESCE(obj.name, '') || ' ' ||
            COALESCE(loc.name, '') || ' ' ||
            COALESCE(tp.note, '')
          ) AS "searchText"

        FROM "test_protocols" tp

        LEFT JOIN "sampling_tests" st
          ON st."testProtocolId" = tp.id
         AND st."deletedAt" IS NULL

        LEFT JOIN "receipt_materials" rm
          ON rm.id = st."receiptMaterialId"

        LEFT JOIN "materials" mat
          ON mat.id = rm."materialId"

        LEFT JOIN "manufacturers" man
          ON man.id = rm."manufacturerId"

        LEFT JOIN "test_locations" loc
          ON loc.id = st."testLocationId"

        LEFT JOIN "test_objects" obj
          ON obj.id = loc."testObjectId"

        WHERE tp."deletedAt" IS NULL
      `


    const conditions:
      Prisma.Sql[] = []


    if (type !== 'all') {
      conditions.push(
        Prisma.sql`
          journal."eventType" =
          ${type}
        `,
      )
    }


    if (search) {
      conditions.push(
        Prisma.sql`
          journal."searchText"
          LIKE
          ${`%${search.toLowerCase()}%`}
        `,
      )
    }


    if (actor) {
      conditions.push(
        Prisma.sql`
          (
            LOWER(
              COALESCE(
                journal."authorEmail",
                ''
              )
            )
            LIKE
            ${`%${actor.toLowerCase()}%`}

            OR

            LOWER(
              COALESCE(
                journal."editorEmail",
                ''
              )
            )
            LIKE
            ${`%${actor.toLowerCase()}%`}
          )
        `,
      )
    }


    if (dateFrom) {
      conditions.push(
        Prisma.sql`
          journal."createdAt" >=
          ${dateFrom}
        `,
      )
    }


    if (dateTo) {
      conditions.push(
        Prisma.sql`
          journal."createdAt" <=
          ${dateTo}
        `,
      )
    }


    const whereSql =
      conditions.length
        ? Prisma.sql`
            WHERE
            ${Prisma.join(
              conditions,
              ' AND ',
            )}
          `
        : Prisma.empty


    try {
      const [
        rows,
        countRows,
      ] =
        await Promise.all([
          prisma.$queryRaw<
            JournalRow[]
          >(
            Prisma.sql`
              WITH journal AS (
                ${unionSql}
              )

              SELECT
                journal."eventType",
                journal."entityType",
                journal."entityId",
                journal."samplingTestId",
                journal.title,
                journal.subtitle,
                journal."businessDate",
                journal."samplingActNumber",
                journal."materialName",
                journal."manufacturerName",
                journal."protocolNumber",
                journal."objectName",
                journal."locationName",
                journal."plpName",
                journal."inspectorName",
                journal."testResult",
                journal."documentPath",
                journal.note,
                journal."createdAt",
                journal."authorEmail",
                journal."editedAt",
                journal."editorEmail"

              FROM journal

              ${whereSql}

              ORDER BY
                journal."createdAt" DESC,
                journal."entityId" DESC

              LIMIT ${pageSize}
              OFFSET ${skip}
            `,
          ),

          prisma.$queryRaw<
            Array<{
              total:
                bigint
            }>
          >(
            Prisma.sql`
              WITH journal AS (
                ${unionSql}
              )

              SELECT
                COUNT(*)::bigint AS total

              FROM journal

              ${whereSql}
            `,
          ),
        ])


      const total =
        Number(
          countRows[0]?.total ??
          0n,
        )


      return {
        success: true,

        data:
          rows,

        total,

        page,

        pageSize,

        totalPages:
          Math.max(
            1,
            Math.ceil(
              total /
              pageSize,
            ),
          ),

        filters: {
          type,
          search,
          actor,
          dateFrom:
            dateFrom
              ?.toISOString() ??
            null,

          dateTo:
            dateTo
              ?.toISOString() ??
            null,
        },
      }

    } catch (error) {
      console.error(
        '[lab/event-journal GET] Ошибка:',
        error,
      )

      throw createError({
        statusCode: 500,

        statusMessage:
          'Не удалось загрузить журнал лабораторных событий',

        data: {
          code:
            'LAB_EVENT_JOURNAL_LOAD_FAILED',

          message:
            'Не удалось загрузить журнал лабораторных событий.',
        },
      })
    }
  },
)
