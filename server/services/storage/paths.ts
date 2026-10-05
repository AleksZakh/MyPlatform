import path from 'node:path'
import { lstat, realpath } from 'node:fs/promises'

// LAB_FILES_ROOT remains the common root for backward compatibility.
export const storageRoot = path.resolve(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files')
export const storageJournalRoot = path.resolve(process.env.FILE_OPERATIONS_ROOT || path.join(storageRoot, '..', 'file-operations'))
export function normalizeStoragePath(value: string, allowRoot = false): string {
  const relative = value.startsWith('/files/') ? value.slice(7) : value
  if (allowRoot && relative === '') return ''
  if (!relative || path.isAbsolute(relative) || /[\\\x00-\x1f\x7f]/.test(relative)
    || relative.split('/').some(p => !p || p === '.' || p === '..' || p.startsWith('.'))) {
    throw new Error('Недопустимый путь')
  }
  return relative
}
export function storageSegment(value: string): string {
  const segment = value.normalize('NFC').replace(/[\/\\?%*:|"<>\x00-\x1f\x7f]/g, '_')
    .replace(/\s+/g, '_').replace(/^\.+|\.+$/g, '').slice(0, 100)
  return segment || 'unnamed'
}
export function storageUrl(relative: string) {
  return '/api/admin/files/content?path=' + encodeURIComponent(relative)
}
export async function checkedStoragePath(relative: string, missingLeaf = false): Promise<string> {
  const safe = normalizeStoragePath(relative, true)
  const root = await realpath(storageRoot)
  let current = root
  const parts = safe ? safe.split('/') : []
  for (let index = 0; index < parts.length; index++) {
    current = path.join(current, parts[index]!)
    try {
      const item = await lstat(current)
      if (item.isSymbolicLink()) throw new Error('Символические ссылки не поддерживаются')
      if (index < parts.length - 1 && !item.isDirectory()) throw new Error('Ожидался каталог')
    } catch (error) {
      if (missingLeaf && index === parts.length - 1 && (error as NodeJS.ErrnoException).code === 'ENOENT') return current
      throw error
    }
  }
  return current
}
export function labPath(parts: string[]) { return ['lab', ...parts.map(value => storageSegment(value).slice(0, 50))].join('/') }
