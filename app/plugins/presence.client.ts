import { useWebSocketStore } from '~/stores/websocket.store';
export default defineNuxtPlugin(() => {
  const store = useWebSocketStore();
  const { loggedIn, user } = useUserSession();
  let ws: WebSocket | null = null;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let renew: ReturnType<typeof setInterval> | undefined;
  let watchdog: ReturnType<typeof setTimeout> | undefined;
  let generation = 0, attempts = 0, lastActivity = 0;
  let stopped = false;
  function clearTimers() { clearTimeout(retry); clearTimeout(watchdog); clearInterval(renew); }
  function stop() {
    generation++; clearTimers();
    if (ws) { ws.onclose = null; ws.close(); ws = null; }
    store.users = []; store.connectionStatus = 'disconnected';
  }
  async function connect() {
    if (stopped || !loggedIn.value) return;
    const current = ++generation;
    store.connectionStatus = 'connecting';
    try {
      const { ticket } = await $fetch<{ ticket: string }>('/api/realtime/ticket', { method: 'POST', headers: { 'x-space-realtime': '1' } });
      if (current !== generation) return;
      const url = new URL('/ws', location.href); url.protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = ws = new WebSocket(url);
      watchdog = setTimeout(() => socket.close(), 10000);
      socket.onopen = () => socket.send(JSON.stringify({ type: 'auth', ticket }));
      socket.onmessage = event => {
        if (current !== generation) return;
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'authenticated') {
            clearTimeout(watchdog); store.connectionStatus = 'connected'; attempts = 0;
            if (!renew) renew = setInterval(async () => {
              try {
                const result = await $fetch<{ ticket: string }>('/api/realtime/ticket', { method: 'POST', headers: { 'x-space-realtime': '1' } });
                if (current === generation && socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: 'auth', ticket: result.ticket }));
              } catch { socket.close(); }
            }, 60000);
          } else if (message.type === 'presence' && Array.isArray(message.users)) store.users = message.users;
        } catch { socket.close(); }
      };
      socket.onerror = () => socket.close();
      socket.onclose = () => {
        if (current !== generation) return;
        clearTimers(); renew = undefined;
        store.connectionStatus = 'disconnected'; store.users = []; schedule();
      };
    } catch { if (current === generation) { store.connectionStatus = 'disconnected'; schedule(); } }
  }
  function schedule() {
    if (!stopped && loggedIn.value) retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(attempts++, 5)) + Math.random() * 1000);
  }
  const unwatch = watch(() => loggedIn.value ? `${user.value?.id}:${user.value?.login}` : '', value => {
    stop(); renew = undefined; attempts = 0;
    if (value) void connect();
  }, { immediate: true });
  function activity() {
    if (document.hidden || Date.now() - lastActivity < 15000 || !ws || ws.readyState !== WebSocket.OPEN || !store.isConnected) return;
    lastActivity = Date.now(); ws.send(JSON.stringify({ type: 'activity' }));
  }
  function pagehide() { stopped = true; stop(); renew = undefined; }
  function pageshow() { if (stopped) { stopped = false; void connect(); } }
  const events = ['pointerdown', 'keydown', 'scroll', 'pointermove'];
  events.forEach(e => window.addEventListener(e, activity, { passive: true }));
  document.addEventListener('visibilitychange', activity);
  window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', pageshow);
  if (import.meta.hot) import.meta.hot.dispose(() => {
    unwatch(); pagehide();
    events.forEach(e => window.removeEventListener(e, activity));
    document.removeEventListener('visibilitychange', activity);
    window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', pageshow);
  });
});
