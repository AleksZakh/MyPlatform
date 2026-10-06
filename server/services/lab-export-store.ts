import { getExportRecordLimit, assertExportRecordLimit } from './lab-export-settings'
import { createHash, randomUUID } from 'node:crypto'
import path from 'node:path'
import { mkdir, readFile, writeFile, rename, readdir, rm, open, stat, realpath } from 'node:fs/promises'
import { createError } from 'h3'
import type { Prisma } from '@prisma/client'
import { EXPORT_COLUMNS, EXPORT_KINDS, type ExportJobView, type ExportKind } from '../../shared/types/lab-export'

export const EXPORT_ROOT = path.resolve(process.env.LAB_EXPORT_ROOT || '/var/www/uploads-storage/exports')
export const FILES_ROOT = path.resolve(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files')
export interface ExportJob extends ExportJobView {
  ownerId: number
  where: Prisma.SamplingTestWhereInput
  columns: string[]
}
export function jobDir(id: string): string {
  if (!/^[a-f0-9]{64}$/.test(id)) throw createError({ statusCode: 404, message: 'Экспорт не найден' })
  return path.join(EXPORT_ROOT, id)
}
export async function ensureExportRoot(): Promise<void> {
  await mkdir(EXPORT_ROOT, { recursive: true, mode: 0o700 })
  const exportsRoot = await realpath(EXPORT_ROOT)
  const filesRoot = await realpath(FILES_ROOT).catch(() => FILES_ROOT)
  if (exportsRoot === filesRoot || exportsRoot.startsWith(filesRoot + path.sep)) {
    throw new Error('LAB_EXPORT_ROOT must be outside public LAB_FILES_ROOT')
  }
}
export async function writeJson(file: string, value: unknown): Promise<void> {
  const temp = file + '.' + randomUUID() + '.tmp'
  await writeFile(temp, JSON.stringify(value), { mode: 0o600 })
  await rename(temp, file)
}
export async function readJob(id: string): Promise<ExportJob> {
  try { return JSON.parse(await readFile(path.join(jobDir(id), 'job.json'), 'utf8')) as ExportJob }
  catch { throw createError({ statusCode: 404, message: 'Экспорт не найден' }) }
}
export async function saveJob(job: ExportJob): Promise<void> {
  await writeJson(path.join(jobDir(job.id), 'job.json'), job)
}
export function jobView(job: ExportJob): ExportJobView {
  const { ownerId: _owner, where: _where, columns: _columns, ...view } = job
  return view
}
export async function ownedJob(id: string, ownerId: number): Promise<ExportJob> {
  const job = await readJob(id)
  if (job.ownerId !== ownerId) throw createError({ statusCode: 404, message: 'Экспорт не найден' })
  if (Date.parse(job.expiresAt) <= Date.now()) throw createError({ statusCode: 410, message: 'Срок хранения экспорта истёк' })
  return job
}
export async function listJobs(ownerId?: number): Promise<ExportJob[]> {
  await ensureExportRoot()
  const entries = await readdir(EXPORT_ROOT)
  const result: ExportJob[] = []
  for (const id of entries) {
    if (!/^[a-f0-9]{64}$/.test(id)) continue
    const job = await readJob(id).catch(() => null)
    if (job && (ownerId === undefined || job.ownerId === ownerId)) result.push(job)
  }
  return result.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}
/** Host-local lock, held for the complete worker job. No age-based stealing from a live PID. */
export async function acquireLock(name: string): Promise<(() => Promise<void>) | null> {
  await ensureExportRoot()
  const file = path.join(EXPORT_ROOT, name + '.lock')
  try {
    const handle = await open(file, 'wx', 0o600)
    await handle.writeFile(String(process.pid))
    await handle.close()
    return async () => { await rm(file, { force: true }) }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
    const pid = Number(await readFile(file, 'utf8').catch(() => ''))
    if (Number.isSafeInteger(pid) && pid > 0) {
      try { process.kill(pid, 0) }
      catch (err) { if ((err as NodeJS.ErrnoException).code === 'ESRCH') await rm(file, { force: true }) }
    } else if (Date.now() - (await stat(file)).mtimeMs > 60_000) {
      await rm(file, { force: true })
    }
    return null
  }
}
export function parseOptions(body: unknown): { kinds: ExportKind[]; columns: string[]; requestId: string } {
  const input = body as { kinds?: unknown; columns?: unknown; requestId?: unknown }
  if (!input || !Array.isArray(input.kinds) || !input.kinds.length
    || input.kinds.some(k => !EXPORT_KINDS.includes(k))) {
    throw createError({ statusCode: 400, message: 'Выберите содержимое выгрузки' })
  }
  if (typeof input.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(input.requestId)) {
    throw createError({ statusCode: 400, message: 'Некорректный идентификатор запроса' })
  }
  const allowed = new Set<string>(EXPORT_COLUMNS.map(c => c[0]))
  if (Array.isArray(input.columns) && input.columns.some(x => typeof x !== 'string' || !allowed.has(x))) {
    throw createError({ statusCode: 400, message: 'Список столбцов таблицы не поддерживается экспортом. Выберите все поля реестра.' })
  }
  const columns = Array.isArray(input.columns)
    ? [...new Set(input.columns.filter((x): x is string => typeof x === 'string' && allowed.has(x)))]
    : EXPORT_COLUMNS.map(c => c[0])
  if (input.kinds.includes('reestr') && !columns.length) throw createError({ statusCode: 400, message: 'Выберите столбцы реестра' })
  return { kinds: [...new Set(input.kinds)] as ExportKind[], columns, requestId: input.requestId }
}
export async function createJob(ownerId: number, options: ReturnType<typeof parseOptions>, where: Prisma.SamplingTestWhereInput, hasFilter: boolean, filterDescription: string[] = []): Promise<ExportJob> {
  const id = createHash('sha256').update(`${ownerId}:${options.requestId}`).digest('hex')
  const release = await acquireLock('owner-' + ownerId)
  if (!release) throw createError({ statusCode: 409, message: 'Запрос уже обрабатывается. Повторите через секунду.' })
  try {
    const previous = await readJob(id).catch(() => null)
    if (previous) return previous
    const active = (await listJobs(ownerId)).filter(j => Date.parse(j.expiresAt) > Date.now() && ['PREPARING', 'AWAITING_CONFIRMATION', 'QUEUED', 'RUNNING'].includes(j.status))
    if (active.length >= 2) throw createError({ statusCode: 409, message: 'У вас уже есть две незавершённые выгрузки. Завершите или отмените их.' })
    const job: ExportJob = {
      id, ownerId, where, columns: options.columns, kinds: options.kinds, hasFilter, filterDescription,
      createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      status: 'PREPARING', total: 0, processed: 0, documents: 0, bytes: 0, packed: 0, warnings: 0,
    }
    await mkdir(jobDir(id), { recursive: true, mode: 0o700 })
    await saveJob(job)
    return job
  } finally { await release() }
}
export async function cancelJob(job: ExportJob): Promise<void> {
  if (['READY', 'FAILED', 'CANCELLED'].includes(job.status)) return
  await writeFile(path.join(jobDir(job.id), 'cancel'), '', { mode: 0o600 })
}
export async function confirmJob(job: ExportJob, confirmAll: boolean): Promise<void> {
  if (await cancelled(job.id)) throw createError({ statusCode: 409, message: 'Выгрузка отменена' })
  if (['QUEUED', 'RUNNING', 'READY'].includes(job.status)) return
  assertExportRecordLimit(job.total, await getExportRecordLimit())
  if (job.status !== 'AWAITING_CONFIRMATION') throw createError({ statusCode: 409, message: 'Дождитесь подготовки состава выгрузки' })
  if (!job.hasFilter && !confirmAll) throw createError({ statusCode: 400, message: 'Подтвердите выгрузку всего реестра' })
  // Marker only: worker is the sole writer of mutable job state.
  await writeFile(path.join(jobDir(job.id), 'confirmed'), '', { flag: 'a', mode: 0o600 })
}
export async function cancelled(id: string): Promise<boolean> {
  return stat(path.join(jobDir(id), 'cancel')).then(() => true, () => false)
}
