// server/api/incoming-control/[id].put.ts

import fs from 'node:fs'

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
  getRouterParam,
  readMultipartFormData,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'

import {
  handleFileUpload,
} from '~~/server/utils/fileUploadHandler'

import {
  requirePermission,
} from '~~/server/services/access-control.service'

import {
  auditDataChange,
  buildCreateAuditDelta,
  computeAuditDelta,
} from '~~/server/utils/auditLog'

import {
  assertBaseChronology,
  assertFullChronology,
  assertNewProtocolComplete,
  getPayloadDates,
  parseIncomingControlPayload,
  sameBusinessDate,
} from '~~/server/services/lab/incoming-control-rules.service'

import {
  assertBaseEditWindow,
  assertProtocolEditWindow,
  hasIncomingControlEditLockOverride,
  isEditWindowExpired,
} from '~~/server/services/lab/incoming-control-edit-lock.service'


import {
  resolveIncomingControlLocation,
} from '~~/server/services/lab/incoming-control-location.service'


const RESOURCE_KEY =
  'lab.sampling-tests'


const FILE_FIELDS = [
  'samplingDocumentFile',
  'qualityDocumentFile',
  'protocolDocumentFile',
]


interface UploadFlags {
  samplingDocument: boolean
  qualityDocument: boolean
  protocolDocument: boolean
}


function hasMultipartFile(
  multipartData: any[],
  fieldName: string,
): boolean {
  return multipartData.some(
    item =>
      item?.name === fieldName &&
      !!item?.filename &&
      item?.data?.length > 0,
  )
}


function getMultipartText(
  multipartData: any[],
  fieldName: string,
): string | undefined {
  const item =
    multipartData.find(
      entry =>
        entry?.name === fieldName &&
        !entry?.filename,
    )

  return item?.data
    ?.toString(
      'utf-8',
    )
}


function cleanupDirectory(
  targetDir:
    | string
    | null,
) {
  if (!targetDir) {
    return
  }

  try {
    fs.rmSync(
      targetDir,
      {
        recursive: true,
        force: true,
      },
    )
  } catch (error) {
    console.error(
      '[incoming-control PUT] Не удалось очистить каталог загрузки:',
      error,
    )
  }
}


function normalizeText(
  value: unknown,
): string | null {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const normalized =
    String(value)
      .trim()

  return normalized || null
}


function sameText(
  left: unknown,
  right: unknown,
): boolean {
  return (
    normalizeText(left) ===
    normalizeText(right)
  )
}


function samplingAuditShape(
  value: any,
) {
  return {
    samplingActNumber:
      value.samplingActNumber,

    samplingDate:
      value.samplingDate,

    samplingDocumentPath:
      value.samplingDocumentPath,

    note:
      value.note,

    plpId:
      value.plpId,

    inspectorId:
      value.inspectorId,

    testLocationId:
      value.testLocationId,

    receiptMaterialId:
      value.receiptMaterialId,

    testProtocolId:
      value.testProtocolId,

    businessRulesVersion:
      value.businessRulesVersion,
  }
}


function receiptAuditShape(
  value: any,
) {
  return {
    receiptDate:
      value.receiptDate,

    qualityDocumentDate:
      value.qualityDocumentDate,

    qualityDocumentNumber:
      value.qualityDocumentNumber,

    qualityDocumentPath:
      value.qualityDocumentPath,

    note:
      value.note,

    materialId:
      value.materialId,

    manufacturerId:
      value.manufacturerId,
  }
}


function protocolAuditShape(
  value: any,
) {
  return {
    protocolNumber:
      value.protocolNumber,

    protocolDate:
      value.protocolDate,

    protocolDocumentPath:
      value.protocolDocumentPath,

    testResult:
      value.testResult,

    note:
      value.note,
  }
}


