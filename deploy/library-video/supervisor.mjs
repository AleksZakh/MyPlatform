// Installed in /etc/space. Each job resolves current, so release switch/rollback is respected.
import { realpath, access } from 'node:fs/promises';
import { spawn } from 'node:child_process';
let stopping = false, child;
function stop() { stopping = true; child?.kill('SIGTERM'); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);
while (!stopping) {
  try {
    const release = await realpath('/var/www/space/current');
    const script = release + '/scripts/library-video-worker.mjs';
    await access(script);
    const code = await new Promise((resolve, reject) => {
      child = spawn('/usr/bin/node', ['--env-file=/etc/space/space.env', script, '--once'], { cwd: release, env: process.env, stdio: 'inherit' });
      child.once('error', reject); child.once('exit', resolve);
    });
    if (code) console.error('Video worker exit:', code);
  } catch (error) { console.error('Video worker unavailable:', error.message); }
  child = null;
  if (!stopping) await new Promise(resolve => setTimeout(resolve,5000));
}
