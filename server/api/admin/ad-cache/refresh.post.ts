import { structureAdmin } from '../../../services/structure-admin.service'
import { requireAccessMutationRequest } from '../../../services/access-input'
// server/api/admin/ad-cache/refresh.post.ts

import {
  AccessAction,
} from '@prisma/client'

import {
  createError,
  defineEventHandler,
} from 'h3'

import {
  prisma,
} from '~~/server/utils/prisma'

import {
  requirePermission,
} from '~~/server/services/access-control.service'

import { refreshAdCache } from '../../../services/ad-cache-refresh.service'

import {
  writeAuditEvent,
} from '~~/server/utils/auditLog'


const RESOURCE_KEY =
  'admin.ad-cache-refresh'


export default defineEventHandler(
  async event => {
    requireAccessMutationRequest(event)
    await structureAdmin(event)
    const permission =
      await requirePermission(
        event,
        RESOURCE_KEY,
        AccessAction.UPDATE,
      )


    const startedAt =
      Date.now()


    try {
      /**
       * Используем единый нормализованный Directory service.
       * В кэш попадает уже DirectoryUser[], а не сырой LDAP-ответ.
       */
      const users = await refreshAdCache('manual')

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


      await writeAuditEvent({
        event,

        db:
          prisma,

        category:
          'ADMIN',

        result:
          'SUCCESS',

        action:
          'UPDATE',

        resourceKey:
          RESOURCE_KEY,

        entityType:
          'ActiveDirectoryCache',

        entityId:
          undefined,

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
          `Обновлён кэш Active Directory: ${users.length} пользователей.`,

        changes: {
          usersCount: {
            before:
              null,

            after:
              users.length,
          },
        },
      })


      return {
        success: true,

        data: {
          usersCount:
            users.length,

          refreshedAt:
            new Date()
              .toISOString(),

          durationMs:
            Date.now() -
            startedAt,
        },

        message:
          `Кэш Active Directory обновлён. Загружено пользователей: ${users.length}.`,
      }

    } catch (error: any) {
      if (
        error?.statusCode
      ) {
        throw error
      }


      console.error(
        '[admin/ad-cache/refresh POST] Ошибка:',
        error,
      )


      throw createError({
        statusCode: 503,

        statusMessage:
          'Active Directory cache refresh failed',

        data: {
          code:
            'ADMIN_AD_CACHE_REFRESH_FAILED',

          message:
            'Не удалось обновить кэш Active Directory.',
        },
      })
    }
  },
)
