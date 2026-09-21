// server/services/lab/incoming-control-location.service.ts

import {
  AccessAction,
} from '@prisma/client'

import type {
  Prisma,
} from '@prisma/client'

import type {
  H3Event,
} from 'h3'

import {
  normalizeLocationName,
} from '~~/shared/utils/lab-location-name'

import {
  requirePermission,
} from '~~/server/services/access-control.service'

import {
  auditDataChange,
  buildCreateAuditDelta,
} from '~~/server/utils/auditLog'

import {
  catalogError,
  locationNameMatches,
  lockObject,
} from '~~/server/services/lab/objects-locations-api.service'


const LOCATION_RESOURCE_KEY =
  'lab.test-locations'


export interface ResolveIncomingControlLocationOptions {
  event: H3Event

  tx: Prisma.TransactionClient

  testObjectId: number

  rawName: string

  userId: number

  actorEmail: string
}


export interface ResolvedIncomingControlLocation {
  id: number

  name: string

  testObjectId: number

  created: boolean
}


/**
 * Единый resolver места отбора для POST/PUT Реестра.
 *
 * Правила:
 * - сравнение выполняется тем же нормализатором, что и справочник;
 * - одно действующее эквивалентное место -> используем его ID;
 * - несколько действующих эквивалентных мест -> неоднозначность, отказ;
 * - совпадение только с мягко удалённым -> отказ, без восстановления;
 * - совпадений нет -> создаём новое место только во время SAVE;
 * - новое место требует CREATE на lab.test-locations;
 * - создание места аудируется в той же транзакции.
 */
export async function resolveIncomingControlLocation(
  options: ResolveIncomingControlLocationOptions,
): Promise<ResolvedIncomingControlLocation> {
  const {
    event,
    tx,
    testObjectId,
    rawName,
    userId,
    actorEmail,
  } = options


  const name =
    normalizeLocationName(
      rawName,
    )


  if (!name) {
    catalogError(
      400,
      'INVALID_LOCATION_NAME',
      'Место отбора проб обязательно для заполнения.',
      {
        field:
          'testLocationName',
      },
    )
  }


  /**
   * Блокируем родительский объект.
   *
   * Это сериализует параллельные попытки создать новое место
   * внутри одного объекта и не позволяет получить два новых
   * эквивалентных места из двух одновременных SAVE.
   */
  await lockObject(
    tx,
    testObjectId,
  )


  const matches =
    await locationNameMatches(
      tx,
      testObjectId,
      name,
    )


  const activeMatches =
    matches.filter(
      item =>
        item.deletedAt === null,
    )


  /**
   * Ровно одно действующее совпадение:
   * повторно используем существующий справочный ID.
   */
  if (
    activeMatches.length === 1
  ) {
    const existing =
      activeMatches[0]!

    return {
      id:
        existing.id,

      name:
        existing.name,

      testObjectId,

      created:
        false,
    }
  }


  /**
   * Исторически в БД могут существовать несколько вариантов,
   * которые по новым правилам эквивалентны.
   *
   * Никакой произвольный ID не выбираем.
   */
  if (
    activeMatches.length > 1
  ) {
    catalogError(
      409,
      'LOCATION_NAME_AMBIGUOUS',
      'В выбранном объекте найдено несколько действующих мест с эквивалентным названием. Уточните справочник перед сохранением Реестра.',
      {
        testObjectId,

        matches:
          activeMatches.map(
            item => ({
              id:
                item.id,

              name:
                item.name,
            }),
          ),
      },
    )
  }


  /**
   * Активного совпадения нет, но есть мягко удалённое.
   *
   * Главное отличие от прежнего upsert:
   * deletedAt/deletedBy НЕ очищаем.
   */
  if (
    matches.length > 0
  ) {
    catalogError(
      409,
      'LOCATION_NAME_RESERVED',
      'Такое место уже существует среди мягко удалённых мест выбранного объекта. Автоматическое восстановление запрещено.',
      {
        testObjectId,

        matches:
          matches.map(
            item => ({
              id:
                item.id,

              name:
                item.name,

              deleted:
                item.deletedAt !==
                null,
            }),
          ),
      },
    )
  }


  /**
   * Совпадений нет: это действительно новое место.
   *
   * Пользователь может создавать запись Реестра, не имея права
   * изменять справочник. Поэтому CREATE места проверяем отдельно
   * и только в этой ветке.
   */
  await requirePermission(
    event,
    LOCATION_RESOURCE_KEY,
    AccessAction.CREATE,
  )


  const created =
    await tx.testLocation
      .create({
        data: {
          name,

          note:
            null,

          authorEmail:
            actorEmail,

          testObject: {
            connect: {
              id:
                testObjectId,
            },
          },
        },
      })


  await auditDataChange({
    event,

    db:
      tx,

    resourceKey:
      LOCATION_RESOURCE_KEY,

    entityType:
      'TestLocation',

    entityId:
      created.id,

    action:
      'CREATE',

    note:
      'Создано новое место отбора при сохранении записи Реестра',

    changes:
      buildCreateAuditDelta(
        {
          name:
            created.name,

          note:
            created.note,

          testObjectId:
            created.testObjectId,
        },
        [
          'name',
          'note',
          'testObjectId',
        ],
      ),

    actorEmail,
  })


  return {
    id:
      created.id,

    name:
      created.name,

    testObjectId:
      created.testObjectId,

    created:
      true,
  }
}
