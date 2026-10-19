import { createReadStream } from 'node:fs';
import { createError, getHeader, getMethod, setHeader, setResponseStatus, sendStream, type H3Event } from 'h3';
import { readVideo } from './core';
import { byteRange, checkedVideoFile } from '../../../scripts/lib/library-video-files.mjs';
export async function deliver(event: H3Event, id: string, poster = false) {
  const { video } = await readVideo(event, id);
  const relative = poster ? video.posterPath : video.mediaPath;
  if (video.status !== 'READY' || !relative) throw createError({ statusCode: 404, message: 'Видео ещё не готово.' });
  let file;
  try { file = await checkedVideoFile(relative); } catch { throw createError({ statusCode: 404, message: 'Файл отсутствует.' }); }
  setHeader(event, 'Content-Type', poster ? 'image/jpeg' : 'video/mp4');
  setHeader(event, 'X-Content-Type-Options', 'nosniff');
  setHeader(event, 'Content-Disposition', `inline; filename="${poster ? 'poster.jpg' : 'video.mp4'}"`);
  setHeader(event, 'Accept-Ranges', 'bytes');
  if (process.env.LIBRARY_VIDEO_X_ACCEL === '1') {
    // Nginx internal location enforces range handling. No public alias to this storage.
    setHeader(event, 'X-Accel-Redirect', '/_space-library-video/' + relative);
    event.node.res.end(); return;
  }
  let range;
  try { range = byteRange(getHeader(event, 'range'), file.size); }
  catch { setHeader(event, 'Content-Range', `bytes */${file.size}`); throw createError({ statusCode: 416 }); }
  if (range) { setResponseStatus(event, 206); setHeader(event, 'Content-Range', `bytes ${range.start}-${range.end}/${file.size}`); }
  setHeader(event, 'Content-Length', range ? range.end - range.start + 1 : file.size);
  if (getMethod(event) === 'HEAD') { event.node.res.end(); return; }
  return sendStream(event, createReadStream(file.file, range || undefined));
}
