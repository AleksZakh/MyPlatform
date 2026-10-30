import path from 'node:path';
import { mkdir, lstat, realpath, open, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { createError, type H3Event } from 'h3';

export const projectFilesRoot = path.resolve(process.env.WORK_PROJECT_FILES_ROOT || path.join(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files', '..', 'projects'));
const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
export function projectFileLimit() {
  const limit = Number(process.env.WORK_PROJECT_FILE_MAX_BYTES || 104857600);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1073741824) throw new Error('WORK_PROJECT_FILE_MAX_BYTES must be 1..1073741824');
  return limit;
}
async function directory(parts: string[], create: boolean) {
  if (create) await mkdir(projectFilesRoot, { recursive: true, mode: 0o750 });
  const rootStat = await lstat(projectFilesRoot);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) throw new Error('Unsafe project storage root');
  const root = await realpath(projectFilesRoot);
  let current = root;
  for (const part of parts) {
    current = path.join(current, part);
    if (create) await mkdir(current, { mode: 0o750 }).catch(e => { if (e.code !== 'EEXIST') throw e; });
    const stat = await lstat(current);
    if (stat.isSymbolicLink() || !stat.isDirectory() || await realpath(current) !== current) throw new Error('Unsafe project directory');
  }
  return current;
}
function idSegment(id: number) {
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw new Error('Invalid ID');
  return String(id);
}
export async function ensureProjectDirectory(projectId: number) {
  const id = idSegment(projectId);
  await directory([id, 'shared'], true);
  await directory([id, 'private'], true);
  return path.join(projectFilesRoot, id);
}
export async function ensureContractDirectory(projectId:number,contractId:number) {
 await directory([idSegment(projectId),'contracts',idSegment(contractId),'shared'],true);
 await directory([idSegment(projectId),'contracts',idSegment(contractId),'private'],true);
}
function parts(projectId: number, ownerId: number, scope: string, contractId?:number|null) {
  const prefix=contractId?[idSegment(projectId),'contracts',idSegment(contractId)]:[idSegment(projectId)];
  if (scope === 'SHARED') return [...prefix, 'shared'];
  if (scope === 'PRIVATE') return [...prefix, 'private', idSegment(ownerId)];
  throw new Error('Invalid file scope');
}
export async function receiveProjectFile(event: H3Event, projectId: number, ownerId: number, scope: string, expected: number, contractId?:number|null) {
  const dir = await directory(parts(projectId, ownerId, scope, contractId), true);
  const storageKey = randomUUID(), destination = path.join(dir, storageKey);
  const file = await open(destination, 'wx', 0o640);
  const hash = createHash('sha256'); let bytes = 0;
  const timer = setTimeout(() => event.node.req.destroy(new Error('Upload timed out')), 15 * 60_000);
  timer.unref();
  try {
    for await (const chunk of event.node.req) {
      const buffer = Buffer.from(chunk); bytes += buffer.length;
      if (bytes > expected || bytes > projectFileLimit()) throw createError({ statusCode: 413, message: 'Превышен размер файла.' });
      hash.update(buffer);
      let offset = 0;
      while (offset < buffer.length) offset += (await file.write(buffer, offset, buffer.length - offset)).bytesWritten;
    }
    if (bytes !== expected) throw createError({ statusCode: 400, message: 'Файл передан не полностью.' });
    await file.sync();
    return { storageKey, size: bytes, sha256: hash.digest('hex') };
  } catch (error) {
    await file.close(); await unlink(destination).catch(() => {}); throw error;
  } finally { clearTimeout(timer); await file.close().catch(() => {}); }
}
export async function openProjectFile(file: { contractId?:number|null; projectId: number; ownerId: number; scope: string; storageKey: string; size: number }) {
  if (!uuid.test(file.storageKey)) throw new Error('Invalid file key');
  const dir = await directory(parts(file.projectId, file.ownerId, file.scope, file.contractId), false);
  const handle = await open(path.join(dir, file.storageKey), constants.O_RDONLY | constants.O_NOFOLLOW);
  const stat = await handle.stat();
  if (!stat.isFile() || stat.size !== file.size) { await handle.close(); throw new Error('Missing or damaged project file'); }
  return handle;
}
