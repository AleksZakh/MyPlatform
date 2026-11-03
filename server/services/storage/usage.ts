import path from 'node:path';
import { constants } from 'node:fs';
import { lstat, open, opendir, realpath } from 'node:fs/promises';
import type { DepartmentStorage, StorageUsageReport, StorageUsageRow } from '../../../shared/types/department-storage';

/** Physical allocated bytes, bounded traversal through directory descriptors (Linux).
 * Private/deleted files are counted without exposing names. No files are opened for content. */
export async function measureDepartmentStorage(input: {
  storage: string; projects: string; departments: DepartmentStorage[];
  projectOwners: Map<number, string>; maxEntries?: number; maxMs?: number;
}): Promise<StorageUsageReport> {
  const started = Date.now(), warnings = new Set<string>(), seen = new Set<string>();
  let entries = 0, exhausted = false;
  const rows = new Map<string, StorageUsageRow>();
  for (const d of input.departments) rows.set(d.key, { key: d.key, name: d.name, bytes: 0, logicalBytes: 0, files: 0, percent: null });
  for (const [key, name] of [['projects', 'Общие проекты'], ['other', 'Не распределено / служебные файлы']]) rows.set(key!, { key: key!, name: name!, bytes: 0, logicalBytes: 0, files: 0, percent: null });
  const fail = (message: string) => { warnings.add(message); };
  let storage = path.resolve(input.storage), projects = path.resolve(input.projects);
  for (const key of ['storage', 'projects'] as const) {
    try { const actual = await realpath(input[key]); if (key === 'storage') storage = actual; else projects = actual; }
    catch { fail(key === 'storage' ? 'Общий каталог хранилища недоступен.' : 'Каталог файлов проектов отсутствует или недоступен.'); }
  }
  if (storage === projects) throw new Error('Общее хранилище и хранилище проектов не должны совпадать');
  const owner = (absolute: string) => {
    if (absolute === projects || absolute.startsWith(projects + path.sep)) {
      const first = path.relative(projects, absolute).split(path.sep)[0] || '';
      return /^\d+$/.test(first) ? input.projectOwners.get(Number(first)) || 'projects' : 'projects';
    }
    const rel = path.relative(storage, absolute).split(path.sep).join('/');
    return input.departments.find(d => rel === d.path || rel.startsWith(d.path + '/'))?.key || 'other';
  };
  const budget = () => {
    if (++entries > (input.maxEntries ?? 150000) || Date.now() - started > (input.maxMs ?? 20000)) {
      exhausted = true; fail('Достигнут лимит проверки. Объёмы и проценты относятся только к проверенной части.'); return false;
    }
    return true;
  };
  async function walk(accessPath: string, actualPath: string, depth = 0): Promise<void> {
    if (exhausted || !budget()) return;
    if (depth > 80) { fail('Пропущены слишком глубоко вложенные каталоги.'); return; }
    let st;
    try { st = await lstat(accessPath); } catch { fail('Часть файлов недоступна или изменилась во время проверки.'); return; }
    if (st.isSymbolicLink()) { fail('Символические ссылки пропущены; внешние каталоги по ссылкам не обходятся.'); return; }
    if (!st.isDirectory() && !st.isFile()) { fail('Специальные файлы пропущены.'); return; }
    const inode = st.dev + ':' + st.ino;
    if (seen.has(inode)) return;
    const row = rows.get(owner(actualPath)) || rows.get('other')!;
    if (st.isFile()) {
      seen.add(inode); row.bytes += st.blocks * 512; row.logicalBytes += st.size; row.files++;
      return;
    }
    let handle;
    try {
      handle = await open(accessPath, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      const current = await handle.stat();
      if (current.dev !== st.dev || current.ino !== st.ino) { fail('Каталог изменился во время проверки.'); return; }
      seen.add(inode); row.bytes += current.blocks * 512;
      const fdPath = '/proc/self/fd/' + handle.fd;
      for await (const entry of await opendir(fdPath)) {
        await walk(path.join(fdPath, entry.name), path.join(actualPath, entry.name), depth + 1);
        if (exhausted) break;
      }
    } catch { fail('Часть каталогов недоступна для чтения.'); }
    finally { await handle?.close(); }
  }
  // If roots overlap, paths are still classified by ownership and inodes counted once.
  await walk(storage, storage);
  await walk(projects, projects);
  const values = [...rows.values()], totalBytes = values.reduce((n, r) => n + r.bytes, 0);
  if (!Number.isSafeInteger(totalBytes)) throw new Error('Размер хранилища выходит за допустимый диапазон');
  for (const r of values) r.percent = totalBytes ? Math.round(r.bytes / totalBytes * 1000) / 10 : 0;
  return { checkedAt: new Date().toISOString(), durationMs: Date.now() - started, status: warnings.size ? 'partial' : 'complete',
    totalBytes, rows: values, warnings: [...warnings] };
}
