import { PrismaClient } from '@prisma/client';
import { claim, processVideo } from './lib/library-video-process.mjs';
process.umask(0o027);
const db = new PrismaClient(), stop = new AbortController();
process.on('SIGTERM', () => stop.abort()); process.on('SIGINT', () => stop.abort());
try {
  do {
    const job = await claim(db);
    if (job) await processVideo(db, job, stop.signal);
    if (process.argv.includes('--once')) break;
    if (!stop.signal.aborted) await new Promise(resolve => {
      const done = () => { clearTimeout(timer); stop.signal.removeEventListener('abort',done); resolve(); };
      const timer = setTimeout(done, 5000); stop.signal.addEventListener('abort',done,{once:true});
    });
  } while (!stop.signal.aborted);
} finally { await db.$disconnect(); }
