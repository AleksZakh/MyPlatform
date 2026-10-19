import { spawn } from 'node:child_process';
import { open, stat, unlink, statfs } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { videoRoot, videoDirectory, videoFile, checkedVideoFile } from './library-video-files.mjs';
export function runMedia(binary, args, signal, timeout = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore','pipe','pipe'], signal, timeout, killSignal: 'SIGKILL' });
    let out = '', error = '';
    child.stdout.on('data', b => { out += b.toString(); if (out.length > 2_000_000) child.kill('SIGKILL'); });
    child.stderr.on('data', b => { error = (error + b.toString()).slice(-12000); });
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(out) : reject(new Error(`Media tool failed (${code}): ${error.slice(-1000)}`)));
  });
}
export async function probe(file, signal) {
  const data = JSON.parse(await runMedia(process.env.FFPROBE_PATH || '/usr/bin/ffprobe', [
    '-v','error','-f','mov','-protocol_whitelist','file,pipe','-enable_drefs','0','-show_entries',
    'format=duration,format_name:stream=codec_type,codec_name,width,height,pix_fmt','-of','json',file,
  ], signal));
  const video = data.streams?.find(s => s.codec_type === 'video');
  const audio = data.streams?.find(s => s.codec_type === 'audio');
  const duration = Number(data.format?.duration);
  if (!data.format?.format_name?.split(',').includes('mp4') || !video || !Number.isFinite(duration) || duration <= 0 || duration > 14400 || video.width > 8192 || video.height > 8192)
    throw new Error('Нужен корректный MP4 длительностью до 4 часов и разрешением до 8K.');
  return { duration, video, audio };
}
export async function claim(db) {
  return db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(19370015)`;
    const now = new Date();
    if (await tx.libraryVideo.count({ where: { status: 'PROCESSING', leaseUntil: { gt: now } } })) return null;
    const row = await tx.libraryVideo.findFirst({ where: { deletedAt: null, OR: [{ status: 'QUEUED' }, { status: 'PROCESSING', leaseUntil: { lt: now } }] }, orderBy: { createdAt: 'asc' } });
    if (!row) return null;
    return tx.libraryVideo.update({ where: { id: row.id }, data: { status: 'PROCESSING', leaseToken: randomUUID(), leaseUntil: new Date(Date.now()+90000), error: null } });
  });
}
export async function processVideo(db, job, outerSignal) {
  const controller = new AbortController(); const abort = () => controller.abort();
  outerSignal?.addEventListener('abort', abort, { once: true });
  if (outerSignal?.aborted) controller.abort();
  let heartBusy = false, committed = false;
  const heartbeat = setInterval(async () => {
    if (heartBusy) return; heartBusy = true;
    try {
      const r = await db.libraryVideo.updateMany({ where: { id: job.id, leaseToken: job.leaseToken, status: 'PROCESSING', deletedAt: null }, data: { leaseUntil: new Date(Date.now()+90000) } });
      if (!r.count) controller.abort();
    } catch { controller.abort(); } finally { heartBusy = false; }
  }, 15000);
  const source = `${job.id}/${job.leaseToken}.source.mp4`, media = `${job.id}/${job.leaseToken}.mp4`, poster = `${job.id}/${job.leaseToken}.jpg`;
  const generated = [source, media, poster];
  try {
    await videoDirectory(job.id);
    const capacity = await statfs(videoRoot);
    if (capacity.bavail * capacity.bsize < Number(job.totalBytes)*3 + 1024**3) throw new Error('Недостаточно свободного места для обработки.');
    const chunks = await db.libraryVideoChunk.findMany({ where: { videoId: job.id }, orderBy: { offset: 'asc' } });
    const dest = await open(videoFile(source), 'wx', 0o640);
    let offset = 0n;
    try {
      for (const chunk of chunks) {
        controller.signal.throwIfAborted();
        if (chunk.offset !== offset) throw new Error('Неполная загрузка.');
        const part = await checkedVideoFile(`${job.id}/${chunk.id}.part`);
        if (part.size !== chunk.size) throw new Error('Неверный размер части видео.');
        const input = await open(part.file, 'r');
        try { for await (const buffer of input.createReadStream()) { await dest.writeFile(buffer); } } finally { await input.close(); }
        offset += BigInt(chunk.size);
      }
      if (offset !== job.totalBytes) throw new Error('Неполная загрузка.');
      await dest.sync();
    } finally { await dest.close(); }
    const info = await probe(videoFile(source), controller.signal);
    // Already compatible footage is remuxed, not re-encoded. Other MP4 codecs are converted.
    const compatible = info.video.codec_name === 'h264' && info.video.pix_fmt === 'yuv420p' && (!info.audio || info.audio.codec_name === 'aac');
    const maxOutput = Math.max(Number(job.totalBytes)*2, 1024**3);
    const codec = compatible ? ['-c','copy'] : ['-vf',"scale=w='min(1920,iw)':h='min(1080,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2",'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k'];
    await runMedia(process.env.FFMPEG_PATH || '/usr/bin/ffmpeg', ['-v','error','-nostdin','-n','-threads','2','-filter_threads','1','-protocol_whitelist','file,pipe','-enable_drefs','0','-f','mov','-i',videoFile(source),'-map','0:v:0','-map','0:a:0?','-sn','-dn',...codec,'-threads','2','-movflags','+faststart','-fs',String(maxOutput),videoFile(media)], controller.signal, 4*60*60*1000);
    const output = await probe(videoFile(media), controller.signal);
    if (Math.abs(output.duration-info.duration) > Math.max(2, info.duration*0.002)) throw new Error('Полученное видео неполное. Требуется проверка исходного файла или лимита обработки.');
    await runMedia(process.env.FFMPEG_PATH || '/usr/bin/ffmpeg', ['-v','error','-nostdin','-n','-threads','2','-filter_threads','1','-ss',String(Math.min(3, info.duration/2)),'-i',videoFile(media),'-frames:v','1','-vf','scale=640:-2','-threads','2',videoFile(poster)], controller.signal);
    // Publish only complete files belonging to the current lease. Older workers cannot overwrite them.
    const result = await db.libraryVideo.updateMany({ where: { id: job.id, leaseToken: job.leaseToken, status: 'PROCESSING', deletedAt: null }, data: {
      status: 'READY', duration: output.duration, mediaPath: media, posterPath: poster, sourcePath: source,
      mediaBytes: (await stat(videoFile(media))).size, leaseToken: null, leaseUntil: null, error: null,
    } });
    committed = result.count === 1;
    if (!committed) throw new Error('Задание отменено или передано другому обработчику.');
    console.log(JSON.stringify({ event: 'video.ready', id: job.id, duration: output.duration }));
    // Published output and original are durable. Remove duplicate chunk rows, then their files.
    await db.libraryVideoChunk.deleteMany({ where: { videoId: job.id } });
    for (const chunk of chunks) await unlink(videoFile(`${job.id}/${chunk.id}.part`)).catch(() => {});
  } catch (error) {
    // A database timeout on publish can occur after commit. Preserve output if status cannot be checked.
    let safeToRemove = false;
    try {
      const current = await db.libraryVideo.findUnique({ where: { id: job.id } });
      if (current?.mediaPath === media) committed = true;
      safeToRemove = !committed;
      if (!committed) await db.libraryVideo.updateMany({ where: { id: job.id, leaseToken: job.leaseToken, status: 'PROCESSING' }, data: {
        status: outerSignal?.aborted || current?.deletedAt ? 'QUEUED' : 'ERROR', leaseToken: null, leaseUntil: null,
        error: outerSignal?.aborted ? null : 'Не удалось обработать видео. Администратору: проверьте журнал обработчика и повторите обработку.',
      } });
    } catch { /* lease will expire; preserve files until a maintenance review */ }
    if (safeToRemove) for (const file of generated) await unlink(videoFile(file)).catch(() => {});
    if (!committed) console.error(JSON.stringify({ event: 'video.error', id: job.id, message: String(error.message).slice(0,1500) }));
  } finally {
    clearInterval(heartbeat); outerSignal?.removeEventListener('abort', abort);
  }
}
