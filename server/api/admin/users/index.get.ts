// server/api/admin/users/index.get.ts

import {
  AccessAction,
  Prisma,
  UserAuthType,
  UserStatus,
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

import {
  adCache,
} from '~~/server/utils/adCache'


const RESOURCE_KEY =
  'admin.users'


type SourceFilter =
  | 'all'
  | 'domain'
  | 'external'


type StatusFilter =
  | 'all'
  | UserStatus


interface DirectoryUserView {
  directoryObjectId: string | null
  login: string
  userPrincipalName: string | null
  fullName: string
  email: string | null
  department: string | null
  position: string | null
  telephoneNumber: string | null
  distinguishedName: string | null
  userAccountControl: number | null
  accountDisabled: boolean
}


interface AdminUserRow {
  source:
    | 'DOMAIN'
    | 'EXTERNAL'

  key: string

  displayName: string

  login: string | null
  email: string | null

  directory: DirectoryUserView | null

  appUser: {
    id: number
    authType: UserAuthType
    status: UserStatus

    login: string | null
    directoryObjectId: string | null
    email: string | null
    fullName: string | null
    organization: string | null
    position: string | null

    department: {
      id: number
      key: string
      name: string
    } | null

    permissionsCount: number

    createdAt: Date
    updatedAt: Date
  } | null
}


function normalizeText(
  value: unknown,
): string | null {
  if (
    typeof value !== 'string'
  ) {
    return null
  }

  const normalized =
    value.trim()

  return normalized || null
}


function normalizeLogin(
  value: unknown,
): string | null {
  const text =
    normalizeText(value)

  if (!text) {
    return null
  }

  const withoutDomain =
    text.includes('\\')
      ? text.split('\\').pop() ?? text
      : text

  return (
    withoutDomain
      .split('@')[0]
      ?.trim()
      .toLowerCase() ||
    null
  )
}


function normalizeEmail(
  value: unknown,
): string | null {
  return (
    normalizeText(value)
      ?.toLowerCase() ??
    null
  )
}


function toNumberOrNull(
  value: unknown,
): number | null {
  if (
    typeof value === 'number' &&
    Number.isFinite(value)
  ) {
    return value
  }

  if (
    typeof value === 'string' &&
    value.trim()
  ) {
    const parsed =
      Number(value)

    return Number.isFinite(parsed)
      ? parsed
      : null
  }

  return null
}


function readDirectoryObjectId(
  raw: Record<string, unknown>,
): string | null {
  return (
    normalizeText(
      raw.directoryObjectId,
    ) ||
    normalizeText(
      raw.objectGUID,
    ) ||
    null
  )
}


function readFullName(
  raw: Record<string, unknown>,
  login: string,
): string {
  return (
    normalizeText(
      raw.fullName,
    ) ||
    normalizeText(
      raw.displayName,
    ) ||
    normalizeText(
      raw.cn,
    ) ||
    [
      normalizeText(
        raw.givenName,
      ),
      normalizeText(
        raw.sn,
      ),
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    login
  )
}


function isAccountDisabled(
  userAccountControl:
    number | null,
): boolean {
  if (
    userAccountControl ===
    null
  ) {
    return false
  }

  // ADS_UF_ACCOUNTDISABLE = 0x0002
  return (
    (
      userAccountControl &
      0x0002
    ) !==
    0
  )
}


function normalizeDirectoryUser(
  value: unknown,
):
  DirectoryUserView | null {
  if (
    !value ||
    typeof value !==
      'object' ||
    Array.isArray(value)
  ) {
    return null
  }

  const raw =
    value as
      Record<
        string,
        unknown
      >

  const login =
    normalizeLogin(
      raw.login,
    ) ||
    normalizeLogin(
      raw.sAMAccountName,
    ) ||
    normalizeLogin(
      raw.userPrincipalName,
    )

  if (!login) {
    return null
  }

  const userAccountControl =
    toNumberOrNull(
      raw.userAccountControl,
    )

  return {
    directoryObjectId:
      readDirectoryObjectId(
        raw,
      ),

    login,

    userPrincipalName:
      normalizeText(
        raw.userPrincipalName,
      ),

    fullName:
      readFullName(
        raw,
        login,
      ),

    email:
      normalizeEmail(
        raw.email,
      ) ||
      normalizeEmail(
        raw.mail,
      ),

    department:
      normalizeText(
        raw.department,
      ),

    position:
      normalizeText(
        raw.position,
      ) ||
      normalizeText(
        raw.title,
      ),

    telephoneNumber:
      normalizeText(
        raw.telephoneNumber,
      ),

    distinguishedName:
      normalizeText(
        raw.distinguishedName,
      ) ||
      normalizeText(
        raw.dn,
      ),

    userAccountControl,

    accountDisabled:
      typeof raw.accountDisabled ===
        'boolean'
        ? raw.accountDisabled
        : isAccountDisabled(
            userAccountControl,
          ),
  }
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


function parseSource(
  value: unknown,
): SourceFilter {
  if (
    value === 'domain' ||
    value === 'external'
  ) {
    return value
  }

  return 'all'
}


function parseStatus(
  value: unknown,
): StatusFilter {
  if (
    value ===
      UserStatus.PENDING_ACTIVATION ||
    value ===
      UserStatus.ACTIVE ||
    value ===
      UserStatus.BLOCKED ||
    value ===
      UserStatus.DISABLED
  ) {
    return value
  }

  return 'all'
}


export default defineEventHandler(
  async event => {
    const viewerPermission =
      await requirePermission(
        event,
        RESOURCE_KEY,
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
        50,
        200,
      )

    const source =
      parseSource(
        query.source,
      )

    const status =
      parseStatus(
        query.status,
      )

    const search =
      typeof query.search ===
        'string'
        ? query.search
            .trim()
            .toLowerCase()
        : ''


    try {
      const [
        cache,
        appUsers,
        refreshPermission,
      ] =
        await Promise.all([
          adCache.get(),

          prisma.user.findMany({
            orderBy: [
              {
                fullName:
                  'asc',
              },
              {
                login:
                  'asc',
              },
              {
                id:
                  'asc',
              },
            ],

            include: {
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

              _count: {
                select: {
                  permissions:
                    true,
                },
              },
            },
          }),

          prisma.userPermission
            .findFirst({
              where: {
                userId:
                  viewerPermission.userId,

                action:
                  AccessAction.UPDATE,

                resource: {
                  key:
                    'admin.ad-cache-refresh',

                  isActive:
                    true,
                },
              },

              select: {
                id:
                  true,
              },
            }),
        ])


      const directoryUsers =
        (
          cache?.users ??
          []
        )
          .map(
            normalizeDirectoryUser,
          )
          .filter(
            (
              user,
            ): user is DirectoryUserView =>
              user !==
              null,
          )


      /**
       * Индексы app_users для консервативного сопоставления.
       *
       * Приоритет:
       * 1. directoryObjectId
       * 2. login
       * 3. email
       */
      const appByDirectoryId =
        new Map<
          string,
          typeof appUsers[number]
        >()

      const appByLogin =
        new Map<
          string,
          typeof appUsers[number]
        >()

      const appByEmail =
        new Map<
          string,
          typeof appUsers[number]
        >()


      for (
        const user
        of appUsers
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


      const matchedAppUserIds =
        new Set<number>()

      const rows:
        AdminUserRow[] = []


      for (
        const directoryUser
        of directoryUsers
      ) {
        const matched =
          (
            directoryUser
              .directoryObjectId
              ? appByDirectoryId.get(
                  directoryUser
                    .directoryObjectId,
                )
              : undefined
          ) ||
          appByLogin.get(
            directoryUser.login,
          ) ||
          (
            directoryUser.email
              ? appByEmail.get(
                  directoryUser.email,
                )
              : undefined
          ) ||
          null


        if (matched) {
          matchedAppUserIds.add(
            matched.id,
          )
        }


        rows.push({
          source:
            'DOMAIN',

          key:
            `domain:${
              directoryUser
                .directoryObjectId ||
              directoryUser.login
            }`,

          displayName:
            directoryUser
              .fullName,

          login:
            directoryUser.login,

          email:
            directoryUser.email,

          directory:
            directoryUser,

          appUser:
            matched
              ? {
                  id:
                    matched.id,

                  authType:
                    matched.authType,

                  status:
                    matched.status,

                  login:
                    matched.login,

                  directoryObjectId:
                    matched
                      .directoryObjectId,

                  email:
                    matched.email,

                  fullName:
                    matched.fullName,

                  organization:
                    matched
                      .organization,

                  position:
                    matched.position,

                  department:
                    matched.department,

                  permissionsCount:
                    matched._count
                      .permissions,

                  createdAt:
                    matched.createdAt,

                  updatedAt:
                    matched.updatedAt,
                }
              : null,
        })
      }


      /**
       * Всё, что осталось в app_users:
       *
       * - EXTERNAL всегда отдельной строкой;
       * - DOMAIN, отсутствующий в текущем кэше AD,
       *   тоже показываем, чтобы администратор не потерял
       *   существующую учётную запись Space.
       */
      for (
        const user
        of appUsers
      ) {
        if (
          matchedAppUserIds.has(
            user.id,
          )
        ) {
          continue
        }


        const rowSource:
          'DOMAIN' |
          'EXTERNAL' =
            user.authType ===
            UserAuthType.DOMAIN
              ? 'DOMAIN'
              : 'EXTERNAL'


        rows.push({
          source:
            rowSource,

          key:
            `app:${user.id}`,

          displayName:
            user.fullName ||
            user.login ||
            user.email ||
            `Пользователь #${user.id}`,

          login:
            user.login,

          email:
            user.email,

          directory:
            null,

          appUser: {
            id:
              user.id,

            authType:
              user.authType,

            status:
              user.status,

            login:
              user.login,

            directoryObjectId:
              user.directoryObjectId,

            email:
              user.email,

            fullName:
              user.fullName,

            organization:
              user.organization,

            position:
              user.position,

            department:
              user.department,

            permissionsCount:
              user._count
                .permissions,

            createdAt:
              user.createdAt,

            updatedAt:
              user.updatedAt,
          },
        })
      }


      const filtered =
        rows.filter(
          row => {
            if (
              source ===
                'domain' &&
              row.source !==
                'DOMAIN'
            ) {
              return false
            }

            if (
              source ===
                'external' &&
              row.source !==
                'EXTERNAL'
            ) {
              return false
            }

            if (
              status !== 'all'
            ) {
              if (
                row.appUser
                  ?.status !==
                status
              ) {
                return false
              }
            }

            if (!search) {
              return true
            }


            const haystack =
              [
                row.displayName,
                row.login,
                row.email,
                row.directory
                  ?.department,
                row.directory
                  ?.position,
                row.appUser
                  ?.department
                  ?.name,
                row.appUser
                  ?.organization,
                row.appUser
                  ?.position,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase()


            return haystack.includes(
              search,
            )
          },
        )


      filtered.sort(
        (
          left,
          right,
        ) => {
          const byName =
            left.displayName
              .localeCompare(
                right.displayName,
                'ru',
                {
                  sensitivity:
                    'base',
                },
              )

          if (byName !== 0) {
            return byName
          }

          return left.key
            .localeCompare(
              right.key,
            )
        },
      )


      const total =
        filtered.length

      const totalPages =
        Math.max(
          1,
          Math.ceil(
            total /
            pageSize,
          ),
        )

      const safePage =
        Math.min(
          page,
          totalPages,
        )

      const start =
        (
          safePage -
          1
        ) *
        pageSize

      const data =
        filtered.slice(
          start,
          start +
          pageSize,
        )


      const stats = {
        total:
          rows.length,

        domain:
          rows.filter(
            row =>
              row.source ===
              'DOMAIN',
          ).length,

        external:
          rows.filter(
            row =>
              row.source ===
              'EXTERNAL',
          ).length,

        registered:
          rows.filter(
            row =>
              !!row.appUser,
          ).length,

        notRegistered:
          rows.filter(
            row =>
              !row.appUser,
          ).length,

        active:
          rows.filter(
            row =>
              row.appUser
                ?.status ===
              UserStatus.ACTIVE,
          ).length,

        blocked:
          rows.filter(
            row =>
              row.appUser
                ?.status ===
              UserStatus.BLOCKED,
          ).length,

        directoryDisabled:
          rows.filter(
            row =>
              row.directory
                ?.accountDisabled ===
              true,
          ).length,
      }


      const cacheTtlMinutes =
        60

      const cacheLastUpdated =
        cache?.lastUpdated
          ? new Date(
              cache.lastUpdated,
            )
          : null

      const cacheAgeMs =
        cacheLastUpdated &&
        !Number.isNaN(
          cacheLastUpdated
            .getTime(),
        )
          ? Math.max(
              0,
              Date.now() -
              cacheLastUpdated
                .getTime(),
            )
          : null

      const cacheAgeMinutes =
        cacheAgeMs === null
          ? null
          : Math.floor(
              cacheAgeMs /
              60_000,
            )

      const cacheState:
        'fresh' |
        'stale' |
        'missing' =
          !cache
            ? 'missing'
            : (
                cacheAgeMs ===
                  null ||
                cacheAgeMs >
                  cacheTtlMinutes *
                  60_000
              )
                ? 'stale'
                : 'fresh'


      return {
        success: true,

        data,

        total,

        page:
          safePage,

        pageSize,

        totalPages,

        filters: {
          source,
          status,
          search,
        },

        directoryCache: {
          available:
            !!cache,

          state:
            cacheState,

          stale:
            cacheState ===
            'stale',

          lastUpdated:
            cache?.lastUpdated ??
            null,

          ageMinutes:
            cacheAgeMinutes,

          expiresAfterMinutes:
            cacheTtlMinutes,

          totalCount:
            cache?.totalCount ??
            directoryUsers.length,

          normalizedCount:
            directoryUsers.length,
        },

        capabilities: {
          canRefreshDirectoryCache:
            !!refreshPermission,
        },

        stats,
      }

    } catch (error: unknown) {
      console.error(
        '[admin/users GET] Ошибка:',
        error,
      )

      throw createError({
        statusCode: 500,

        statusMessage:
          'Не удалось загрузить каталог пользователей',

        data: {
          code:
            'ADMIN_USERS_LOAD_FAILED',

          message:
            'Не удалось загрузить каталог пользователей AdminCenter.',
        },
      })
    }
  },
)
