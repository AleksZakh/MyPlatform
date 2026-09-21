// server/api/admin/departments/[id]/permissions.get.ts

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


const VIEW_RESOURCE_KEY =
  'admin.users'


function parseDepartmentId(
  raw:
    string | undefined,
): number {
  const text =
    raw ?? ''

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
      statusCode:
        400,

      statusMessage:
        'INVALID_DEPARTMENT_ID',

      data: {
        code:
          'INVALID_DEPARTMENT_ID',

        message:
          'Некорректный ID подразделения.',
      },
    })
  }

  return id
}


export default defineEventHandler(
  async event => {
    await requirePermission(
      event,
      VIEW_RESOURCE_KEY,
      AccessAction.VIEW,
    )


    const departmentId =
      parseDepartmentId(
        getRouterParam(
          event,
          'id',
        ),
      )


    const department =
      await prisma.department
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

            key:
              true,

            name:
              true,

            permissions: {
              select: {
                id:
                  true,

                resourceId:
                  true,

                action:
                  true,

                grantedByLogin:
                  true,

                createdAt:
                  true,

                updatedAt:
                  true,
              },
            },
          },
        })


    if (!department) {
      throw createError({
        statusCode:
          404,

        statusMessage:
          'DEPARTMENT_NOT_FOUND',

        data: {
          code:
            'DEPARTMENT_NOT_FOUND',

          message:
            'Активное подразделение Space не найдено.',
        },
      })
    }


    const resources =
      await prisma.accessResource
        .findMany({
          where: {
            isActive:
              true,
          },

          orderBy: [
            {
              sortOrder:
                'asc',
            },
            {
              name:
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

            key:
              true,

            name:
              true,

            description:
              true,

            type:
              true,

            sortOrder:
              true,

            departments: {
              select: {
                isOwner:
                  true,

                department: {
                  select: {
                    id:
                      true,

                    key:
                      true,

                    name:
                      true,
                  },
                },
              },
            },
          },
        })


    const permissionMap =
      new Map(
        department.permissions
          .map(
            permission => [
              `${permission.resourceId}:${permission.action}`,
              permission,
            ],
          ),
      )


    const actions = [
      AccessAction.VIEW,
      AccessAction.CREATE,
      AccessAction.UPDATE,
      AccessAction.DELETE,
    ]


    const data =
      resources.map(
        resource => ({
          id:
            resource.id,

          key:
            resource.key,

          name:
            resource.name,

          description:
            resource.description,

          type:
            resource.type,

          sortOrder:
            resource.sortOrder,

          ownership:
            resource.departments
              .map(
                item => ({
                  departmentId:
                    item.department.id,

                  departmentKey:
                    item.department.key,

                  departmentName:
                    item.department.name,

                  isOwner:
                    item.isOwner,
                }),
              ),

          actions:
            Object.fromEntries(
              actions.map(
                action => {
                  const permission =
                    permissionMap.get(
                      `${resource.id}:${action}`,
                    )

                  return [
                    action,
                    {
                      granted:
                        !!permission,

                      permissionId:
                        permission?.id ??
                        null,

                      grantedByLogin:
                        permission
                          ?.grantedByLogin ??
                        null,

                      createdAt:
                        permission
                          ?.createdAt ??
                        null,

                      updatedAt:
                        permission
                          ?.updatedAt ??
                        null,
                    },
                  ]
                },
              ),
            ),
        }),
      )


    return {
      success:
        true,

      department: {
        id:
          department.id,

        key:
          department.key,

        name:
          department.name,
      },

      actions,

      data,

      summary: {
        totalResources:
          data.length,

        resourcesWithAnyPermission:
          data.filter(
            resource =>
              Object.values(
                resource.actions,
              )
                .some(
                  permission =>
                    permission.granted,
                ),
          )
            .length,

        grantedPermissionsCount:
          department.permissions
            .length,
      },
    }
  },
)
