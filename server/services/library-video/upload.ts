import { createError, getHeader, setHeader, setResponseStatus, type H3Event } from 'h3';
import { randomUUID } from 'node:crypto';
import { open } from 'node:fs/promises';
import { prisma } from '../../utils/prisma';
import { libraryAdmin } from '../library/access';
import { parse } from '../library/input';
import { CHUNK_BYTES, settings, uuid, newVideoInput, categoriesExist, audit } from './core';
import { videoDirectory, videoFile } from '../../../scripts/lib/library-video-files.mjs';
export function tus(event: H3Event, check = true) {
  setHeader(event, 'Tus-Resumable', '1.0.0'); setHeader(event, 'Tus-Version', '1.0.0');
  setHeader(event, 'Cache-Control', 'private, no-store');
  if (check && getHeader(event, 'tus-resumable') !== '1.0.0') throw createError({ statusCode: 412 });
}
export async function createUpload(event: H3Event) {
  tus(event);
  const actor = await libraryAdmin(event);
  const length = getHeader(event, 'upload-length') || '';
  const totalBytes = Number(length);
  if (!/^\d+$/.test(length) || !Number.isSafeInteger(totalBytes) || totalBytes < 1 || totalBytes > (await settings()).maxBytes)
    throw createError({ statusCode: 413, message: 'Недопустимый размер видео.' });
  const meta = getHeader(event, 'upload-metadata') || '';
  if (meta.length > 12000 || !/^space [A-Za-z0-9+/]+={0,2}$/.test(meta)) throw createError({ statusCode: 400, message: 'Некорректные сведения о видео.' });
  let input: unknown;
  try { input = JSON.parse(Buffer.from(meta.slice(6), 'base64').toString('utf8')); }
  catch { throw createError({ statusCode: 400 }); }
  const value = parse(newVideoInput, input);
  const video = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19370014)`;
    const previous = await tx.libraryVideo.findUnique({ where: { clientKey: value.clientKey } });
    if (previous) {
      if (previous.createdBy !== actor.userId || previous.deletedAt || previous.fingerprint !== value.fingerprint || previous.totalBytes !== BigInt(totalBytes)) throw createError({ statusCode: 409 });
      return previous;
    }
    // Bounded drafts prevent accidental exhaustion through abandoned uploads.
    if (await tx.libraryVideo.count({ where: { deletedAt: null, status: { in: ['UPLOADING','QUEUED','PROCESSING'] } } }) >= 20)
      throw createError({ statusCode: 409, message: 'В очереди уже 20 видео. Дождитесь обработки или отмените ненужные загрузки.' });
    await categoriesExist(tx, value.categoryIds);
    const { categoryIds, ...data } = value;
    const row = await tx.libraryVideo.create({ data: { ...data, id: randomUUID(), totalBytes, createdBy: actor.userId,
      categories: { create: categoryIds.map(categoryId => ({ categoryId })) } } });
    await audit(event, tx, actor.userId, 'CREATE', row.id, { title: row.title, totalBytes });
    return row;
  }, { timeout: 15000 });
  setHeader(event, 'Location', `/api/library/videos/${video.id}/upload`);
  setResponseStatus(event, 201);
  return null;
}
async function ownedUpload(event: H3Event, id: string, write: boolean) {
  const actor = await libraryAdmin(event, write);
  const v = await prisma.libraryVideo.findUnique({ where: { id: uuid(id) } });
  if (!v || v.deletedAt) throw createError({ statusCode: 404 });
  if (v.createdBy !== actor.userId) throw createError({ statusCode: 403, message: 'Продолжить загрузку может её автор.' });
  return v;
}
export async function headUpload(event: H3Event, id: string) {
  tus(event); const v = await ownedUpload(event, id, false);
  setHeader(event, 'Upload-Length', v.totalBytes.toString()); setHeader(event, 'Upload-Offset', v.offset.toString());
  setHeader(event, 'X-Space-Fingerprint', v.fingerprint);
  setHeader(event, 'X-Space-Video-Status', v.status);
  setResponseStatus(event, 200); return null;
}
export async function patchUpload(event: H3Event, id: string) {
  tus(event); const v = await ownedUpload(event, id, true);
  if (getHeader(event, 'content-type') !== 'application/offset+octet-stream') throw createError({ statusCode: 415 });
  const offset = getHeader(event, 'upload-offset') || '';
  if (!/^\d+$/.test(offset) || offset !== v.offset.toString() || v.status !== 'UPLOADING') throw createError({ statusCode: 409 });
  const sizeHeader = Number(getHeader(event, 'content-length') || 0);
  if (sizeHeader > CHUNK_BYTES) throw createError({ statusCode: 413 });
  // Receive only a bounded chunk, BEFORE acquiring a DB lease. Interrupted requests change no offset.
  let size = 0; const buffers: Buffer[] = [];
  const timer = setTimeout(() => event.node.req.destroy(), 120000);
  try {
    for await (const chunk of event.node.req) {
      const b = Buffer.from(chunk); size += b.length;
      if (size > CHUNK_BYTES || v.offset + BigInt(size) > v.totalBytes) throw createError({ statusCode: 413 });
      buffers.push(b);
    }
  } finally { clearTimeout(timer); }
  if (!size) throw createError({ statusCode: 400 });
  const chunkId = randomUUID(); await videoDirectory(id);
  const file = videoFile(`${id}/${chunkId}.part`);
  const handle = await open(file, 'wx', 0o640);
  try { await handle.writeFile(Buffer.concat(buffers)); await handle.sync(); } finally { await handle.close(); }
  const next = v.offset + BigInt(size);
  try {
    await prisma.$transaction(async tx => {
      const result = await tx.libraryVideo.updateMany({ where: { id, offset: v.offset, status: 'UPLOADING', deletedAt: null },
        data: { offset: next, ...(next === v.totalBytes ? { status: 'QUEUED' } : {}) } });
      if (result.count !== 1) throw createError({ statusCode: 409 });
      await tx.libraryVideoChunk.create({ data: { id: chunkId, videoId: id, offset: v.offset, size } });
    });
  } catch (error) {
    // A lost DB response may mean commit succeeded: never remove a potentially committed chunk here.
    // Unreferenced files are safe to remove only by the explicit maintenance command.
    throw error;
  }
  setHeader(event, 'Upload-Offset', next.toString()); setResponseStatus(event, 204); return null;
}
