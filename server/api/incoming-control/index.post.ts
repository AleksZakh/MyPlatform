// server/api/incoming-control/index.post.ts

import fs from 'node:fs'

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
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
} from '~~/server/utils/auditLog'

import {
  assertBaseChronology,
  getPayloadDates,
  parseIncomingControlPayload,
} from '~~/server/services/lab/incoming-control-rules.service'


const RESOURCE_KEY =
  'lab.sampling-tests'


const FILE_FIELDS = [
  'samplingDocumentFile',
  'qualityDocumentFile',
  'protocolDocumentFile',
]


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
      '[incoming-control POST] Не удалось очистить временный каталог загрузки:',
      error,
    )
  }
}


export default defineEventHandler(
  async event => {
    const permission =
      await requirePermission(
        event,
        RESOURCE_KEY,
        AccessAction.CREATE,
      )


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


      // Сначала валидируем DTO.
      // Файлы на диск ещё НЕ записываем.
      const payload =
        parseIncomingControlPayload(
          getMultipartText(
            multipartData,
            'payload',
          ),
        )


      const hasSamplingDocument =
        hasMultipartFile(
          multipartData,
          'samplingDocumentFile',
        )


      const hasProtocolDocument =
        hasMultipartFile(
          multipartData,
          'protocolDocumentFile',
        )


      if (!hasSamplingDocument) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Для новой записи обязателен документ отбора проб',
        })
      }


      /**
       * Главное правило CREATE:
       * протокол на первом сохранении существовать не может.
       */
      if (
        payload.testProtocol !== null ||
        hasProtocolDocument
      ) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Протокол испытаний нельзя создавать одновременно с записью Реестра',
        })
      }


      const dates =
        getPayloadDates(
          payload,
        )


      assertBaseChronology(
        dates,
      )


      // DTO валиден — теперь сохраняем файлы.
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


      if (!samplingDocumentPath) {
        throw createError({
          statusCode: 400,
          statusMessage:
            'Не удалось сохранить документ отбора проб',
        })
      }


      const actor =
        await prisma.user.findUnique({
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
            const [
              plp,
              inspector,
              testObject,
              material,
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


            if (!plp || plp.deletedAt) {
              throw createError({
                statusCode: 400,
                statusMessage:
                  `ПЛП "${payload.samplingTest.plpName}" не найден`,
              })
            }


            if (
              !inspector ||
              inspector.deletedAt
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
              !material ||
              material.deletedAt
            ) {
              throw createError({
                statusCode: 400,
                statusMessage:
                  `Материал "${payload.receiptMaterial.materialName}" не найден`,
              })
            }


            let manufacturer:
              Awaited<
                ReturnType<
                  typeof tx.manufacturer.findUnique
                >
              > =
                null


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


            const testLocation =
              await tx.testLocation
                .upsert({
                  where: {
                    testObjectId_name: {
                      testObjectId:
                        testObject.id,

                      name:
                        payload
                          .samplingTest
                          .testLocationName,
                    },
                  },

                  update: {
                    deletedAt: null,
                    deletedBy: null,
                    editorEmail:
                      actorEmail,
                  },

                  create: {
                    name:
                      payload
                        .samplingTest
                        .testLocationName,

                    testObject: {
                      connect: {
                        id:
                          testObject.id,
                      },
                    },

                    authorEmail:
                      actorEmail,
                  },
                })


            const created =
              await tx.samplingTest
                .create({
                  data: {
                    samplingActNumber:
                      payload
                        .samplingTest
                        .samplingActNumber,

                    samplingDate:
                      dates.samplingDate,

                    samplingDocumentPath,

                    note:
                      payload
                        .samplingTest
                        .note ||
                      null,

                    businessRulesVersion:
                      1,

                    authorEmail:
                      actorEmail,

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


                    receiptMaterial: {
                      create: {
                        receiptDate:
                          dates.receiptDate,

                        qualityDocumentDate:
                          dates
                            .qualityDocumentDate,

                        qualityDocumentNumber:
                          payload
                            .receiptMaterial
                            .qualityDocumentNumber,

                        qualityDocumentPath,

                        note:
                          payload
                            .receiptMaterial
                            .note ||
                          null,

                        authorEmail:
                          actorEmail,

                        editorEmail:
                          actorEmail,

                        material: {
                          connect: {
                            id:
                              material.id,
                          },
                        },

                        ...(manufacturer
                          ? {
                              manufacturer: {
                                connect: {
                                  id:
                                    manufacturer.id,
                                },
                              },
                            }
                          : {}),
                      },
                    },
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


            await auditDataChange({
              event,
              db:
                tx,

              resourceKey:
                RESOURCE_KEY,

              entityType:
                'SamplingTest',

              entityId:
                created.id,

              action:
                'CREATE',

              note:
                'Создана запись Реестра входного контроля',

              changes:
                buildCreateAuditDelta(
                  created as
                    unknown as
                    Record<
                      string,
                      unknown
                    >,

                  [
                    'samplingActNumber',
                    'samplingDate',
                    'samplingDocumentPath',
                    'note',
                    'plpId',
                    'inspectorId',
                    'testLocationId',
                    'receiptMaterialId',
                    'businessRulesVersion',
                  ],
                ),

              actorEmail,
            })


            await auditDataChange({
              event,
              db:
                tx,

              resourceKey:
                RESOURCE_KEY,

              entityType:
                'ReceiptMaterial',

              entityId:
                created
                  .receiptMaterial
                  .id,

              action:
                'CREATE',

              note:
                'Создано поступление материала',

              changes:
                buildCreateAuditDelta(
                  created
                    .receiptMaterial as
                    unknown as
                    Record<
                      string,
                      unknown
                    >,

                  [
                    'receiptDate',
                    'qualityDocumentDate',
                    'qualityDocumentNumber',
                    'qualityDocumentPath',
                    'note',
                    'materialId',
                    'manufacturerId',
                  ],
                ),

              actorEmail,
            })


            return created
          },

          {
            maxWait: 5_000,
            timeout: 15_000,
          },
        )


      return {
        success: true,
        data:
          result,

        message:
          'Запись успешно создана',
      }

    } catch (error: any) {
      /**
       * Если БД отклонила операцию,
       * новые файлы не должны оставаться сиротами.
       */
      cleanupDirectory(
        uploadDirectory,
      )


      if (error?.statusCode) {
        throw error
      }


      console.error(
        '[incoming-control POST] Ошибка:',
        error,
      )


      throw createError({
        statusCode: 500,
        statusMessage:
          'Ошибка при создании записи Реестра',

        data:
          error instanceof Error
            ? error.message
            : undefined,
      })
    }
  },
)
