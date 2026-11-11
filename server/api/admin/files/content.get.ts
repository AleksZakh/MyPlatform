import {prisma} from '../../../utils/prisma';
import {diskAdmin} from '../../../services/storage/disk';
import { defineEventHandler, getQuery, setHeader, sendStream, createError } from 'h3'
import { open } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { checkedStoragePath } from '../../../services/storage/paths'
export default defineEventHandler(async event => {
  await diskAdmin(event)
  const q = getQuery(event), relative = String(q.path || '')
  const handle = await open(await checkedStoragePath(relative), constants.O_RDONLY | constants.O_NOFOLLOW)
  const info = await handle.stat()
  if (!info.isFile()) { await handle.close(); throw createError({ statusCode: 400, message: 'Ожидался файл' }) }
  const record=await prisma.workProjectFile.findUnique({where:{storagePath:relative}});
  const downloadName=record?.name||path.basename(relative);
  const ext = path.extname(downloadName).toLowerCase()
  const mime: Record<string,string> = { '.pdf':'application/pdf', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.jfif':'image/jpeg' }
  const inline = Boolean(mime[ext]) && q.download !== '1'
  setHeader(event, 'Content-Type', inline ? mime[ext]! : 'application/octet-stream')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Cache-Control', 'private, no-store')
  setHeader(event, 'Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(downloadName).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase())}`)
  return sendStream(event, handle.createReadStream())
})
