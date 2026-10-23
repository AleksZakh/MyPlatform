// server/api/admin/guard.get.ts
import {getQuery} from 'h3'
import {requireDepartmentManager} from '../../services/department-access-guard'

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
    if(['/admin/access','/admin/access-roles'].includes(String(getQuery(event).page))){
      for(const scope of ['lab','diagnostic'] as const){try{await requireDepartmentManager(event,scope,true);return {success:true,allowed:true};}catch(e:any){if(e.statusCode!==403)throw e;}}
    }
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
