import type { ChatContacts, ChatGroup, ChatPerson } from '~~/shared/types/chat';
export function useChatGroupEditor(groupId: () => number | undefined, changed: (id: number) => void) {
 const open = ref(false), group = ref<ChatGroup | null>(null), name = ref(''), search = ref('');
 const candidates = ref<ChatPerson[]>([]), selected = ref<number[]>([]), more = ref(false), loading = ref(false), busy = ref(false), error = ref('');
 const confirmation = ref<{ text: string; body: Record<string, unknown> } | null>(null);
 const attempt = ref<{ clientId: string; name: string; userIds: number[] } | null>(null);
 const { user } = useUserSession();
 const myId = computed(() => user.value?.id || 0);
 const owner = computed(() => group.value?.myRole === 'OWNER');
 const manager = computed(() => owner.value || group.value?.myRole === 'ADMIN');
 const headers = { 'x-space-chat': '1' };
 let generation = 0, queryNumber = 0, offset = 0, timer: ReturnType<typeof setTimeout> | undefined;
 function fail(e: any) { error.value = e?.data?.message || 'Не удалось выполнить действие. Обновите группу и попробуйте ещё раз.'; }
 async function loadGroup() {
  const id = groupId(), g = generation;
  if (!id) return;
  const result = await $fetch<ChatGroup>(`/api/chat/groups/${id}`);
  if (g === generation && open.value) { group.value = result; name.value = result.name; }
 }
 async function loadCandidates(append = false) {
  if (!open.value || (append && loading.value)) return;
  const n = ++queryNumber; loading.value = true;
  if (!append) { offset = 0; candidates.value = []; more.value = false; }
  try {
   const result = await $fetch<ChatContacts>('/api/chat/contacts', { query: { q: search.value, offset } });
   if (n !== queryNumber || !open.value) return;
   offset += result.people.length;
   const rows = result.people.filter(p => p.id > 0 && p.status === 'ACTIVE' && !group.value?.members.some(m => m.id === p.id));
   candidates.value = append ? [...candidates.value, ...rows] : rows; more.value = result.hasMore;
  } catch (e) { if (n === queryNumber) fail(e); }
  finally { if (n === queryNumber) loading.value = false; }
 }
 function toggle(id: number) { selected.value = selected.value.includes(id) ? selected.value.filter(v => v !== id) : [...selected.value, id]; }
 async function create() {
  if (busy.value || !name.value.trim() || !selected.value.length) return;
  attempt.value ||= { clientId: crypto.randomUUID(), name: name.value.trim(), userIds: [...selected.value] };
  busy.value = true; error.value = ''; const g = generation;
  try {
   const result = await $fetch<{id:number}>('/api/chat/groups', { method: 'POST', headers, body: attempt.value });
   if (g !== generation) return;
   attempt.value = null; changed(result.id); open.value = false;
  } catch (e) { if (g === generation) { fail(e); if (e && typeof e === 'object' && 'statusCode' in e && Number(e.statusCode) >= 400 && Number(e.statusCode) < 500) attempt.value = null; } }
  finally { busy.value = false; }
 }
 async function change(body: Record<string, unknown>) {
  const id = groupId(), g = generation;
  if (!id || busy.value) return;
  busy.value = true; error.value = '';
  try {
   await $fetch(`/api/chat/groups/${id}`, { method: 'PATCH', headers, body });
   if (g !== generation) return;
   confirmation.value = null; selected.value = []; changed(id);
   if (body.action === 'leave') open.value = false;
   else { await loadGroup(); await loadCandidates(); }
  } catch (e) { if (g === generation) fail(e); }
  finally { busy.value = false; }
 }
 function confirm(text: string, body: Record<string, unknown>) { confirmation.value = { text, body }; }
 watch(open, async value => {
  generation++; queryNumber++; clearTimeout(timer); error.value = ''; confirmation.value = null; selected.value = []; candidates.value = []; group.value = null; name.value = ''; search.value = ''; attempt.value = null;
  if (value) { try { await loadGroup(); await loadCandidates(); } catch (e) { fail(e); } }
 });
 watch(search, () => { queryNumber++; clearTimeout(timer); timer = setTimeout(() => { void loadCandidates(); },250); });
 watch(groupId, () => { open.value = false; });
 onBeforeUnmount(() => { generation++; queryNumber++; clearTimeout(timer); });
 return { open, group, name, search, candidates, selected, more, loading, busy, error, confirmation, attempt, myId, owner, manager, loadCandidates, toggle, create, change, confirm };
}
