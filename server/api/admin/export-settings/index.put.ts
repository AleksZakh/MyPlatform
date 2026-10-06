import { defineEventHandler, readBody, getHeader, getRequestURL, createError } from 'h3'
import { requireAdmin } from '../../../utils/require-admin'
import { prisma } from '../../../utils/prisma'
import { validateExportLimit } from '../../../services/lab-export-settings'
import { writeAuditEvent } from '../../../utils/auditLog'
export default defineEventHandler(async event => {
  const actor = await requireAdmin(event)
  const origin = getHeader(event, 'origin')
  if (getHeader(event, 'x-space-settings') !== '1' || getHeader(event, 'sec-fetch-site') === 'cross-site'
      || (origin && origin !== getRequestURL(event).origin)) {
    throw createError({ statusCode: 403, message: 'Недопустимый источник запроса.' })
  }
  const body = await readBody(event)
  const recordLimit = validateExportLimit(body?.recordLimit)
  await prisma.$transaction(async tx => {
    const before = await tx.labExportSettings.findUnique({ where: { id: 1 } })
    await tx.labExportSettings.upsert({ where: { id: 1 },
      create: { id: 1, recordLimit, editorLogin: actor.login },
      update: { recordLimit, editorLogin: actor.login } })
    await writeAuditEvent({ event, db: tx, actorLogin: actor.login, category: 'DATA', action: 'UPDATE',
      result: 'SUCCESS', resourceKey: 'admin.center', entityType: 'LabExportSettings',
      note: `Лимит экспорта записей: ${before?.recordLimit ?? 500} → ${recordLimit}` })
  })
  return { recordLimit }
})