function detectEditIntent(
  current: any,
  payload: any,
  dates: any,
  files: UploadFlags,
) {
  const hasExistingProtocol =
    !!current.testProtocol

  const wantsProtocol =
    payload.testProtocol !==
    null

  const createsNewProtocol =
    !hasExistingProtocol &&
    wantsProtocol


  const baseDatesChanged =
    !sameBusinessDate(
      current.samplingDate,
      dates.samplingDate,
    ) ||
    !sameBusinessDate(
      current
        .receiptMaterial
        .receiptDate,
      dates.receiptDate,
    ) ||
    !sameBusinessDate(
      current
        .receiptMaterial
        .qualityDocumentDate,
      dates.qualityDocumentDate,
    )


  const baseChanged =
    baseDatesChanged ||

    files.samplingDocument ||
    files.qualityDocument ||

    !sameText(
      current.samplingActNumber,
      payload
        .samplingTest
        .samplingActNumber,
    ) ||

    !sameText(
      current.note,
      payload
        .samplingTest
        .note,
    ) ||

    !sameText(
      current.plp?.name,
      payload
        .samplingTest
        .plpName,
    ) ||

    !sameText(
      current.inspector?.name,
      payload
        .samplingTest
        .inspectorName,
    ) ||

    !sameText(
      current
        .testLocation
        ?.name,
      payload
        .samplingTest
        .testLocationName,
    ) ||

    !sameText(
      current
        .testLocation
        ?.testObject
        ?.name,
      payload
        .samplingTest
        .testObjectName,
    ) ||

    !sameText(
      current
        .receiptMaterial
        .material
        ?.name,
      payload
        .receiptMaterial
        .materialName,
    ) ||

    !sameText(
      current
        .receiptMaterial
        .manufacturer
        ?.name,
      payload
        .receiptMaterial
        .manufacturerName,
    ) ||

    !sameText(
      current
        .receiptMaterial
        .qualityDocumentNumber,
      payload
        .receiptMaterial
        .qualityDocumentNumber,
    ) ||

    !sameText(
      current
        .receiptMaterial
        .note,
      payload
        .receiptMaterial
        .note,
    )


  const protocolDateChanged =
    hasExistingProtocol &&
    wantsProtocol
      ? !sameBusinessDate(
          current
            .testProtocol
            .protocolDate,
          dates.protocolDate,
        )
      : false


  const existingProtocolChanged =
    hasExistingProtocol &&
    wantsProtocol
      ? (
          protocolDateChanged ||

          files.protocolDocument ||

          !sameText(
            current
              .testProtocol
              .protocolNumber,
            payload
              .testProtocol
              .protocolNumber,
          ) ||

          !sameText(
            current
              .testProtocol
              .testResult,
            payload
              .testProtocol
              .testResult,
          ) ||

          !sameText(
            current
              .testProtocol
              .note,
            payload
              .testProtocol
              .note,
          )
        )
      : false


  return {
    hasExistingProtocol,
    wantsProtocol,
    createsNewProtocol,

    baseDatesChanged,
    baseChanged,

    protocolDateChanged,

    protocolChanged:
      createsNewProtocol ||
      existingProtocolChanged,
  }
}


function validateBusinessRules(
  current: any,
  payload: any,
  dates: any,
  files: UploadFlags,
  canOverride: boolean,
  now = new Date(),
) {
  const intent =
    detectEditIntent(
      current,
      payload,
      dates,
      files,
    )


  if (
    intent.hasExistingProtocol &&
    !intent.wantsProtocol
  ) {
    throw createError({
      statusCode: 400,

      statusMessage:
        'Существующий протокол нельзя удалить через форму Реестра',
    })
  }


  /**
   * ДВЕ НЕЗАВИСИМЫЕ БЛОКИРОВКИ.
   *
   * Добавление НОВОГО протокола не зависит от возраста
   * SamplingTest. Его собственные 10 минут начнутся
   * только после первого сохранения TestProtocol.
   */
  assertBaseEditWindow({
    changed:
      intent.baseChanged,

    createdAt:
      current.createdAt,

    canOverride,

    now,
  })


  assertProtocolEditWindow({
    changed:
      intent.protocolChanged,

    protocolCreatedAt:
      current.testProtocol
        ?.createdAt ??
      null,

    canOverride,

    now,
  })


  if (
    intent.createsNewProtocol
  ) {
    assertNewProtocolComplete(
      payload,
      files.protocolDocument,
    )

    assertFullChronology(
      dates,
    )

  } else if (
    intent.hasExistingProtocol &&
    payload.testProtocol
  ) {
    /**
     * Старую историческую хронологию не заставляем
     * исправлять при изменении текста/примечаний.
     *
     * Но любое изменение даты переводит итоговую
     * цепочку под современные правила.
     */
    if (
      intent.baseDatesChanged ||
      intent.protocolDateChanged
    ) {
      assertFullChronology(
        dates,
      )
    }

  } else if (
    intent.baseDatesChanged
  ) {
    assertBaseChronology(
      dates,
    )
  }


  return intent
}


