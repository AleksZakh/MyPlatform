import { AccessAction } from '@prisma/client'
import { createError, getHeader, getRequestURL, getRouterParam, type H3Event } from 'h3'
import { requirePermission } from '~~/server/services/access-control.service'
import { ownedJob, type ExportJob } from '../services/lab-export-store'
import { writeAuditEvent } from '~~/server/utils/auditLog'

export async function exportActor(event: H3Event, mutation = false): Promise<number> {
  if (mutation) {
    if (getHeader(event, 'x-space-export') !== '1') throw createError({ statusCode: 403, message: 'Некорректный запрос экспорта' })
    const origin = getHeader(event, 'origin')
    let allowed = !origin
    try { if (origin) allowed = new URL(origin).host === getRequestURL(event).host } catch { allowed = false }
    if (!allowed || getHeader(event, 'sec-fetch-site') === 'cross-site') throw createError({ statusCode: 403, message: 'Недопустимый источник запроса' })
  }
  return (await requirePermission(event, 'lab.sampling-tests', AccessAction.VIEW)).userId
}
export async function exportJobForRequest(event: H3Event, mutation = false): Promise<ExportJob> {
  const actor = await exportActor(event, mutation)
  return ownedJob(getRouterParam(event, 'id') || '', actor)
}
export async function auditExport(event: H3Event, ownerId: number, id: string, action: string): Promise<void> {
  await writeAuditEvent({ event, actorUserId: ownerId, category: 'DATA', action,
    result: 'SUCCESS', resourceKey: 'lab.sampling-tests', entityType: 'LabExport', note: `Экспорт ${id}` })
}
