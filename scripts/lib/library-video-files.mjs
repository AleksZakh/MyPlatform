import path from 'node:path';
import { mkdir, lstat, realpath } from 'node:fs/promises';
export const videoRoot = path.resolve(process.env.LIBRARY_FILES_ROOT || path.join(process.env.LAB_FILES_ROOT || '/var/www/uploads-storage/files', '..', 'library'), 'video');
export function videoFile(relative) {
  if (!/^[a-f0-9-]{36}\/(?:[a-f0-9-]{36}\.(?:part|source\.mp4|mp4|jpg))$/.test(relative)) throw new Error('Invalid media path');
  return path.join(videoRoot, relative);
}
export async function videoDirectory(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Invalid video ID');
  const dir = path.join(videoRoot, id);
  await mkdir(dir, { recursive: true, mode: 0o750 });
  const s = await lstat(dir);
  if (!s.isDirectory() || s.isSymbolicLink() || await realpath(dir) !== path.join(await realpath(videoRoot), id)) throw new Error('Unsafe video directory');
  return dir;
}
export async function checkedVideoFile(relative) {
  const file = videoFile(relative), stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink() || await realpath(file) !== path.join(await realpath(videoRoot), relative)) throw new Error('Missing or unsafe media file');
  return { file, size: stat.size };
}
export function byteRange(header, size) {
  if (!header) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!m || (!m[1] && !m[2])) throw new Error('range');
  const start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
  if (![start, end].every(Number.isSafeInteger) || start < 0 || start > end || start >= size) throw new Error('range');
  return { start, end };
}
