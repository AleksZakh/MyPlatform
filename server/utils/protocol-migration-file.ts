import { realpath, lstat, open } from 'node:fs/promises'
import { constants } from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { detectMigrationDocument } from '~~/shared/utils/migration-document'

export async function inspectProtocolFile(source: string | null | undefined) {
  if (!source?.trim() || source.trim() === '-') return { state: 'ABSENT' as const }
  let stage = 'ROOT'
  try {
    // A missing/unmounted storage root is never evidence of a missing document.
    const root = await realpath(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files')
    if (!(await lstat(root)).isDirectory()) throw new Error('INVALID_ROOT')
    const relative = source.startsWith('/files/') ? source.slice(7) : source
    const parts = relative.split('/')
    stage = 'PATH'
    if (path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0')
      || parts.some(part => !part || part === '.' || part === '..')) throw new Error('INVALID_PATH')
    let candidate = root
    for (const [index, part] of parts.entries()) {
      candidate = path.join(candidate, part)
      let entry
      try { entry = await lstat(candidate) }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { state: 'MISSING' as const, reason: 'ENOENT' }
        throw error
      }
      // Fail closed on symlinks, including dangling ones.
      if (entry.isSymbolicLink()) throw new Error('SYMLINK')
      if (index < parts.length - 1 && !entry.isDirectory()) throw new Error('NOT_DIRECTORY')
    }
    stage = 'READ'
    const file = await open(candidate, constants.O_RDONLY | constants.O_NOFOLLOW)
    try {
      const before = await file.stat()
      if (!before.isFile() || before.size > 50 * 1024 * 1024) throw new Error('INVALID_SIZE_OR_TYPE')
      const bytes = await file.readFile()
      const after = await file.stat()
      if (before.size !== after.size || before.mtimeMs !== after.mtimeMs) throw new Error('FILE_CHANGED')
      const format = detectMigrationDocument(bytes)
      if (!format) throw new Error('UNSUPPORTED_FORMAT')
      return { state: 'PRESENT' as const, sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length, extension: format.extension }
    } finally { await file.close() }
  } catch (error) {
    const value = error as NodeJS.ErrnoException
    const known = ['INVALID_ROOT', 'INVALID_PATH', 'SYMLINK', 'NOT_DIRECTORY', 'INVALID_SIZE_OR_TYPE', 'FILE_CHANGED', 'UNSUPPORTED_FORMAT']
    return { state: 'UNAVAILABLE' as const, reason: `${stage}:${value.code || (known.includes(value.message) ? value.message : 'CHECK_FAILED')}` }
  }
}
