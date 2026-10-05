import { defineEventHandler, getQuery, createError } from 'h3'
import { readdir, lstat } from 'node:fs/promises'
import { requireAdmin } from '../../../utils/require-admin'
import { fileReferences } from '../../../services/storage/references'
import { checkedStoragePath, normalizeStoragePath, storageUrl } from '../../../services/storage/paths'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  const query = getQuery(event), mode = String(query.mode || 'folders')
  const refs = await fileReferences()
  const byPath = new Map<string, typeof refs>()
  for (const ref of refs) {
    try { const key = normalizeStoragePath(ref.path); byPath.set(key, [...(byPath.get(key) || []), ref]) } catch {}
  }
  async function fileItem(relative: string) {
    let size: number | null = null, modified: string | null = null, state = 'missing'
    try { const entry = await lstat(await checkedStoragePath(relative)); if (!entry.isFile()) throw new Error(); size = entry.size; modified = entry.mtime.toISOString(); state = 'present' }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') state = 'unavailable' }
    const references = byPath.get(relative) || []
    return { name: relative.split('/').at(-1)!, path: relative, folder: false, size, modified, state, references, url: storageUrl(relative) }
  }
  if (mode === 'documents') {
    const q = String(query.q || '').toLocaleLowerCase('ru'), type = String(query.type || '')
    const matches = [...byPath.entries()].filter(([p, r]) => (!type || r.some(x => x.type === type)) && (!q || (p + ' ' + r.map(x => `${x.type} ${x.number} ${x.object} ${x.location} ${x.samplingId}`).join(' ')).toLocaleLowerCase('ru').includes(q)))
    const page = Math.max(1, Number(query.page) || 1), pageSize = 100
    return { items: await Promise.all(matches.slice((page - 1) * pageSize, page * pageSize).map(([p]) => fileItem(p))), total: matches.length, page, pageSize }
  }
  try {
    const relative = normalizeStoragePath(String(query.path || ''), true)
    const dir = await checkedStoragePath(relative)
    const entries = await readdir(dir, { withFileTypes: true })
    const items = await Promise.all(entries.filter(e => !e.name.startsWith('.') && !e.isSymbolicLink()).map(async entry => {
      const p = [relative, entry.name].filter(Boolean).join('/')
      return entry.isDirectory() ? { name: entry.name, path: p, folder: true, references: [], state: 'present', size: null, modified: null } : fileItem(p)
    }))
    items.sort((a,b) => Number(b.folder) - Number(a.folder) || a.name.localeCompare(b.name, 'ru'))
    return { items, total: items.length, page: 1, pageSize: items.length }
  } catch { throw createError({ statusCode: 400, message: 'Каталог недоступен или путь недопустим.' }) }
})
