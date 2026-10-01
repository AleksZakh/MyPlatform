import path from 'node:path'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { createError, defineEventHandler, sendStream, setResponseHeaders } from 'h3'
import { exportJobForRequest, auditExport } from '../../../../utils/lab-export-access'
import { jobDir } from '../../../../services/lab-export-store'
export default defineEventHandler(async event => {
  const job = await exportJobForRequest(event)
  if (job.status !== 'READY') throw createError({ statusCode: 409, message: 'Архив ещё не готов' })
  const file = path.join(jobDir(job.id), 'export.zip')
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) throw createError({ statusCode: 410, message: 'Архив больше недоступен' })
  await auditExport(event, job.ownerId, job.id, 'EXPORT_DOWNLOAD')
  setResponseHeaders(event, {
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="Reestr-export-${job.createdAt.slice(0, 10)}.zip"`,
    'Content-Length': String(info.size), 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  return sendStream(event, createReadStream(file))
})
