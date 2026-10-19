import { createError, type H3Event } from 'h3';
import { z } from 'zod';
import { prisma } from '../../utils/prisma';
import { libraryReader, libraryAdmin } from '../library/access';
import { parse } from '../library/input';
import { writeAuditEvent } from '../../utils/auditLog';
import type { Prisma, LibraryVideo } from '@prisma/client';
export const CHUNK_BYTES = 8 * 1024 * 1024;
export const videoInput = z.object({
  title: z.string().trim().min(1).max(500),
  description: z.string().trim().max(20000).default(''),
  author: z.string().trim().max(500).default(''),
  categoryIds: z.array(z.number().int().positive()).min(1).max(30).transform(v => [...new Set(v)]),
});
export const newVideoInput = videoInput.extend({
  clientKey: z.string().uuid(), filename: z.string().min(1).max(255).regex(/\.mp4$/i),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export function uuid(value: unknown): string { return parse(z.string().uuid(), value); }
export async function settings() {
  const row = await prisma.libraryVideoSettings.findUnique({ where: { id: 1 } });
  return { maxBytes: Number(row?.maxBytes ?? BigInt(3221225472)), chunkBytes: CHUNK_BYTES };
}
// Keep authorization here: future restricted audiences must also be enforced on media and progress.
export async function readVideo(event: H3Event, id: string) {
  const user = await libraryReader(event);
  const video = await prisma.libraryVideo.findUnique({ where: { id: uuid(id) }, include: { categories: true } });
  if (!video) throw createError({ statusCode: 404, message: 'Видео не найдено.' });
  if (video.deletedAt || video.status !== 'READY') await libraryAdmin(event, false);
  return { video, user };
}
export function videoDto(video: LibraryVideo & { categories?: unknown }) {
  const { leaseToken, leaseUntil, mediaPath, posterPath, sourcePath, fingerprint, clientKey, ...v } = video;
  return { ...v, totalBytes: Number(v.totalBytes), offset: Number(v.offset), mediaBytes: v.mediaBytes === null ? null : Number(v.mediaBytes), hasPoster: !!posterPath };
}
export async function categoriesExist(tx: Prisma.TransactionClient, ids: number[]) {
  if (await tx.libraryCategory.count({ where: { id: { in: ids } } }) !== ids.length)
    throw createError({ statusCode: 400, message: 'Один из разделов удалён.' });
}
export async function audit(event: H3Event, tx: Prisma.TransactionClient, actor: number, action: string, id: string, details: object) {
  await writeAuditEvent({ event, db: tx, category: 'DATA', result: 'SUCCESS', action,
    resourceKey: 'library.manage', entityType: 'LibraryVideo', actorUserId: actor,
    note: `Видео ${id}: ${action}`, afterData: JSON.parse(JSON.stringify(details)) });
}
