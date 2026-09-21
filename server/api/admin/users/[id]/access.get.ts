// server/api/admin/users/[id]/access.get.ts

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


const RESOURCE_KEY =
  'admin.users'


function parseUserId(
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
      statusCode: 400,

      statusMessage:
        'Некорректный ID пользователя',

      data: {
        code:
          'INVALID_ADMIN_USER_ID',

        message:
          'Некорректный ID пользователя.',
      },
    })
  }

  return id
}


export default defineEventHandler(
  async event => {
    await requirePermission(
      event,
      RESOURCE_KEY,
      AccessAction.VIEW,
    )


    const userId =
      parseUserId(
        getRouterParam(
          event,
          'id',
        ),
      )


    try {
      const user =
        await prisma.user
          .findUnique({
            where: {
              id:
                userId,
            },

            select: {
              id:
                true,

              authType:
                true,

              status:
                true,

              login:
                true,

              email:
                true,

              fullName:
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

              permissions: {
                select: {
                  id:
                    true,

                  action:
                    true,

                  resourceId:
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


      if (!user) {
        throw createError({
          statusCode: 404,

          statusMessage:
            'Пользователь не найден',

          data: {
            code:
              'ADMIN_USER_NOT_FOUND',

            message:
              'Пользователь Space не найден.',
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
                orderBy: [
                  {
                    isOwner:
                      'desc',
                  },
                  {
                    department: {
                      sortOrder:
                        'asc',
                    },
                  },
                  {
                    department: {
                      name:
                        'asc',
                    },
                  },
                ],

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
        new Map<
          string,
          typeof user.permissions[number]
        >()


      for (
        const permission
        of user.permissions
      ) {
        permissionMap.set(
          `${permission.resourceId}:${permission.action}`,
          permission,
        )
      }


      const actions =
        [
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

            departments:
              resource.departments
                .map(
                  item => ({
                    id:
                      item.department.id,

                    key:
                      item.department.key,

                    name:
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


      const grantedPermissionsCount =
        user.permissions.length


      const resourcesWithAnyPermission =
        data.filter(
          resource =>
            Object.values(
              resource.actions,
            )
              .some(
                action =>
                  action.granted,
              ),
        )
          .length


      return {
        success: true,

        user: {
          id:
            user.id,

          authType:
            user.authType,

          status:
            user.status,

          login:
            user.login,

          email:
            user.email,

          fullName:
            user.fullName,

          department:
            user.department,
        },

        actions,

        data,

        summary: {
          totalResources:
            data.length,

          resourcesWithAnyPermission,

          grantedPermissionsCount,
        },
      }

    } catch (error: any) {
      if (
        error?.statusCode
      ) {
        throw error
      }

      console.error(
        `[admin/users/${userId}/access GET] Ошибка:`,
        error,
      )

      throw createError({
        statusCode: 500,

        statusMessage:
          'Не удалось загрузить права пользователя',

        data: {
          code:
            'ADMIN_USER_ACCESS_LOAD_FAILED',

          message:
            'Не удалось загрузить матрицу прав пользователя.',
        },
      })
    }
  },
)
