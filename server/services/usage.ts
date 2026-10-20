import { STATISTICS_OWNER_LOGIN } from './usage-owner';
import { randomUUID } from 'node:crypto';
import { prisma } from '../utils/prisma';
import type { USAGE_KINDS } from '../../shared/usage';
type Entry = { id?: string; actorId: number; recipientId?: number | null; kind: keyof typeof USAGE_KINDS; target: string; source?: 'CLIENT' | 'SERVER'; occurredAt?: Date };
type QueuedEntry = Omit<Entry, 'id'|'source'|'occurredAt'> & { id:string; source:'CLIENT'|'SERVER'; occurredAt:Date };
const queue: QueuedEntry[] = [];
let busy = false, lastCleanup = 0, dropped = 0, lastErrorAt: string | null = null;
let received=0, saved=0, excluded=0, lastReceivedAt:string|null=null, lastSavedAt:string|null=null, lastFlushAt:string|null=null, lastErrorCode:string|null=null;
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
  received++; lastReceivedAt=new Date().toISOString();
  queue.push({ ...entry, id: entry.id || randomUUID(), source: entry.source || 'SERVER', target: entry.target.slice(0,200), occurredAt: entry.occurredAt || new Date() });
}
export const usageHealth = () => ({ pending: queue.length, dropped, lastErrorAt, lastErrorCode, received, saved, excluded, lastReceivedAt, lastSavedAt, lastFlushAt, enabled: process.env.SPACE_STATISTICS_ENABLED !== '0', retentionDays: Math.min(365, Math.max(7, Number(process.env.SPACE_STATISTICS_RETENTION_DAYS) || 90)) });
export async function flushUsage() {
  if (busy || process.env.SPACE_STATISTICS_ENABLED === '0') return; busy = true;
  try {
    if (queue.length) {
      const batch=queue.slice(0,100);
      // Filter the actor, never the recipient. One atomic statement avoids a separate
      // owner lookup blocking the entire queue; null logins are not treated as owner.
      const result=await prisma.$queryRaw<{saved:number;excluded:number}[]>`
        WITH batch AS (
          SELECT * FROM jsonb_to_recordset(${JSON.stringify(batch)}::jsonb)
          AS e(id text, "actorId" integer, "recipientId" integer, kind text, target text, source text, "occurredAt" timestamp)
        ), eligible AS (
          SELECT e.* FROM batch e
          WHERE NOT EXISTS (SELECT 1 FROM app_users u WHERE u.id=e."actorId"
            AND u."authType"='DOMAIN' AND lower(coalesce(u.login,''))=${STATISTICS_OWNER_LOGIN})
        ), inserted AS (
          INSERT INTO usage_events (id,"actorId","recipientId",kind,target,source,"occurredAt")
          SELECT id,"actorId","recipientId",kind,target,source,"occurredAt" FROM eligible
          ON CONFLICT (id) DO NOTHING RETURNING id
        ) SELECT (SELECT count(*)::integer FROM inserted) AS saved,
          ((SELECT count(*) FROM batch)-(SELECT count(*) FROM eligible))::integer AS excluded`;
      saved+=result[0]?.saved||0; excluded+=result[0]?.excluded||0;
      if(result[0]?.saved)lastSavedAt=new Date().toISOString();
      queue.splice(0,batch.length);
      lastErrorAt=null; lastErrorCode=null;
    }
    lastFlushAt=new Date().toISOString();
    if (Date.now() - lastCleanup > 3600000) {
      const cutoff = new Date(Date.now() - usageHealth().retentionDays * 86400000);
      await prisma.$executeRaw`DELETE FROM usage_events WHERE id IN (SELECT id FROM usage_events WHERE "occurredAt" < ${cutoff} ORDER BY "occurredAt" LIMIT 10000)`;
      lastCleanup = Date.now();
    }
  } catch (error) {
    lastErrorAt = new Date().toISOString();
    const code=(error as {code?:unknown})?.code;
    lastErrorCode=typeof code==='string' && /^[A-Z0-9_]{1,40}$/.test(code)?code:'WRITE_FAILED';
    console.warn('[usage] Не удалось сохранить статистику; повторим позже.', {code:lastErrorCode,pending:queue.length});
  } finally { busy = false; }
}