export default defineEventHandler(
  async event => {
    const permission =
      await requirePermission(
        event,
        RESOURCE_KEY,
        AccessAction.UPDATE,
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


    let uploadDirectory:
      string | null = null


    try {
      const multipartData =
        await readMultipartFormData(
          event,
        )


      if (!multipartData) {
        throw createError({
          statusCode: 400,

          statusMessage:
            'Данные формы не найдены',
        })
      }


      const payload =
        parseIncomingControlPayload(
          getMultipartText(
            multipartData,
            'payload',
          ),
        )


      const files: UploadFlags = {
        samplingDocument:
          hasMultipartFile(
            multipartData,
            'samplingDocumentFile',
          ),

        qualityDocument:
          hasMultipartFile(
            multipartData,
            'qualityDocumentFile',
          ),

        protocolDocument:
          hasMultipartFile(
            multipartData,
            'protocolDocumentFile',
          ),
      }


      const dates =
        getPayloadDates(
          payload,
        )


      /**
       * Читаем связи целиком, чтобы определить ФАКТИЧЕСКИЕ
       * изменения. Полный payload сам по себе не означает,
       * что пользователь изменяет все три раздела.
       */
      const before =
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


      if (!before) {
        throw createError({
          statusCode: 404,

          statusMessage:
            `Запись с ID ${id} не найдена`,
        })
      }


      const canOverride =
        await hasIncomingControlEditLockOverride(
          permission.userId,
        )


      /**
       * До сохранения файлов проверяем:
       * - временные окна;
       * - создание/удаление протокола;
       * - хронологию.
       *
       * Ошибка здесь не оставит на диске лишние файлы.
       */
      validateBusinessRules(
        before,
        payload,
        dates,
        files,
        canOverride,
      )


      const upload =
        await handleFileUpload(
          multipartData,
          {
            fileFields:
              FILE_FIELDS,
          },
        )


      uploadDirectory =
        upload.targetDir


      const samplingDocumentPath =
        upload.fileDbPaths
          .samplingDocumentFile ||
        null


      const qualityDocumentPath =
        upload.fileDbPaths
          .qualityDocumentFile ||
        null


      const protocolDocumentPath =
        upload.fileDbPaths
          .protocolDocumentFile ||
        null


      const hasAnyUploadedFile =
        !!(
          samplingDocumentPath ||
          qualityDocumentPath ||
          protocolDocumentPath
        )


      const actor =
        await prisma.user
          .findUnique({
            where: {
              id:
                permission.userId,
            },

            select: {
              email: true,
              login: true,
            },
          })


      const actorEmail =
        actor?.email ||
        actor?.login ||
        `user:${permission.userId}`


      const result =
        await prisma.$transaction(
          async tx => {
            /**
             * Повторная проверка внутри транзакции защищает
             * от ситуации, когда 10 минут закончились между
             * открытием формы и фактическим UPDATE.
             */
            const current =
              await tx.samplingTest
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
                        testObject:
                          true,
                      },
                    },

                    receiptMaterial: {
                      include: {
                        material:
                          true,

                        manufacturer:
                          true,
                      },
                    },

                    testProtocol:
                      true,
                  },
                })


            if (!current) {
              throw createError({
                statusCode: 404,

                statusMessage:
                  `Запись с ID ${id} не найдена`,
              })
            }


            const now =
              new Date()


            const intent =
              validateBusinessRules(
                current,
                payload,
                dates,
                files,
                canOverride,
                now,
              )


            const baseOverrideUsed =
              canOverride &&
              intent.baseChanged &&
              isEditWindowExpired(
                current.createdAt,
                now,
              )


            const protocolOverrideUsed =
              canOverride &&
              !!current.testProtocol &&
              intent.protocolChanged &&
              isEditWindowExpired(
                current
                  .testProtocol
                  .createdAt,
                now,
              )


            let updatedReceipt =
              current.receiptMaterial

            let updatedProtocol =
              current.testProtocol

            let updatedSamplingTest:
              any =
                current


            let plp:
              any = null

            let inspector:
              any = null

            let testLocation:
              any = null

            let material:
              any = null

            let manufacturer:
              any = null


            /**
             * Первые два раздела обновляем ТОЛЬКО если
             * они реально изменились.
             *
             * Поэтому protocol-only PUT не "трогает"
             * закрытый SamplingTest/ReceiptMaterial.
             */
            if (
              intent.baseChanged
            ) {
              const [
                foundPlp,
                foundInspector,
                testObject,
                foundMaterial,
              ] =
                await Promise.all([
                  tx.plp.findUnique({
                    where: {
                      name:
                        payload
                          .samplingTest
                          .plpName,
                    },
                  }),

                  tx.inspector.findUnique({
                    where: {
                      name:
                        payload
                          .samplingTest
                          .inspectorName,
                    },
                  }),

                  tx.testObject.findUnique({
                    where: {
                      name:
                        payload
                          .samplingTest
                          .testObjectName,
                    },
                  }),

                  tx.material.findUnique({
                    where: {
                      name:
                        payload
                          .receiptMaterial
                          .materialName,
                    },
                  }),
                ])


              if (
                !foundPlp ||
                foundPlp.deletedAt
              ) {
                throw createError({
                  statusCode: 400,

                  statusMessage:
                    `ПЛП "${payload.samplingTest.plpName}" не найден`,
                })
              }


              if (
                !foundInspector ||
                foundInspector.deletedAt
              ) {
                throw createError({
                  statusCode: 400,

                  statusMessage:
                    `Лицо "${payload.samplingTest.inspectorName}" не найдено в справочнике`,
                })
              }


              if (
                !testObject ||
                testObject.deletedAt
              ) {
                throw createError({
                  statusCode: 400,

                  statusMessage:
                    `Объект "${payload.samplingTest.testObjectName}" не найден`,
                })
              }


              if (
                !foundMaterial ||
                foundMaterial.deletedAt
              ) {
                throw createError({
                  statusCode: 400,

                  statusMessage:
                    `Материал "${payload.receiptMaterial.materialName}" не найден`,
                })
              }


              plp =
                foundPlp

              inspector =
                foundInspector

              material =
                foundMaterial


              const manufacturerName =
                payload
                  .receiptMaterial
                  .manufacturerName


              if (manufacturerName) {
                manufacturer =
                  await tx.manufacturer
                    .findUnique({
                      where: {
                        name:
                          manufacturerName,
                      },
                    })


                if (
                  !manufacturer ||
                  manufacturer.deletedAt
                ) {
                  throw createError({
                    statusCode: 400,

                    statusMessage:
                      `Производитель "${manufacturerName}" не найден`,
                  })
                }
              }


              testLocation =
                await resolveIncomingControlLocation({
                  event,

                  tx,

                  testObjectId:
                    testObject.id,

                  rawName:
                    payload
                      .samplingTest
                      .testLocationName,

                  userId:
                    permission.userId,

                  actorEmail,
                })


              updatedReceipt =
                await tx.receiptMaterial
                  .update({
                    where: {
                      id:
                        current
                          .receiptMaterialId,
                    },

                    data: {
                      receiptDate:
                        dates.receiptDate,

                      qualityDocumentDate:
                        dates
                          .qualityDocumentDate,

                      qualityDocumentNumber:
                        payload
                          .receiptMaterial
                          .qualityDocumentNumber,

                      note:
                        payload
                          .receiptMaterial
                          .note ||
                        null,

                      editorEmail:
                        actorEmail,

                      material: {
                        connect: {
                          id:
                            material.id,
                        },
                      },

                      manufacturer:
                        manufacturer
                          ? {
                              connect: {
                                id:
                                  manufacturer.id,
                              },
                            }
                          : {
                              disconnect:
                                true,
                            },

                      ...(qualityDocumentPath
                        ? {
                            qualityDocumentPath,
                          }
                        : {}),
                    },

                    /**
                     * updatedReceipt изначально получает тип
                     * current.receiptMaterial, а current загружен
                     * вместе с material + manufacturer.
                     *
                     * Поэтому результат update тоже возвращаем
                     * с теми же relation-полями.
                     */
                    include: {
                      material:
                        true,

                      manufacturer:
                        true,
                    },
                  })
            }


            const protocolWasCreated =
              intent.createsNewProtocol


            if (
              current.testProtocol &&
              payload.testProtocol &&
              intent.protocolChanged
            ) {
              updatedProtocol =
                await tx.testProtocol
                  .update({
                    where: {
                      id:
                        current
                          .testProtocol
                          .id,
                    },

                    data: {
                      protocolNumber:
                        payload
                          .testProtocol
                          .protocolNumber ||
                        null,

                      protocolDate:
                        dates.protocolDate,

                      testResult:
                        payload
                          .testProtocol
                          .testResult ||
                        null,

                      note:
                        payload
                          .testProtocol
                          .note ||
                        null,

                      editorEmail:
                        actorEmail,

                      ...(protocolDocumentPath
                        ? {
                            protocolDocumentPath,
                          }
                        : {}),
                    },
                  })

            } else if (
              intent.createsNewProtocol &&
              payload.testProtocol
            ) {
              updatedProtocol =
                await tx.testProtocol
                  .create({
                    data: {
                      protocolNumber:
                        payload
                          .testProtocol
                          .protocolNumber,

                      protocolDate:
                        dates.protocolDate,

                      protocolDocumentPath:
                        protocolDocumentPath,

                      testResult:
                        payload
                          .testProtocol
                          .testResult,

                      note:
                        payload
                          .testProtocol
                          .note ||
                        null,

                      authorEmail:
                        actorEmail,

                      editorEmail:
                        actorEmail,
                    },
                  })
            }


            /**
             * SamplingTest обновляем один раз:
             * - если изменились первые два раздела;
             * - либо если нужно привязать только что созданный протокол.
             */
            if (
              intent.baseChanged ||
              (
                protocolWasCreated &&
                updatedProtocol
              )
            ) {
              const data:
                Record<
                  string,
                  unknown
                > = {}


              if (
                intent.baseChanged
              ) {
                Object.assign(
                  data,
                  {
                    samplingActNumber:
                      payload
                        .samplingTest
                        .samplingActNumber,

                    samplingDate:
                      dates.samplingDate,

                    note:
                      payload
                        .samplingTest
                        .note ||
                      null,

                    editorEmail:
                      actorEmail,

                    plp: {
                      connect: {
                        id:
                          plp.id,
                      },
                    },

                    inspector: {
                      connect: {
                        id:
                          inspector.id,
                      },
                    },

                    testLocation: {
                      connect: {
                        id:
                          testLocation.id,
                      },
                    },

                    ...(samplingDocumentPath
                      ? {
                          samplingDocumentPath,
                        }
                      : {}),
                  },
                )
              }


              if (
                protocolWasCreated &&
                updatedProtocol
              ) {
                Object.assign(
                  data,
                  {
                    testProtocol: {
                      connect: {
                        id:
                          updatedProtocol.id,
                      },
                    },
                  },
                )
              }


              updatedSamplingTest =
                await tx.samplingTest
                  .update({
                    where: {
                      id:
                        current.id,
                    },

                    data:
                      data as any,
                  })
            }


            const samplingChanges =
              computeAuditDelta(
                samplingAuditShape(
                  current,
                ),

                samplingAuditShape(
                  updatedSamplingTest,
                ),
              )


            const receiptChanges =
              computeAuditDelta(
                receiptAuditShape(
                  current
                    .receiptMaterial,
                ),

                receiptAuditShape(
                  updatedReceipt,
                ),
              )


            if (
              Object.keys(
                samplingChanges,
              ).length > 0
            ) {
              await auditDataChange({
                event,

                db:
                  tx,

                resourceKey:
                  RESOURCE_KEY,

                entityType:
                  'SamplingTest',

                entityId:
                  current.id,

                action:
                  'UPDATE',

                note:
                  baseOverrideUsed
                    ? 'Изменена запись Реестра входного контроля с административным обходом временной блокировки'
                    : 'Изменена запись Реестра входного контроля',

                changes:
                  samplingChanges,

                actorEmail,
              })
            }


            if (
              Object.keys(
                receiptChanges,
              ).length > 0
            ) {
              await auditDataChange({
                event,

                db:
                  tx,

                resourceKey:
                  RESOURCE_KEY,

                entityType:
                  'ReceiptMaterial',

                entityId:
                  updatedReceipt.id,

                action:
                  'UPDATE',

                note:
                  baseOverrideUsed
                    ? 'Изменено поступление материала с административным обходом временной блокировки'
                    : 'Изменено поступление материала',

                changes:
                  receiptChanges,

                actorEmail,
              })
            }


            if (
              protocolWasCreated &&
              updatedProtocol
            ) {
              await auditDataChange({
                event,

                db:
                  tx,

                resourceKey:
                  RESOURCE_KEY,

                entityType:
                  'TestProtocol',

                entityId:
                  updatedProtocol.id,

                action:
                  'CREATE',

                note:
                  'Создан протокол испытаний',

                changes:
                  buildCreateAuditDelta(
                    protocolAuditShape(
                      updatedProtocol,
                    ),

                    [
                      'protocolNumber',
                      'protocolDate',
                      'protocolDocumentPath',
                      'testResult',
                      'note',
                    ],
                  ),

                actorEmail,
              })

            } else if (
              current.testProtocol &&
              updatedProtocol &&
              intent.protocolChanged
            ) {
              const protocolChanges =
                computeAuditDelta(
                  protocolAuditShape(
                    current
                      .testProtocol,
                  ),

                  protocolAuditShape(
                    updatedProtocol,
                  ),
                )


              if (
                Object.keys(
                  protocolChanges,
                ).length > 0
              ) {
                await auditDataChange({
                  event,

                  db:
                    tx,

                  resourceKey:
                    RESOURCE_KEY,

                  entityType:
                    'TestProtocol',

                  entityId:
                    updatedProtocol.id,

                  action:
                    'UPDATE',

                  note:
                    protocolOverrideUsed
                      ? 'Изменён протокол испытаний с административным обходом временной блокировки'
                      : 'Изменён протокол испытаний',

                  changes:
                    protocolChanges,

                  actorEmail,
                })
              }
            }


            return await tx.samplingTest
              .findUnique({
                where: {
                  id:
                    current.id,
                },

                include: {
                  plp: true,
                  inspector: true,

                  testLocation: {
                    include: {
                      testObject:
                        true,
                    },
                  },

                  receiptMaterial: {
                    include: {
                      material:
                        true,

                      manufacturer:
                        true,
                    },
                  },

                  testProtocol:
                    true,
                },
              })
          },

          {
            maxWait:
              5_000,

            timeout:
              15_000,
          },
        )


      /**
       * handleFileUpload может создать каталог даже без файлов.
       */
      if (!hasAnyUploadedFile) {
        cleanupDirectory(
          uploadDirectory,
        )

        uploadDirectory = null
      }


      return {
        success: true,

        data:
          result,

        message:
          'Запись успешно обновлена',
      }

    } catch (error: any) {
      cleanupDirectory(
        uploadDirectory,
      )


      if (error?.statusCode) {
        throw error
      }


      console.error(
        `[incoming-control PUT ${id}] Ошибка:`,
        error,
      )


      throw createError({
        statusCode: 500,

        statusMessage:
          'Ошибка при обновлении записи Реестра',

        data:
          error instanceof Error
            ? error.message
            : undefined,
      })
    }
  },
)
