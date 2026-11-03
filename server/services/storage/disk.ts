import { execFile } from 'node:child_process';
import { stat, statfs } from 'node:fs/promises';
import { createError, setHeader, type H3Event } from 'h3';
import { z } from 'zod';
import { getAccessActor } from '../access-control.service';
import { storageRoot } from './paths';
import type { DiskScanReport, DiskSummary, DiskVolume } from '../../../shared/types/disk-management';

export async function diskAdmin(event: H3Event) {
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (event.context.externalSessionRevoked) throw createError({ statusCode: 401 });
  const actor = await getAccessActor(event);
  if (!actor.isSystemAdmin) throw createError({ statusCode: 403, message: 'Управление диском доступно только системному администратору.' });
  return actor.user;
}

export function volumeNumbers(s: { blocks: bigint; bsize: bigint; bfree: bigint; bavail: bigint; files: bigint; ffree: bigint }) {
  const number = (value: bigint) => {
    const n = Number(value);
    if (!Number.isSafeInteger(n) || n < 0) throw new Error('Invalid filesystem counters');
    return n;
  };
  const total = number(s.blocks * s.bsize), used = number((s.blocks - s.bfree) * s.bsize);
  const available = number(s.bavail * s.bsize), reserved = number((s.bfree - s.bavail) * s.bsize);
  return { total, used, available, reserved, usedPercent: used + available ? Math.round(used / (used + available) * 1000) / 10 : 0,
    inodes: number(s.files), freeInodes: number(s.ffree) };
}

export async function diskSummary(): Promise<DiskSummary> {
  const volumes: DiskVolume[] = [], warnings: string[] = [];
  // Fixed server-side roots; a browser cannot request arbitrary paths.
  for (const path of [...new Set(['/', '/var/www/space/releases', storageRoot])]) {
    try {
      const [info, space] = await Promise.all([stat(path), statfs(path, { bigint: true })]);
      const id = String(info.dev), existing = volumes.find(v => v.id === id);
      if (existing) existing.paths.push(path);
      else volumes.push({ id, paths: [path], ...volumeNumbers(space) });
    } catch { warnings.push('Не удалось проверить файловую систему для ' + path); }
  }
  return { checkedAt: new Date().toISOString(), volumes, warnings };
}

const bytes = z.number().int().min(0).max(Number.MAX_SAFE_INTEGER);
const reportSchema = z.object({
  version: z.literal(1), status: z.enum(['complete', 'partial', 'busy', 'unavailable']), checkedAt: z.string().max(80),
  durationMs: bytes, candidateBytes: bytes,
  policy: z.object({ keepLatest: z.literal(3), logDays: z.literal(30) }),
  warnings: z.array(z.string().max(1000)).max(30),
  items: z.array(z.object({ path: z.string().max(4096), category: z.enum(['release', 'log']),
    status: z.enum(['candidate', 'protected', 'review']), bytes: bytes.nullable(), reclaimable: bytes,
    reason: z.string().max(1000), modifiedAt: z.string().max(80).nullable() })).max(300),
});
export function parseDiskReport(raw: string): DiskScanReport {
  const result = reportSchema.parse(JSON.parse(raw));
  const sum = result.items.reduce((n, item) => n + (item.status === 'candidate' ? item.reclaimable : 0), 0);
  if (!Number.isSafeInteger(sum) || sum !== result.candidateBytes) throw new Error('Invalid report total');
  return result;
}

let running = false, nextScan = 0;
export async function scanDisk(): Promise<DiskScanReport> {
  if (running || Date.now() < nextScan) throw createError({ statusCode: 429, message: 'Проверка уже выполняется или запускалась недавно. Повторите через минуту.' });
  running = true;
  nextScan = Date.now() + 60000;
  try {
    const raw = await new Promise<string>((resolve, reject) => {
      execFile('/usr/bin/sudo', ['-n', '--', '/usr/local/sbin/space-disk-report'], {
        cwd: '/', timeout: 40000, maxBuffer: 1024 * 1024, killSignal: 'SIGTERM',
        env: { PATH: '/usr/sbin:/usr/bin:/sbin:/bin', LANG: 'C.UTF-8' },
      }, (error, stdout) => error ? reject(error) : resolve(stdout));
    });
    try { return parseDiskReport(raw); }
    catch { throw createError({ statusCode: 502, message: 'Служба проверки вернула некорректный отчёт. Проверьте её установку.' }); }
  } catch (error: any) {
    if (error.statusCode) throw error;
    if (error.killed || error.signal === 'SIGKILL') throw createError({ statusCode: 504, message: 'Проверка не уложилась в отведённое время. Повторите позже.' });
    throw createError({ statusCode: 503, message: 'Служба проверки диска недоступна. Установите space-disk-report и правило sudo из инструкции обновления.' });
  } finally { running = false; }
}
