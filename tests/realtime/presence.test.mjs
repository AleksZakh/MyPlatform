import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { issue, verify } from '../../dist-server/realtime/token.js';
const key = 'test-secret-at-least-thirty-two-characters';
const user = { id: 'DOMAIN:1', login: 'test', name: 'Test' };
test('ticket: signature, expiry, audience and malformed data', () => {
  const ticket = issue(user, key);
  assert.equal(verify(ticket, key).id, user.id);
  assert.throws(() => verify(ticket, key + 'wrong'));
  assert.throws(() => verify(ticket, key, Date.now() + 121000));
  assert.throws(() => verify(ticket + '.extra', key));
  assert.throws(() => verify('garbage', key));
});
test('authentication, origin, tabs, disconnect and identity isolation', async () => {
  const child = spawn(process.execPath, ['dist-server/websocket.js'], { env: { ...process.env, WS_AUTH_SECRET: key, WS_PORT: '15050', WS_ALLOWED_ORIGINS: 'https://space.test' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const sockets = [];
  try {
    await Promise.race([once(child.stdout, 'data'), new Promise((_, reject) => setTimeout(() => reject(Error('startup timeout')), 5000).unref())]);
    async function open(origin = 'https://space.test') {
      const ws = new WebSocket('ws://127.0.0.1:15050/ws', { origin }); sockets.push(ws);
      await once(ws, 'open'); return ws;
    }
    function message(ws, predicate) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { ws.off('message', listener); reject(Error('message timeout')); }, 3000);
        function listener(raw) { const data = JSON.parse(raw); if (predicate(data)) { clearTimeout(timer); ws.off('message', listener); resolve(data); } }
        ws.on('message', listener);
      });
    }
    await assert.rejects(open('https://evil.test'));
    const bad = await open();
    const rejected = once(bad, 'close'); bad.send(JSON.stringify({ type: 'auth', ticket: 'bad' }));
    assert.equal((await rejected)[0], 4401);
    const a = await open(); const initial = message(a, d => d.type === 'presence');
    a.send(JSON.stringify({ type: 'auth', ticket: issue(user, key) }));
    assert.equal((await initial).users.length, 1);
    const b = await open(); const second = message(b, d => d.type === 'presence');
    b.send(JSON.stringify({ type: 'auth', ticket: issue(user, key) }));
    assert.equal((await second).users.length, 1);
    const survivor = message(b, d => d.type === 'presence'); a.close();
    assert.equal((await survivor).users.length, 1);
    const c = await open(); const joined = message(c, d => d.type === 'presence');
    c.send(JSON.stringify({ type: 'auth', ticket: issue({ ...user, id: 'DOMAIN:2', login: 'other' }, key) }));
    assert.equal((await joined).users.length, 2);
    const changed = once(b, 'close');
    b.send(JSON.stringify({ type: 'auth', ticket: issue({ ...user, id: 'DOMAIN:3' }, key) }));
    assert.equal((await changed)[0], 4401);
    const remaining = message(c, d => d.type === 'presence' && d.users.length === 1);
    assert.equal((await remaining).users[0].id, 'DOMAIN:2');
    const refreshed = message(c, d => d.type === 'authenticated');
    c.send(JSON.stringify({ type: 'auth', ticket: issue({ ...user, id: 'DOMAIN:2', login: 'other' }, key) }));
    await refreshed;
    const noAuth = await open(); const closed = once(noAuth, 'close');
    noAuth.send(JSON.stringify({ type: 'activity' }));
    assert.equal((await closed)[0], 4401);
  } finally {
    sockets.forEach(ws => ws.terminate()); child.kill('SIGTERM'); await once(child, 'exit');
  }
});
