import { WebSocketServer, WebSocket } from 'ws';
import http from 'node:http';
import { secret, verify, type Identity } from './realtime/token.js';
import { verifyNotification } from './realtime/notification.js';
const key = secret();
const origins = new Set((process.env.WS_ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean));
if (!origins.size) throw new Error('Set WS_ALLOWED_ORIGINS to exact browser origins');
const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/internal/chat') {
    try {
      let body = '';
      for await (const chunk of req) { body += chunk.toString(); if (Buffer.byteLength(body) > 4096) { res.writeHead(413).end(); return; } }
      if (!verifyNotification(body, key, String(req.headers['x-space-time'] || ''), String(req.headers['x-space-signature'] || ''))) { res.writeHead(403).end(); return; }
      const data = JSON.parse(body);
      if (!Number.isSafeInteger(data.conversationId) || data.conversationId <= 0 || !Array.isArray(data.recipients) || data.recipients.length !== 2 || data.recipients.some((id: unknown) => typeof id !== 'string' || !/^(DOMAIN|EXTERNAL):[1-9][0-9]*$/.test(id))) { res.writeHead(400).end(); return; }
      const message = JSON.stringify({ type: 'chat:changed', conversationId: data.conversationId });
      for (const [ws, client] of clients) {
        if (client.user && client.exp * 1000 > Date.now() && data.recipients.includes(client.user.id) && ws.readyState === WebSocket.OPEN) {
          if (ws.bufferedAmount > 1024 * 1024) ws.terminate(); else ws.send(message);
        }
      }
      res.writeHead(204).end();
    } catch { res.writeHead(400).end(); }
    return;
  }
  res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: req.url === '/health', release: process.env.SPACE_RELEASE_ID || 'development' }));
});
server.requestTimeout = 5000;
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
