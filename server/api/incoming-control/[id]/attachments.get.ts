import { defineEventHandler, getRouterParam, createError } from 'h3'
import { AccessAction } from '@prisma/client'
import { prisma } from '../../../utils/prisma'
import { requirePermission } from '../../../services/access-control.service'
export default defineEventHandler(async event => {
  await requirePermission(event, 'lab.sampling-tests', AccessAction.VIEW)
  const id = Number(getRouterParam(event,'id'))
  if (!Number.isSafeInteger(id) || id < 1) throw createError({ statusCode:400, message:'Некорректный ID' })
  const row = await prisma.samplingTest.findFirst({ where: { id, deletedAt:null }, select: { attachments: { select: { id:true,name:true,path:true }, orderBy: { createdAt:'asc' } } } })
  if (!row) throw createError({ statusCode:404,message:'Запись не найдена' })
  return row.attachments.map(a=>({id:a.id,name:a.name,url:'/files/'+a.path.split('/').map(encodeURIComponent).join('/')}))
})
