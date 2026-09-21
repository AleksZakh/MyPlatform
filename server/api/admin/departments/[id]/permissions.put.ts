// server/api/admin/departments/[id]/permissions.put.ts

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
  getRouterParam,
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
  'admin.department-permissions'


const ALLOWED_ACTIONS =
  new Set<AccessAction>([
    AccessAction.VIEW,
    AccessAction.CREATE,
    AccessAction.UPDATE,
    AccessAction.DELETE,
  ])


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


function parsePositiveId(
  value:
    unknown,

  code:
    string,

  message:
    string,
): number {
  const text =
    String(
      value ?? '',
    )

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
    reject(
      400,
      code,
      message,
    )
  }

  return id
}


interface PermissionBody {
  resourceId:
    number

  action:
    AccessAction

  granted:
    boolean
}


function parseBody(
  value:
    unknown,
): PermissionBody {
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
      'INVALID_DEPARTMENT_PERMISSION_BODY',
      'Ожидается объект с данными права.',
    )
  }


  const body =
    value as
      Record<
        string,
        unknown
      >


  const resourceId =
    parsePositiveId(
      body.resourceId,
      'INVALID_RESOURCE_ID',
      'Некорректный ID ресурса.',
    )


  if (
    typeof body.action !==
      'string' ||
    !ALLOWED_ACTIONS.has(
      body.action as
        AccessAction,
    )
  ) {
    reject(
      400,
      'INVALID_ACCESS_ACTION',
      'Некорректное действие доступа.',
    )
  }


  if (
    typeof body.granted !==
      'boolean'
  ) {
    reject(
      400,
      'INVALID_GRANTED_FLAG',
      'Поле granted должно быть boolean.',
    )
  }


  return {
    resourceId,

    action:
      body.action as
        AccessAction,

    granted:
      body.granted,
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


    const departmentId =
      parsePositiveId(
        getRouterParam(
          event,
          'id',
        ),
        'INVALID_DEPARTMENT_ID',
        'Некорректный ID подразделения.',
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


    const actorLogin =
      actor?.login ??
      null

    const actorEmail =
      actor?.email ||
      actor?.login ||
      `user:${permission.userId}`


    return prisma.$transaction(
      async tx => {
        const [
          department,
          resource,
        ] =
          await Promise.all([
            tx.department
              .findFirst({
                where: {
                  id:
                    departmentId,

                  isActive:
                    true,
                },

                select: {
                  id:
                    true,

                  name:
                    true,
                },
              }),

            tx.accessResource
              .findFirst({
                where: {
                  id:
                    input.resourceId,

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
              }),
          ])


        if (!department) {
          reject(
            404,
            'DEPARTMENT_NOT_FOUND',
            'Активное подразделение Space не найдено.',
          )
        }


        if (!resource) {
          reject(
            404,
            'ACCESS_RESOURCE_NOT_FOUND',
            'Активный ресурс доступа не найден.',
          )
        }


        const existing =
          await tx
            .departmentPermission
            .findUnique({
              where: {
                departmentId_resourceId_action: {
                  departmentId:
                    department.id,

                  resourceId:
                    resource.id,

                  action:
                    input.action,
                },
              },
            })


        if (
          input.granted &&
          !existing
        ) {
          const created =
            await tx
              .departmentPermission
              .create({
                data: {
                  departmentId:
                    department.id,

                  resourceId:
                    resource.id,

                  action:
                    input.action,

                  grantedByLogin:
                    actorLogin,
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
              'CREATE',

            resourceKey:
              RESOURCE_KEY,

            entityType:
              'DepartmentPermission',

            entityId:
              created.id,

            actorUserId:
              permission.userId,

            actorLogin,

            actorEmail,

            actorAuthType:
              actor?.authType ??
              null,

            note:
              `Подразделению «${department.name}» выдано право ${input.action} на ресурс «${resource.name}».`,

            changes: {
              granted: {
                before:
                  false,

                after:
                  true,
              },

              departmentId: {
                before:
                  null,

                after:
                  department.id,
              },

              resourceId: {
                before:
                  null,

                after:
                  resource.id,
              },

              action: {
                before:
                  null,

                after:
                  input.action,
              },
            },
          })


          return {
            success:
              true,

            granted:
              true,

            permissionId:
              created.id,

            message:
              'Право подразделения выдано.',
          }
        }


        if (
          !input.granted &&
          existing
        ) {
          await tx
            .departmentPermission
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
              'DepartmentPermission',

            entityId:
              existing.id,

            actorUserId:
              permission.userId,

            actorLogin,

            actorEmail,

            actorAuthType:
              actor?.authType ??
              null,

            note:
              `У подразделения «${department.name}» отозвано право ${input.action} на ресурс «${resource.name}».`,

            changes: {
              granted: {
                before:
                  true,

                after:
                  false,
              },
            },
          })


          return {
            success:
              true,

            granted:
              false,

            permissionId:
              null,

            message:
              'Право подразделения отозвано.',
          }
        }


        return {
          success:
            true,

          granted:
            input.granted,

          permissionId:
            existing?.id ??
            null,

          message:
            input.granted
              ? 'Право уже было выдано.'
              : 'Право уже отсутствовало.',
        }
      },
    )
  },
)
