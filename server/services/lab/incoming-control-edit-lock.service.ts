// server/services/lab/incoming-control-edit-lock.service.ts

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'


export const INCOMING_CONTROL_EDIT_WINDOW_MINUTES =
  30

export const INCOMING_CONTROL_EDIT_WINDOW_MS =
  INCOMING_CONTROL_EDIT_WINDOW_MINUTES *
  60 *
  1000


/**
 * Отдельный FEATURE-ресурс.
 *
 * Руководителю достаточно выдать:
 *
 * lab.incoming-control.edit-lock-override : UPDATE
 *
 * Не привязываемся к названию должности,
 * ФИО или подразделению строкой.
 */
export const EDIT_LOCK_OVERRIDE_RESOURCE_KEY =
  'lab.incoming-control.edit-lock-override'


export interface EditWindowState {
  exists: boolean

  lockedByTime: boolean
  canEdit: boolean

  createdAt: string | null
  expiresAt: string | null

  remainingSeconds:
    | number
    | null
}


export interface IncomingControlEditLocks {
  windowMinutes: number

  override: boolean

  base: EditWindowState

  protocol: EditWindowState
}


export function getEditWindowExpiresAt(
  createdAt: Date,
): Date {
  return new Date(
    createdAt.getTime() +
    INCOMING_CONTROL_EDIT_WINDOW_MS,
  )
}


export function isEditWindowExpired(
  createdAt: Date,
  now = new Date(),
): boolean {
  return (
    now.getTime() >=
    getEditWindowExpiresAt(
      createdAt,
    ).getTime()
  )
}


function buildExistingWindow(
  createdAt: Date,
  canOverride: boolean,
  now: Date,
): EditWindowState {
  const expiresAt =
    getEditWindowExpiresAt(
      createdAt,
    )

  const remainingMs =
    Math.max(
      0,
      expiresAt.getTime() -
      now.getTime(),
    )

  const lockedByTime =
    remainingMs <= 0

  return {
    exists: true,

    lockedByTime,

    canEdit:
      canOverride ||
      !lockedByTime,

    createdAt:
      createdAt.toISOString(),

    expiresAt:
      expiresAt.toISOString(),

    remainingSeconds:
      Math.ceil(
        remainingMs /
        1000,
      ),
  }
}


function buildNotCreatedProtocolWindow():
  EditWindowState {
  return {
    exists: false,

    // Протокол ещё не создан:
    // его можно создать в любой момент
    // после первого сохранения Реестра.
    lockedByTime: false,
    canEdit: true,

    createdAt: null,
    expiresAt: null,

    remainingSeconds: null,
  }
}


/**
 * Проверяем специальное право без вызова requirePermission().
 *
 * Это важно: отсутствие override — нормальная ситуация для
 * большинства сотрудников и не должно создавать DENIED-событие
 * при каждом открытии карточки.
 */
export async function hasIncomingControlEditLockOverride(
  userId: number,
): Promise<boolean> {
  const resource =
    await prisma.accessResource
      .findUnique({
        where: {
          key:
            EDIT_LOCK_OVERRIDE_RESOURCE_KEY,
        },

        select: {
          id: true,
          isActive: true,
        },
      })


  if (
    !resource ||
    !resource.isActive
  ) {
    return false
  }


  const permission =
    await prisma.userPermission
      .findFirst({
        where: {
          userId,

          resourceId:
            resource.id,

          action:
            AccessAction.UPDATE,
        },

        select: {
          id: true,
        },
      })


  return !!permission
}


export async function buildIncomingControlEditLocks(
  input: {
    userId: number

    samplingTestCreatedAt:
      Date

    protocolCreatedAt?:
      Date | null

    now?: Date
  },
): Promise<IncomingControlEditLocks> {
  const now =
    input.now ??
    new Date()

  const canOverride =
    await hasIncomingControlEditLockOverride(
      input.userId,
    )


  return {
    windowMinutes:
      INCOMING_CONTROL_EDIT_WINDOW_MINUTES,

    override:
      canOverride,

    base:
      buildExistingWindow(
        input.samplingTestCreatedAt,
        canOverride,
        now,
      ),

    protocol:
      input.protocolCreatedAt
        ? buildExistingWindow(
            input.protocolCreatedAt,
            canOverride,
            now,
          )
        : buildNotCreatedProtocolWindow(),
  }
}


export function assertBaseEditWindow(
  input: {
    changed: boolean
    createdAt: Date
    canOverride: boolean
    now?: Date
  },
): void {
  if (!input.changed) {
    return
  }


  const now =
    input.now ??
    new Date()


  if (
    !input.canOverride &&
    isEditWindowExpired(
      input.createdAt,
      now,
    )
  ) {
    throw createError({
      statusCode: 403,

      statusMessage:
        'Срок редактирования отбора проб и поступления материала истёк',

      message:
        `Редактирование разделов «Отбор проб» и «Поступление материала» доступно в течение ${INCOMING_CONTROL_EDIT_WINDOW_MINUTES} минут после создания записи.`,
    })
  }
}


export function assertProtocolEditWindow(
  input: {
    changed: boolean

    /**
     * null означает, что протокол создаётся впервые.
     * Первое создание разрешено независимо от возраста SamplingTest.
     */
    protocolCreatedAt:
      Date | null

    canOverride: boolean
    now?: Date
  },
): void {
  if (!input.changed) {
    return
  }


  // Первое создание протокола не имеет истёкшего окна:
  // окно начнётся с TestProtocol.createdAt после CREATE.
  if (!input.protocolCreatedAt) {
    return
  }


  const now =
    input.now ??
    new Date()


  if (
    !input.canOverride &&
    isEditWindowExpired(
      input.protocolCreatedAt,
      now,
    )
  ) {
    throw createError({
      statusCode: 403,

      statusMessage:
        'Срок редактирования протокола испытаний истёк',

      message:
        `Редактирование протокола доступно в течение ${INCOMING_CONTROL_EDIT_WINDOW_MINUTES} минут после его первого сохранения.`,
    })
  }
}
