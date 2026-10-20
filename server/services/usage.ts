import { randomUUID } from 'node:crypto';
import { prisma } from '../utils/prisma';
import type { USAGE_KINDS } from '../../shared/usage';
type Entry = { id?: string; actorId: number; recipientId?: number | null; kind: keyof typeof USAGE_KINDS; target: string; source?: 'CLIENT' | 'SERVER'; occurredAt?: Date };
type QueuedEntry = Omit<Entry, 'id'|'source'|'occurredAt'> & { id:string; source:'CLIENT'|'SERVER'; occurredAt:Date };
const queue: QueuedEntry[] = [];
let busy = false, lastCleanup = 0, dropped = 0, lastErrorAt: string | null = null;
const recent = new Map<string, number>();
const rates = new Map<number, {start:number; count:number}>();
export function recordUsage(entry: Entry, dedupeMs = 0) {
  if (process.env.SPACE_STATISTICS_ENABLED === '0' || !Number.isInteger(entry.actorId) || entry.actorId <= 0) return;
  const now = Date.now(), key = `${entry.actorId}:${entry.kind}:${entry.target}`;
  if (dedupeMs && now - (recent.get(key) || 0) < dedupeMs) return;
  if (dedupeMs) { recent.set(key, now); if (recent.size > 5000) recent.delete(recent.keys().next().value!); }
  if (queue.length >= 5000) { dropped++; return; }
  if (entry.source === 'CLIENT') {
    let rate = rates.get(entry.actorId);
    if (!rate || now-rate.start>=60000) { rate={start:now,count:0}; rates.set(entry.actorId,rate); }
    if (++rate.count>120) { dropped++; return; }
    if(rates.size>5000) rates.delete(rates.keys().next().value!);
  }
  queue.push({ ...entry, id: entry.id || randomUUID(), source: entry.source || 'SERVER', target: entry.target.slice(0,200), occurredAt: entry.occurredAt || new Date() });
}
export const usageHealth = () => ({ pending: queue.length, dropped, lastErrorAt, enabled: process.env.SPACE_STATISTICS_ENABLED !== '0', retentionDays: Math.min(365, Math.max(7, Number(process.env.SPACE_STATISTICS_RETENTION_DAYS) || 90)) });
export async function flushUsage() {
  if (busy) return; busy = true;
  try {
    if (queue.length) { const batch = queue.slice(0,100); await prisma.usageEvent.createMany({ data: batch, skipDuplicates: true }); queue.splice(0,batch.length); }
    if (Date.now() - lastCleanup > 3600000 && process.env.SPACE_STATISTICS_ENABLED !== '0') {
      lastCleanup = Date.now();
      const cutoff = new Date(Date.now() - usageHealth().retentionDays * 86400000);
      await prisma.$executeRaw`DELETE FROM usage_events WHERE id IN (SELECT id FROM usage_events WHERE "occurredAt" < ${cutoff} ORDER BY "occurredAt" LIMIT 10000)`;
    }
  } catch { lastErrorAt = new Date().toISOString(); console.warn('[usage] Не удалось сохранить статистику; основная работа продолжается.'); }
  finally { busy = false; }
}
