import { defineEventHandler, getQuery, setHeader, sendStream, createError } from 'h3'
import { open } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { requireAdmin } from '../../../utils/require-admin'
import { checkedStoragePath } from '../../../services/storage/paths'
export default defineEventHandler(async event => {
  await requireAdmin(event)
  const q = getQuery(event), relative = String(q.path || '')
  const handle = await open(await checkedStoragePath(relative), constants.O_RDONLY | constants.O_NOFOLLOW)
  const info = await handle.stat()
  if (!info.isFile()) { await handle.close(); throw createError({ statusCode: 400, message: 'Ожидался файл' }) }
  const ext = path.extname(relative).toLowerCase()
  const mime: Record<string,string> = { '.pdf':'application/pdf', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg' }
  const inline = Boolean(mime[ext]) && q.download !== '1'
  setHeader(event, 'Content-Type', inline ? mime[ext]! : 'application/octet-stream')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(path.basename(relative))}`)
  return sendStream(event, handle.createReadStream())
})
