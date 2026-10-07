import type { ChatDialog, ChatHistory, ChatInbox, ChatMessageDto, ChatPerson } from '~~/shared/types/chat';
import { useWebSocketStore } from '~/stores/websocket.store';
export function useMessenger() {
  const { loggedIn, user } = useUserSession();
  const presence = useWebSocketStore();
  const open = ref(false), search = ref(''), tab = ref<'dialogs' | 'online'>('dialogs');
  const inbox = ref<ChatInbox>({ dialogs: [], unread: 0 }), contacts = ref<ChatPerson[]>([]);
  const active = ref<ChatDialog | null>(null), messages = ref<ChatMessageDto[]>([]);
  const error = ref(''), sending = ref(false), loading = ref(false), hasOlder = ref(false), draft = ref('');
  const pending = reactive(new Map<number, { clientId: string; body: string }>());
  const drafts = new Map<number, string>();
  const readTo = new Map<number, number>();
  let generation = 0, searching = 0, opening = 0, historyBusy = false, inboxBusy = false;
  let timer: ReturnType<typeof setInterval> | undefined, debounce: ReturnType<typeof setTimeout> | undefined;
  const headers = { 'x-space-chat': '1' };
  const myId = computed(() => user.value?.id || 0);
  function status(person: ChatPerson) { return presence.users.find(p => p.id === `${person.authType}:${person.id}`)?.status || 'offline'; }
  const people = computed<ChatPerson[]>(() => search.value.trim() ? contacts.value : presence.users.filter(p => Number(p.id.split(':')[1]) !== myId.value).map(p => ({ id: Number(p.id.split(':')[1]), authType: p.id.split(':')[0]!, fullName: p.name, login: p.login, status: 'ACTIVE' })).filter(p => Number.isSafeInteger(p.id)));
  function fail(e: any) { error.value = e?.data?.message || 'Не удалось выполнить запрос. Попробуйте ещё раз.'; }
  async function refreshInbox() {
    if (!loggedIn.value || inboxBusy) return;
    const g = generation; inboxBusy = true;
    try {
      const result = await $fetch<ChatInbox>('/api/chat/conversations');
      if (g !== generation) return;
      inbox.value = result;
      if (active.value) active.value = result.dialogs.find(d => d.id === active.value?.id) || active.value;
    } catch (e) { if (g === generation && open.value) fail(e); }
    finally { inboxBusy = false; }
  }
  function merge(rows: ChatMessageDto[]) {
    messages.value = [...new Map([...messages.value, ...rows].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id);
  }
  async function select(dialog: ChatDialog) {
    opening++;
    if (active.value) drafts.set(active.value.id, draft.value);
    active.value = dialog; draft.value = drafts.get(dialog.id) || pending.get(dialog.id)?.body || '';
    messages.value = []; hasOlder.value = false; error.value = ''; loading.value = true;
    const g = ++generation;
    try {
      const result = await $fetch<ChatHistory>(`/api/chat/conversations/${dialog.id}/messages`);
      if (g !== generation) return;
      messages.value = result.messages; hasOlder.value = result.hasMore;
      active.value.peerReadThrough = result.peerReadThrough;
    } catch (e) { if (g === generation) fail(e); }
    finally { if (g === generation) loading.value = false; }
  }
  async function start(person: ChatPerson) {
    const request = ++opening, owner = myId.value;
    error.value = '';
    try {
      const result = await $fetch<{ id: number }>('/api/chat/conversations', { method: 'POST', headers, body: { userId: person.id } });
      if (request !== opening || owner !== myId.value) return;
      await refreshInbox();
      if (request !== opening || owner !== myId.value) return;
      await select(inbox.value.dialogs.find(d => d.id === result.id) || { id: result.id, peer: person, unread: 0, last: null, readThrough: 0, peerReadThrough: 0 });
      tab.value = 'dialogs'; search.value = '';
    } catch (e) { fail(e); }
  }
  async function synchronize() {
    const id = active.value?.id, g = generation;
    if (!id || !open.value || historyBusy || loading.value) return;
    historyBusy = true;
    try {
      let more = true;
      while (more && g === generation) {
        const after = messages.value.at(-1)?.id || 0;
        const result = await $fetch<ChatHistory>(`/api/chat/conversations/${id}/messages`, { query: { after } });
        if (g !== generation) return;
        merge(result.messages); active.value!.peerReadThrough = result.peerReadThrough;
        more = result.hasMore && result.messages.length > 0;
      }
    } catch (e) { if (g === generation) fail(e); }
    finally { historyBusy = false; }
  }
  async function older() {
    if (!active.value || loading.value || !hasOlder.value) return;
    const g = generation, id = active.value.id; loading.value = true;
    try {
      const result = await $fetch<ChatHistory>(`/api/chat/conversations/${id}/messages`, { query: { before: messages.value[0]?.id } });
      if (g === generation) { merge(result.messages); hasOlder.value = result.hasMore; }
    } catch (e) { if (g === generation) fail(e); }
    finally { if (g === generation) loading.value = false; }
  }
  async function send() {
    const id = active.value?.id;
    if (!id || sending.value || !draft.value.trim() || draft.value.trim().length > 4000) return;
    // Preserve clientId after an ambiguous network failure; retry cannot duplicate the message.
    const attempt = pending.get(id) || { clientId: crypto.randomUUID(), body: draft.value.trim() };
    pending.set(id, attempt); sending.value = true; error.value = '';
    try {
      const row = await $fetch<ChatMessageDto>(`/api/chat/conversations/${id}/messages`, { method: 'POST', headers, body: attempt });
      pending.delete(id); drafts.delete(id);
      if (active.value?.id === id) { draft.value = ''; await synchronize(); }
      await refreshInbox();
    } catch (e) { fail(e); }
    finally { sending.value = false; }
  }
  async function markVisibleRead() {
    if (!open.value || document.hidden || !document.hasFocus() || !active.value || loading.value) return;
    const id = active.value.id, through = messages.value.at(-1)?.id;
    if (!through || through <= Math.max(active.value.readThrough, readTo.get(id) || 0)) return;
    readTo.set(id, through);
    try {
      await $fetch(`/api/chat/conversations/${id}/read`, { method: 'POST', headers, body: { through } });
      await refreshInbox();
    } catch { readTo.delete(id); }
  }
  const retrying = computed(() => active.value ? pending.has(active.value.id) && !sending.value : false);
  function reset() { generation++; searching++; opening++; open.value = false; active.value = null; inbox.value = { dialogs: [], unread: 0 }; messages.value = []; contacts.value = []; draft.value = ''; pending.clear(); drafts.clear(); readTo.clear(); }
  watch(() => loggedIn.value ? user.value?.id : null, () => { reset(); void refreshInbox(); });
  watch(open, value => { if (value) { void refreshInbox(); void synchronize(); } });
  watch(search, value => {
    clearTimeout(debounce); const n = ++searching;
    if (!value.trim()) { contacts.value = []; return; }
    debounce = setTimeout(async () => {
      try { const rows = await $fetch<ChatPerson[]>('/api/chat/contacts', { query: { q: value } }); if (n === searching) contacts.value = rows; }
      catch (e) { if (n === searching) fail(e); }
    }, 250);
  });
  watch(() => [presence.chatRevision, presence.isConnected], () => { void refreshInbox(); void synchronize(); });
  function refreshVisible() { if (!document.hidden) { void refreshInbox(); void synchronize(); } }
  onMounted(() => { refreshVisible(); timer = setInterval(refreshVisible, 15000); document.addEventListener('visibilitychange', refreshVisible); window.addEventListener('focus', refreshVisible); });
  onBeforeUnmount(() => { generation++; clearInterval(timer); clearTimeout(debounce); document.removeEventListener('visibilitychange', refreshVisible); window.removeEventListener('focus', refreshVisible); });
  return { open, search, tab, inbox, active, messages, error, sending, loading, hasOlder, draft, myId, people, presence, retrying, status, select, start, older, send, markVisibleRead, refreshInbox };
}
