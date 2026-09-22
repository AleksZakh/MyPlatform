// server/api/admin/guard.get.ts

import {
  AccessAction,
} from '@prisma/client'

import {
  defineEventHandler,
} from 'h3'

import {
  requirePermission,
} from '~~/server/services/access-control.service'


const RESOURCE_KEY =
  'admin.center'


export default defineEventHandler(
  async event => {
    const permission =
      await requirePermission(
        event,
        RESOURCE_KEY,
        AccessAction.VIEW,
      )

    return {
      success:
        true,

      allowed:
        true,

      resourceKey:
        RESOURCE_KEY,

      action:
        AccessAction.VIEW,

      userId:
        permission.userId,
    }
  },
)
