// server/api/admin/guard.get.ts
import {getQuery,createError} from 'h3'
import {requireDepartmentManager} from '../../services/department-access-guard'

import {
  AccessAction,
} from '@prisma/client'

import {
  defineEventHandler,
} from 'h3'

import {
  getAccessActor,
  requirePermission,
} from '~~/server/services/access-control.service'


const RESOURCE_KEY =
  'admin.center'


export default defineEventHandler(
  async event => {
    const page=String(getQuery(event).page).replace(/\/+$/, '');
    if(['/admin/files','/admin/export-settings','/admin/structure','/admin/registration-requests'].some(path=>page===path||page.startsWith(path+'/'))){
      const actor=await getAccessActor(event);
      if(!actor.isSystemAdmin)throw createError({statusCode:403,message:'Недостаточно прав. Обратитесь к администратору.'});
    }
    if(['/admin/access','/admin/access-roles'].includes(page)){
      for(const scope of ['lab','diagnostic'] as const){try{await requireDepartmentManager(event,scope,true);return {success:true,allowed:true};}catch(e:any){if(e.statusCode!==403)throw e;}}
      throw createError({statusCode:403,message:'Недостаточно прав. Обратитесь к администратору.'});
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
