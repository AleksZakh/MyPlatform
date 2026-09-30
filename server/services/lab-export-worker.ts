import path from 'node:path'
import { constants, createReadStream, createWriteStream } from 'node:fs'
import { mkdir, readFile, writeFile, rm, stat, realpath, open, rename, statfs } from 'node:fs/promises'
import { pipeline, finished } from 'node:stream/promises'
import { once } from 'node:events'
import ExcelJS from 'exceljs'
import archiver from 'archiver'
import { Prisma } from '@prisma/client'
import { prisma } from '~~/server/utils/prisma'
import { EXPORT_COLUMNS, type ExportKind } from '../../shared/types/lab-export'
import { EXPORT_ROOT, FILES_ROOT, acquireLock, cancelled, jobDir, listJobs, saveJob, writeJson, type ExportJob } from './lab-export-store'

type Fingerprint = { size: number; mtimeMs: number; ino: number; dev: number }
type Document = { field: string; kind: ExportKind; source: string; name: string; fingerprint?: Fingerprint; result: string; included?: boolean }
type SnapshotRow = { id: number; values: Record<string, string | number | null>; docs: Document[] }
const DOCS = [
  ['samplingReport', 'samplingDocumentPath', 'samplingActNumber', 'Акт'],
  ['materialPassp', 'receiptMaterial.qualityDocumentPath', 'receiptMaterial.qualityDocumentNumber', 'Паспорт'],
  ['testProtocol', 'testProtocol.protocolDocumentPath', 'testProtocol.protocolNumber', 'Протокол'],
] as const
class ExportCancelled extends Error {}
async function checkpoint(job: ExportJob): Promise<void> {
  if (await cancelled(job.id)) throw new ExportCancelled()
  await saveJob(job)
}
function valueAt(row: unknown, key: string): unknown {
  return key.split('.').reduce<unknown>((v, k) => v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : null, row)
}
function safeName(value: string): string {
  return value.replace(/[\\/:*?"<>|\x00-\x1f#%]/g, '_').replace(/[. ]+$/g, '').slice(0, 90) || 'без_номера'
}
/** Only local regular files inside the canonical storage root; no remote fetching. */
export async function resolveExportSource(source: string): Promise<string> {
  let relative = source.startsWith('/files/') ? source.slice(7) : source
  if (!relative || path.isAbsolute(relative) || relative.includes('\\') || relative.includes('\0') || /^[a-z]+:/i.test(relative)) throw new Error('Недопустимый путь документа')
  const root = await realpath(FILES_ROOT)
  const candidate = path.resolve(root, relative)
  if (!candidate.startsWith(root + path.sep)) throw new Error('Документ находится вне хранилища')
  const actual = await realpath(candidate)
  if (!actual.startsWith(root + path.sep)) throw new Error('Ссылка ведёт за пределы хранилища')
  return actual
}
function fingerprint(s: Fingerprint): Fingerprint { return { size: s.size, mtimeMs: s.mtimeMs, ino: s.ino, dev: s.dev } }
function sameFile(a: Fingerprint, b: Fingerprint): boolean {
  return a.size === b.size && a.mtimeMs === b.mtimeMs && a.ino === b.ino && a.dev === b.dev
}
async function prepare(job: ExportJob): Promise<void> {
  job.snapshotAt = new Date().toISOString()
  // Only database reads in this bounded transaction; files and ZIP are processed later.
  const records = await prisma.$transaction(tx => tx.samplingTest.findMany({
    where: job.where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    include: { plp: true, inspector: true, testLocation: { include: { testObject: true } },
      receiptMaterial: { include: { material: true, manufacturer: true } }, testProtocol: true },
  }), { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 60_000, maxWait: 10_000 })
  job.total = records.length
  const rows: SnapshotRow[] = []
  for (const record of records) {
    const values: SnapshotRow['values'] = {}
    for (const [key] of EXPORT_COLUMNS) {
      const v = valueAt(record, key)
      values[key] = v instanceof Date ? v.toISOString() : typeof v === 'string' || typeof v === 'number' ? v : null
    }
    const row: SnapshotRow = { id: record.id, values, docs: [] }
    for (const [kind, field, number, prefix] of DOCS) {
      if (!job.kinds.includes(kind)) continue
      const source = String(values[field] ?? '').trim()
      const doc: Document = { kind, field, source, name: '', result: 'Не прикреплён' }
      if (source && source !== '-') {
        try {
          const actual = await resolveExportSource(source)
          const info = await stat(actual)
          if (!info.isFile()) throw new Error('Не обычный файл')
          const ext = path.extname(actual).toLowerCase()
          if (!/^\.[a-z0-9]{1,10}$/.test(ext)) throw new Error('Недопустимое расширение')
          doc.name = `Документы/${record.id}/${prefix}_${safeName(String(values[number] ?? record.id))}${ext}`
          doc.fingerprint = fingerprint(info)
          doc.result = 'Подготовлен'
          job.documents++
          job.bytes += info.size
        } catch { doc.result = 'Файл недоступен или путь недопустим' }
      }
      if (!doc.fingerprint) job.warnings++
      row.docs.push(doc)
    }
    rows.push(row)
    job.processed++
    if (job.processed % 100 === 0) await checkpoint(job)
  }
  await checkpoint(job)
  await writeJson(path.join(jobDir(job.id), 'snapshot.json'), rows)
  job.status = 'AWAITING_CONFIRMATION'
  job.processed = 0
  await saveJob(job)
}
async function build(job: ExportJob): Promise<void> {
  job.status = 'RUNNING'
  job.processed = 0
  job.packed = 0
  job.warnings = 0
  await checkpoint(job)
  const directory = jobDir(job.id)
  const rows = JSON.parse(await readFile(path.join(directory, 'snapshot.json'), 'utf8')) as SnapshotRow[]
  const disk = await statfs(EXPORT_ROOT)
  const largest = rows.reduce((max, row) => Math.max(max, ...row.docs.map(d => d.fingerprint?.size ?? 0)), 0)
  if (disk.bavail * disk.bsize < job.bytes + largest + 128 * 1024 * 1024) throw new Error('Недостаточно свободного места для экспорта')
  const partial = path.join(directory, 'archive.partial')
  const output = createWriteStream(partial, { mode: 0o600 })
  const archive = archiver('zip', { store: true, forceZip64: true })
  const completion = finished(output)
  // Attach immediately to prevent an unhandled rejection before finalize.
  void completion.catch(() => undefined)
  let archiveError: Error | null = null
  archive.on('error', error => { archiveError = error; output.destroy(error) })
  archive.on('warning', error => { archiveError = error; output.destroy(error) })
  output.on('error', error => { archiveError = error; archive.emit('error', error); archive.abort() })
  archive.pipe(output)
  const check = async () => {
    if (archiveError) throw archiveError
    if (await cancelled(job.id)) throw new ExportCancelled()
  }
  const appendFile = async (file: string, name: string) => {
    await check()
    const entry = once(archive, 'entry')
    const source = createReadStream(file)
    source.on('error', error => archive.emit('error', error))
    archive.append(source, { name })
    try { await entry } finally { source.destroy() }
  }
  let excelOutput: ReturnType<typeof createWriteStream> | undefined
  let activeCopy: AbortController | null = null
  let aborting = false
  const cancelTimer = setInterval(() => {
    void cancelled(job.id).then(isCancelled => {
      if (isCancelled && !aborting) {
        aborting = true
        activeCopy?.abort()
        excelOutput?.destroy(new ExportCancelled())
        archive.emit('error', new ExportCancelled())
        archive.abort()
      }
    }).catch(() => undefined)
  }, 1000)
  cancelTimer.unref()
  try {
    for (const row of rows) {
      await check()
      for (const doc of row.docs) {
        const temp = path.join(directory, 'document.tmp')
        if (doc.fingerprint) {
          try {
            const actual = await resolveExportSource(doc.source)
            const file = await open(actual, constants.O_RDONLY | constants.O_NOFOLLOW)
            try {
              const info = await file.stat()
              if (!info.isFile() || !sameFile(info, doc.fingerprint)) throw new Error('Файл изменился')
              activeCopy = new AbortController()
              await pipeline(file.createReadStream({ autoClose: false }), createWriteStream(temp, { mode: 0o600 }), { signal: activeCopy.signal })
              if (!sameFile(await file.stat(), doc.fingerprint)) throw new Error('Файл изменился')
            } finally { activeCopy = null; await file.close() }
            doc.result = 'Скопирован'
          } catch (error) {
            await rm(temp, { force: true })
            if (await cancelled(job.id)) throw new ExportCancelled()
            if (['ENOSPC', 'EDQUOT'].includes((error as NodeJS.ErrnoException).code ?? '')) throw error
            doc.result = 'Не включён: файл изменился или недоступен'
          }
          if (doc.result === 'Скопирован') {
            await appendFile(temp, doc.name)
            await rm(temp, { force: true })
            doc.included = true
            doc.result = 'Включён'
            job.packed++
          }
        }
        if (!doc.included) job.warnings++
      }
      job.processed++
      if (job.processed % 20 === 0) await checkpoint(job)
    }
    if (job.kinds.includes('reestr')) {
      excelOutput = createWriteStream(path.join(directory, 'Реестр.xlsx'), { mode: 0o600 })
      excelOutput.on('error', error => { archiveError = error })
      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: excelOutput, useStyles: true, useSharedStrings: false })
      workbook.creator = 'Space'
      const sheet = workbook.addWorksheet('Реестр', { views: [{ state: 'frozen', ySplit: 1 }] })
      const columns = job.columns.map(id => EXPORT_COLUMNS.find(c => c[0] === id)!).filter(Boolean)
      sheet.columns = columns.map(([id, header, kind]) => ({ key: id, header, width: kind === 'date' ? 16 : kind === 'document' ? 42 : 28 }))
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF235B96' } }
      sheet.getRow(1).height = 42
      sheet.getRow(1).alignment = { vertical: 'middle', wrapText: true }
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: columns.length } }
      sheet.getRow(1).commit()
      for (let index = 0; index < rows.length; index++) {
        const row = rows[index]!
        const excelRow = sheet.addRow(columns.map(([id, _label, kind]) => {
          const v = row.values[id]
          if (v === null || v === undefined) return null
          if (kind === 'date') return new Date(String(v))
          if (kind === 'document') {
            const doc = row.docs.find(d => d.field === id)
            return doc?.included ? { text: path.basename(doc.name), hyperlink: doc.name.split('/').map(encodeURIComponent).join('/') }
              : doc ? doc.result : String(v).split('/').pop() || null
          }
          return kind === 'number' ? Number(v) : String(v) // Strings never become formulas.
        }))
        excelRow.alignment = { vertical: 'top', wrapText: true }
        columns.forEach(([, , kind], i) => {
          const cell = excelRow.getCell(i + 1)
          cell.numFmt = kind === 'date' ? 'dd.mm.yyyy' : kind === 'number' ? '0' : '@'
          if (cell.type === ExcelJS.ValueType.Hyperlink) cell.font = { color: { argb: 'FF0563C1' }, underline: true }
        })
        excelRow.commit()
        if (index % 100 === 0) await check()
      }
      sheet.commit()
      const docsSheet = workbook.addWorksheet('Документы', { views: [{ state: 'frozen', ySplit: 1 }] })
      docsSheet.columns = [{ header: 'ID Space', width: 14 }, { header: 'Вид документа', width: 32 }, { header: 'Результат', width: 48 }, { header: 'Файл', width: 60 }]
      docsSheet.getRow(1).font = { bold: true }
      docsSheet.getRow(1).commit()
      for (const row of rows) for (const doc of row.docs) docsSheet.addRow([row.id, EXPORT_COLUMNS.find(c => c[0] === doc.field)?.[1], doc.result,
        doc.included ? { text: doc.name, hyperlink: doc.name.split('/').map(encodeURIComponent).join('/') } : '']).commit()
      docsSheet.commit()
      await workbook.commit()
      await appendFile(path.join(directory, 'Реестр.xlsx'), 'Реестр.xlsx')
    }
    const report = [
      'Экспорт реестра входного контроля Space', `Состав зафиксирован: ${job.snapshotAt}`,
      `Записей: ${job.total}`, `Документов включено: ${job.packed}`, `Предупреждений: ${job.warnings}`,
      `Выбрано: ${job.kinds.map(k => ({ reestr: 'Реестр', samplingReport: 'Акты отбора проб', materialPassp: 'Паспорта на материалы', testProtocol: 'Протоколы испытаний' })[k]).join(', ')}`, 'Быстрый поиск не учитывался.',
      `Фильтр: ${job.filterDescription.length ? job.filterDescription.join('; ') : 'Не установлен'}`, '',
      'Распакуйте весь ZIP в одну папку перед открытием Реестр.xlsx. Лист Документы содержит ссылки и статусы.',
      'ID Space\tДокумент\tРезультат\tФайл',
      ...rows.flatMap(row => row.docs.map(doc => [row.id, EXPORT_COLUMNS.find(c => c[0] === doc.field)?.[1], doc.result, doc.included ? doc.name : ''].join('\t'))),
    ].join('\r\n')
    archive.append('\uFEFF' + report, { name: 'Отчёт-экспорта.txt' })
    await check()
    await archive.finalize()
    await completion
    await check()
    await rename(partial, path.join(directory, 'export.zip'))
    job.archiveBytes = (await stat(path.join(directory, 'export.zip'))).size
    job.status = 'READY'
    job.expiresAt = new Date(Date.now() + 86_400_000).toISOString()
    await saveJob(job)
  } catch (error) {
    archive.abort()
    output.destroy()
    await completion.catch(() => undefined)
    await rm(partial, { force: true })
    throw error
  } finally {
    clearInterval(cancelTimer)
    excelOutput?.destroy()
    await rm(path.join(directory, 'document.tmp'), { force: true })
    await rm(path.join(directory, 'Реестр.xlsx'), { force: true })
  }
}
let busy = false
export async function runExportTick(): Promise<void> {
  if (busy) return
  busy = true
  let release: (() => Promise<void>) | null = null
  try {
    release = await acquireLock('worker')
    if (!release) return
    const jobs = await listJobs()
    for (const job of jobs) {
      const directory = jobDir(job.id)
      if (Date.parse(job.expiresAt) <= Date.now()) { await rm(directory, { recursive: true, force: true }); continue }
      if (await cancelled(job.id) && !['READY', 'FAILED', 'CANCELLED'].includes(job.status)) {
        job.status = 'CANCELLED'
        await saveJob(job)
        await rm(path.join(directory, 'snapshot.json'), { force: true })
        continue
      }
      if (job.status === 'RUNNING' || await stat(path.join(directory, 'working')).then(() => true, () => false)) {
        if (job.status === 'READY') { await rm(path.join(directory, 'working'), { force: true }); continue }
        job.status = 'FAILED'
        job.error = 'Сборка прервана перезапуском сервера. Создайте новую выгрузку.'
        await saveJob(job)
        for (const f of ['working', 'archive.partial', 'document.tmp', 'Реестр.xlsx']) await rm(path.join(directory, f), { force: true })
        continue
      }
      if (job.status === 'AWAITING_CONFIRMATION' && await stat(path.join(directory, 'confirmed')).then(() => true, () => false)) {
        job.status = 'QUEUED'
        await saveJob(job)
      }
      if (!['PREPARING', 'QUEUED'].includes(job.status)) continue
      await writeFile(path.join(directory, 'working'), '', { mode: 0o600 })
      try {
        if (job.status === 'PREPARING') await prepare(job)
        else await build(job)
      } catch (error) {
        const wasCancelled = error instanceof ExportCancelled || await cancelled(job.id)
        job.status = wasCancelled ? 'CANCELLED' : 'FAILED'
        job.error = wasCancelled ? undefined : 'Не удалось подготовить экспорт. Подробности в серверном журнале.'
        if (!wasCancelled) console.error('[lab-export]', job.id, error)
        await saveJob(job)
        for (const f of ['archive.partial', 'document.tmp', 'Реестр.xlsx']) await rm(path.join(directory, f), { force: true })
      } finally { await rm(path.join(directory, 'working'), { force: true }) }
      break // At most one heavy operation per tick, across local Node processes.
    }
  } finally {
    if (release) await release()
    busy = false
  }
}
