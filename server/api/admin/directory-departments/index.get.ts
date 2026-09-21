// server/api/admin/directory-departments/index.get.ts

import {
  AccessAction,
  UserAuthType,
} from '@prisma/client'

import {
  defineEventHandler,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'

import {
  requirePermission,
} from '~~/server/services/access-control.service'

import {
  adCache,
} from '~~/server/utils/adCache'


const RESOURCE_KEY =
  'admin.users'


interface DirectoryCacheUser {
  directoryObjectId?: unknown
  login?: unknown
  userPrincipalName?: unknown
  fullName?: unknown
  email?: unknown
  department?: unknown
  position?: unknown
  telephoneNumber?: unknown
  distinguishedName?: unknown
  userAccountControl?: unknown
  accountDisabled?: unknown

  sAMAccountName?: unknown
  cn?: unknown
  displayName?: unknown
  mail?: unknown
  title?: unknown
  dn?: unknown

  [key: string]:
    unknown
}


function text(
  value:
    unknown,
): string | null {
  if (
    typeof value !==
      'string'
  ) {
    return null
  }

  const normalized =
    value
      .normalize('NFC')
      .replace(
        /\s+/g,
        ' ',
      )
      .trim()

  return normalized ||
    null
}


function normalizeLogin(
  value:
    unknown,
): string | null {
  const raw =
    text(value)

  if (!raw) {
    return null
  }

  const withoutDomain =
    raw.includes('\\')
      ? raw.split('\\')
        .at(-1) ?? raw
      : raw

  return (
    withoutDomain
      .split('@')[0]
      ?.trim()
      .toLowerCase() ||
    null
  )
}


function normalizeEmail(
  value:
    unknown,
): string | null {
  return (
    text(value)
      ?.toLowerCase() ??
    null
  )
}


function integer(
  value:
    unknown,
): number | null {
  if (
    typeof value ===
      'number' &&
    Number.isFinite(
      value,
    )
  ) {
    return Math.trunc(
      value,
    )
  }

  if (
    typeof value ===
      'string' &&
    /^\d+$/.test(
      value.trim(),
    )
  ) {
    const parsed =
      Number(value)

    return Number.isSafeInteger(
      parsed,
    )
      ? parsed
      : null
  }

  return null
}


function boolean(
  value:
    unknown,
): boolean | null {
  if (
    typeof value ===
      'boolean'
  ) {
    return value
  }

  if (
    value === 1 ||
    value === '1' ||
    value === 'true'
  ) {
    return true
  }

  if (
    value === 0 ||
    value === '0' ||
    value === 'false'
  ) {
    return false
  }

  return null
}


function directoryUser(
  raw:
    DirectoryCacheUser,
) {
  const login =
    normalizeLogin(
      raw.login ??
      raw.sAMAccountName,
    )

  if (!login) {
    return null
  }

  const uac =
    integer(
      raw.userAccountControl,
    )

  const explicitDisabled =
    boolean(
      raw.accountDisabled,
    )

  const accountDisabled =
    explicitDisabled ??
    (
      uac !== null
        ? (
            uac &
            0x0002
          ) !== 0
        : false
    )

  return {
    directoryObjectId:
      text(
        raw.directoryObjectId,
      ),

    login,

    fullName:
      text(
        raw.fullName ??
        raw.displayName ??
        raw.cn,
      ) ??
      login,

    email:
      normalizeEmail(
        raw.email ??
        raw.mail,
      ),

    department:
      text(
        raw.department,
      ),

    position:
      text(
        raw.position ??
        raw.title,
      ),

    accountDisabled,
  }
}


export default defineEventHandler(
  async event => {
    await requirePermission(
      event,
      RESOURCE_KEY,
      AccessAction.VIEW,
    )


    const [
      cache,
      mappings,
      appDomainUsers,
      spaceDepartments,
    ] =
      await Promise.all([
        adCache.get(),

        prisma.directoryDepartmentMapping
          .findMany({
            orderBy: {
              directoryName:
                'asc',
            },

            select: {
              id:
                true,

              directoryName:
                true,

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
          }),

        prisma.user
          .findMany({
            where: {
              authType:
                UserAuthType.DOMAIN,
            },

            select: {
              id:
                true,

              login:
                true,

              email:
                true,

              directoryObjectId:
                true,

              status:
                true,

              departmentId:
                true,
            },
          }),

        prisma.department
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
            ],

            select: {
              id:
                true,

              key:
                true,

              name:
                true,

              sortOrder:
                true,
            },
          }),
      ])


    const normalizedUsers =
      (
        cache?.users ??
        []
      )
        .map(
          user =>
            directoryUser(
              user as
                DirectoryCacheUser,
            ),
        )
        .filter(
          (
            user,
          ): user is
            NonNullable<
              ReturnType<
                typeof directoryUser
              >
            > =>
            user !== null,
        )


    const appByDirectoryId =
      new Map<
        string,
        typeof appDomainUsers[number]
      >()

    const appByLogin =
      new Map<
        string,
        typeof appDomainUsers[number]
      >()

    const appByEmail =
      new Map<
        string,
        typeof appDomainUsers[number]
      >()


    for (
      const user
      of appDomainUsers
    ) {
      if (
        user.directoryObjectId
      ) {
        appByDirectoryId.set(
          user.directoryObjectId,
          user,
        )
      }

      const login =
        normalizeLogin(
          user.login,
        )

      if (login) {
        appByLogin.set(
          login,
          user,
        )
      }

      const email =
        normalizeEmail(
          user.email,
        )

      if (email) {
        appByEmail.set(
          email,
          user,
        )
      }
    }


    const mappingByName =
      new Map(
        mappings.map(
          mapping => [
            mapping.directoryName,
            mapping,
          ],
        ),
      )


    const groups =
      new Map<
        string,
        {
          name: string
          users: Array<{
            login: string
            fullName: string
            email: string | null
            position: string | null
            accountDisabled: boolean
            appUser: {
              id: number
              status: string
              departmentId: number | null
            } | null
          }>
        }
      >()


    let usersWithoutDepartment =
      0


    for (
      const user
      of normalizedUsers
    ) {
      if (
        !user.department
      ) {
        usersWithoutDepartment++

        continue
      }


      const group =
        groups.get(
          user.department,
        ) ??
        {
          name:
            user.department,

          users:
            [],
        }


      const appUser =
        (
          user.directoryObjectId
            ? appByDirectoryId.get(
                user.directoryObjectId,
              )
            : undefined
        ) ??
        appByLogin.get(
          user.login,
        ) ??
        (
          user.email
            ? appByEmail.get(
                user.email,
              )
            : undefined
        ) ??
        null


      group.users.push({
        login:
          user.login,

        fullName:
          user.fullName,

        email:
          user.email,

        position:
          user.position,

        accountDisabled:
          user.accountDisabled,

        appUser:
          appUser
            ? {
                id:
                  appUser.id,

                status:
                  appUser.status,

                departmentId:
                  appUser.departmentId,
              }
            : null,
      })


      groups.set(
        user.department,
        group,
      )
    }


    const directoryDepartments =
      [
        ...groups.values(),
      ]
        .map(
          group => {
            const mapping =
              mappingByName.get(
                group.name,
              ) ??
              null

            const registeredCount =
              group.users.filter(
                user =>
                  user.appUser !==
                  null,
              )
                .length

            const disabledCount =
              group.users.filter(
                user =>
                  user.accountDisabled,
              )
                .length

            const members =
              [...group.users]
                .sort(
                  (
                    a,
                    b,
                  ) =>
                    a.fullName
                      .localeCompare(
                        b.fullName,
                        'ru',
                      ),
                )

            return {
              directoryName:
                group.name,

              usersCount:
                members.length,

              registeredCount,

              notRegisteredCount:
                members.length -
                registeredCount,

              disabledCount,

              mapping:
                mapping
                  ? {
                      id:
                        mapping.id,

                      department: {
                        id:
                          mapping
                            .department
                            .id,

                        key:
                          mapping
                            .department
                            .key,

                        name:
                          mapping
                            .department
                            .name,

                        isActive:
                          mapping
                            .department
                            .isActive,
                      },
                    }
                  : null,

              members,
            }
          },
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.directoryName
              .localeCompare(
                b.directoryName,
                'ru',
              ),
        )


    return {
      success:
        true,

      directoryCache: {
        available:
          !!cache,

        lastUpdated:
          cache?.lastUpdated ??
          null,

        totalCount:
          cache?.totalCount ??
          normalizedUsers.length,

        normalizedCount:
          normalizedUsers.length,
      },

      summary: {
        directoryDepartmentsCount:
          directoryDepartments.length,

        mappedCount:
          directoryDepartments
            .filter(
              item =>
                item.mapping !==
                null,
            )
            .length,

        unmappedCount:
          directoryDepartments
            .filter(
              item =>
                item.mapping ===
                null,
            )
            .length,

        usersWithoutDepartment,

        totalDirectoryUsers:
          normalizedUsers.length,
      },

      directoryDepartments,

      spaceDepartments,
    }
  },
)
