import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import { secret, verify, type Identity } from './realtime/token.js';
const key = secret();
const origins = new Set((process.env.WS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
if (!origins.size) throw new Error('Set WS_ALLOWED_ORIGINS to exact browser origins');
const server = http.createServer((req, res) => {
  res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: req.url === '/health' }));
});
const wss = new WebSocketServer({ noServer: true, maxPayload: 8192, perMessageDeflate: false });
type Client = { user?: Identity; exp: number; activity: number; alive: boolean; count: number; timer: ReturnType<typeof setTimeout> };
const clients = new Map<WebSocket, Client>();
let queued = false;
function broadcast() {
  if (queued) return;
  queued = true;
  setTimeout(() => {
    queued = false;
    const users = new Map<string, Identity & { status: string }>();
    for (const [ws, c] of clients) {
      if (!c.user || ws.readyState !== WebSocket.OPEN || c.exp * 1000 <= Date.now()) continue;
      const status = Date.now() - c.activity < 300000 ? 'online' : 'away';
      const previous = users.get(c.user.id);
      users.set(c.user.id, { ...c.user, status: previous?.status === 'online' ? 'online' : status });
    }
    const data = JSON.stringify({ type: 'presence', users: [...users.values()].sort((a, b) => a.name.localeCompare(b.name, 'ru')) });
    for (const [ws, c] of clients) {
      if (!c.user || c.exp * 1000 <= Date.now() || ws.readyState !== WebSocket.OPEN) continue;
      if (ws.bufferedAmount > 1024 * 1024) ws.terminate();
      else ws.send(data);
    }
  }, 100);
}
server.on('upgrade', (req, socket, head) => {
  socket.on('error', () => {});
  if (req.url !== '/ws' || !origins.has(req.headers.origin || '') || clients.size >= 2000) {
    socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return;
  }
  wss.handleUpgrade(req, socket, head, ws => wss.emit('connection', ws));
});
wss.on('connection', ws => {
  const c: Client = { exp: 0, activity: Date.now(), alive: true, count: 0, timer: setTimeout(() => ws.close(4401, 'Authentication required'), 5000) };
  clients.set(ws, c);
  ws.on('error', () => {});
  ws.on('pong', () => { c.alive = true; });
  ws.on('message', (raw, binary) => {
    if (binary || ++c.count > 60) { ws.close(4400, 'Invalid message or rate limit'); return; }
    try {
      const message = JSON.parse(raw.toString());
      if (message.type === 'auth') {
        const user = verify(message.ticket, key);
        if (c.user && c.user.id !== user.id) throw new Error('Identity changed');
        c.user = { id: user.id, login: user.login, name: user.name }; c.exp = user.exp;
        clearTimeout(c.timer);
        ws.send(JSON.stringify({ type: 'authenticated' })); broadcast();
      } else if (message.type === 'activity' && c.user && c.exp * 1000 > Date.now()) {
        c.activity = Date.now(); broadcast();
      } else throw new Error('Invalid message');
    } catch { ws.close(4401, 'Invalid authentication or message'); }
  });
  ws.on('close', () => { clearTimeout(c.timer); clients.delete(ws); broadcast(); });
});
const heartbeat = setInterval(() => {
  for (const [ws, c] of clients) {
    if (!c.alive || (c.user && c.exp * 1000 <= Date.now())) { ws.terminate(); continue; }
    c.alive = false; c.count = 0; ws.ping();
  }
  broadcast();
}, 25000);
function shutdown() {
  clearInterval(heartbeat);
  for (const ws of clients.keys()) ws.close(1012, 'Service restart');
  server.close();
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
server.listen(Number(process.env.WS_PORT || 5050), '127.0.0.1', () => console.log('Space WebSocket listening on loopback'));
