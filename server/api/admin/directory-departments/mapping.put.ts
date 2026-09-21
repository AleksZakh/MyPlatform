// server/api/admin/directory-departments/mapping.put.ts

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
  readBody,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'

import {
  requirePermission,
} from '~~/server/services/access-control.service'

import {
  writeAuditEvent,
} from '~~/server/utils/auditLog'


const RESOURCE_KEY =
  'admin.department-mapping'


interface MappingBody {
  directoryName:
    string

  departmentId:
    number | null
}


function reject(
  statusCode:
    number,

  code:
    string,

  message:
    string,
): never {
  throw createError({
    statusCode,
    statusMessage:
      code,

    data: {
      code,
      message,
    },
  })
}


function parseBody(
  value:
    unknown,
): MappingBody {
  if (
    typeof value !==
      'object' ||
    value === null ||
    Array.isArray(
      value,
    )
  ) {
    reject(
      400,
      'INVALID_DEPARTMENT_MAPPING_BODY',
      'Ожидается объект с данными сопоставления.',
    )
  }


  const body =
    value as
      Record<
        string,
        unknown
      >


  if (
    typeof body.directoryName !==
      'string'
  ) {
    reject(
      400,
      'INVALID_DIRECTORY_DEPARTMENT_NAME',
      'Название подразделения Active Directory обязательно.',
    )
  }


  const directoryName =
    body.directoryName
      .normalize('NFC')
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()


  if (
    !directoryName ||
    directoryName.length >
      255 ||
    directoryName.includes(
      '\u0000',
    )
  ) {
    reject(
      400,
      'INVALID_DIRECTORY_DEPARTMENT_NAME',
      'Некорректное название подразделения Active Directory.',
    )
  }


  if (
    body.departmentId ===
      null
  ) {
    return {
      directoryName,
      departmentId:
        null,
    }
  }


  const departmentId =
    Number(
      body.departmentId,
    )


  if (
    !Number.isSafeInteger(
      departmentId,
    ) ||
    departmentId <= 0 ||
    departmentId >
      2_147_483_647
  ) {
    reject(
      400,
      'INVALID_SPACE_DEPARTMENT_ID',
      'Некорректный ID подразделения Space.',
    )
  }


  return {
    directoryName,
    departmentId,
  }
}


export default defineEventHandler(
  async event => {
    const permission =
      await requirePermission(
        event,
        RESOURCE_KEY,
        AccessAction.UPDATE,
      )


    const input =
      parseBody(
        await readBody<unknown>(
          event,
        ),
      )


    const actor =
      await prisma.user
        .findUnique({
          where: {
            id:
              permission.userId,
          },

          select: {
            login:
              true,

            email:
              true,

            authType:
              true,
          },
        })


    const actorEmail =
      actor?.email ||
      actor?.login ||
      `user:${permission.userId}`


    return prisma.$transaction(
      async tx => {
        const existing =
          await tx
            .directoryDepartmentMapping
            .findUnique({
              where: {
                directoryName:
                  input.directoryName,
              },

              include: {
                department:
                  true,
              },
            })


        if (
          input.departmentId ===
            null
        ) {
          if (!existing) {
            return {
              success:
                true,

              mapping:
                null,

              message:
                'Сопоставление уже отсутствует.',
            }
          }


          await tx
            .directoryDepartmentMapping
            .delete({
              where: {
                id:
                  existing.id,
              },
            })


          await writeAuditEvent({
            event,

            db:
              tx,

            category:
              'ADMIN',

            result:
              'SUCCESS',

            action:
              'DELETE',

            resourceKey:
              RESOURCE_KEY,

            entityType:
              'DirectoryDepartmentMapping',

            entityId:
              existing.id,

            actorUserId:
              permission.userId,

            actorLogin:
              actor?.login ??
              null,

            actorEmail,

            actorAuthType:
              actor?.authType ??
              null,

            note:
              `Удалено сопоставление AD-подразделения «${input.directoryName}».`,

            changes: {
              departmentId: {
                before:
                  existing.departmentId,

                after:
                  null,
              },
            },
          })


          return {
            success:
              true,

            mapping:
              null,

            message:
              'Сопоставление удалено.',
          }
        }


        const department =
          await tx.department
            .findFirst({
              where: {
                id:
                  input.departmentId,

                isActive:
                  true,
              },

              select: {
                id:
                  true,

                key:
                  true,

                name:
                  true,
              },
            })


        if (!department) {
          reject(
            404,
            'SPACE_DEPARTMENT_NOT_FOUND',
            'Активное подразделение Space не найдено.',
          )
        }


        const saved =
          await tx
            .directoryDepartmentMapping
            .upsert({
              where: {
                directoryName:
                  input.directoryName,
              },

              update: {
                departmentId:
                  department.id,
              },

              create: {
                directoryName:
                  input.directoryName,

                departmentId:
                  department.id,
              },

              include: {
                department: {
                  select: {
                    id:
                      true,

                    key:
                      true,

                    name:
                      true,

                    isActive:
                      true,
                  },
                },
              },
            })


        await writeAuditEvent({
          event,

          db:
            tx,

          category:
            'ADMIN',

          result:
            'SUCCESS',

          action:
            existing
              ? 'UPDATE'
              : 'CREATE',

          resourceKey:
            RESOURCE_KEY,

          entityType:
            'DirectoryDepartmentMapping',

          entityId:
            saved.id,

          actorUserId:
            permission.userId,

          actorLogin:
            actor?.login ??
            null,

          actorEmail,

          actorAuthType:
            actor?.authType ??
            null,

          note:
            `AD-подразделение «${input.directoryName}» сопоставлено с «${department.name}».`,

          changes: {
            departmentId: {
              before:
                existing
                  ?.departmentId ??
                null,

              after:
                department.id,
            },
          },
        })


        return {
          success:
            true,

          mapping:
            saved,

          message:
            `Сопоставлено с подразделением «${department.name}».`,
        }
      },
    )
  },
)
