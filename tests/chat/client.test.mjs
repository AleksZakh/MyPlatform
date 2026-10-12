// Optional test dependencies: jsdom and esbuild (do not install on production).
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const { JSDOM } = await import(process.env.CHAT_JSDOM_PATH || 'jsdom');
const dom = new JSDOM('<div id="app"></div>', { url: 'https://space.test' });
for (const key of ['window', 'document', 'Element', 'SVGElement', 'HTMLElement']) globalThis[key] = dom.window[key];
const vue = await import('vue');
for (const key of ['ref', 'computed', 'watch', 'reactive', 'onMounted', 'onBeforeUnmount']) globalThis[key] = vue[key];
const session = { loggedIn: vue.ref(true), user: vue.ref({ id: 1 }) };
globalThis.useUserSession = () => session;
globalThis.__presence = vue.reactive({ users: [], chatRevision: 0, isConnected: true });
const result = await build({ entryPoints: [new URL('../../app/composables/useMessenger.ts', import.meta.url).pathname], bundle: true, write: false, format: 'esm', plugins: [{ name: 'presence-stub', setup(b) { b.onResolve({ filter: /websocket\.store/ }, () => ({ path: 'presence', namespace: 'stub' })); b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const useWebSocketStore = () => globalThis.__presence;' })); } }] });
const { useMessenger } = await import('data:text/javascript;base64,' + Buffer.from(result.outputFiles[0].text).toString('base64'));
const dialog = { id: 1, peer: { id: 2, login: 'other', fullName: 'Other', status: 'ACTIVE', authType: 'DOMAIN' }, readThrough: 0, peerReadThrough: 0, unread: 0, last: null };
const row = (id, senderId) => ({ id, senderId, conversationId: 1, body: `message ${id}`, clientId: 'test', createdAt: new Date().toISOString() });
const sent = []; let fail = true, invitationCalls = 0;
globalThis.$fetch = async (path, options = {}) => {
  if (path === '/api/chat/contacts') return { people: [dialog.peer], hasMore: false };
  if (path === '/api/chat/invitations') { if (options.body.directoryObjectId) assert.equal(options.body.directoryLogin, 'cached'); invitationCalls++; return { sent: true }; }
  if (path === '/api/chat/conversations') return { dialogs: [dialog], unread: 0 };
  if (options.method === 'POST' && path.endsWith('/messages')) { sent.push({ ...options.body }); if (fail) throw { data: { message: 'Network interruption' } }; return row(8, 1); }
  if (path.endsWith('/messages')) return { messages: options.query?.after !== undefined ? [row(7, 2), row(8, 1)].filter(r => r.id > options.query.after) : [row(6, 2)], hasMore: false, peerReadThrough: 0 };
  return { ok: true };
};
test('client retries same message ID and catches incoming messages before own response', async () => {
  let chat;
  const app = vue.createApp({ setup() { chat = useMessenger(); return () => vue.h('div'); } });
  app.mount('#app');
  try {
    await new Promise(resolve => setTimeout(resolve, 0));
    chat.open.value = true; await vue.nextTick(); await chat.select(dialog);
    chat.tab.value = 'contacts'; await vue.nextTick(); await chat.loadContacts();
    assert.equal(chat.people.value[0].id, 2); // Offline active contacts are visible.
    const inactive = { id: 3, login: 'pending', fullName: 'Pending', authType: 'DOMAIN', status: 'PENDING_ACTIVATION' };
    await chat.start(inactive);
    assert.equal(chat.active.value, null);
    assert.equal(chat.invitee.value.id, 3);
    assert.equal(chat.invitationNotice.value, ''); assert.equal(invitationCalls, 0); // Selecting a contact does not send email.
    await chat.invite(); assert.equal(invitationCalls, 1);
    assert.equal(chat.invitee.value.invitationPending, true);
    assert.match(chat.invitationNotice.value, /отправлено/);
    await chat.start({ ...inactive, id: 0, directoryObjectId: '11111111-1111-4111-8111-111111111111', directoryLogin: 'cached' });
    await chat.invite(); assert.equal(invitationCalls, 2);
    assert.match(chat.invitationNotice.value, /отправлено/);
    await chat.select(dialog);
    assert.equal(chat.invitee.value, null);
    chat.draft.value = 'hello'; await chat.send();
    assert.equal(chat.retrying.value, true);
    assert.equal(chat.draft.value, 'hello');
    fail = false; await chat.send();
    assert.equal(sent.length, 2); assert.equal(sent[0].clientId, sent[1].clientId);
    assert.deepEqual(chat.messages.value.map(m => m.id), [6, 7, 8]);
    assert.equal(chat.draft.value, '');
    session.loggedIn.value = false; await vue.nextTick();
    assert.equal(chat.messages.value.length, 0); assert.equal(chat.open.value, false);
  } finally { app.unmount(); dom.window.close(); }
});
