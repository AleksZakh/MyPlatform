import type { ChatMessageDto } from '~~/shared/types/chat';
export function useChatMessageActions(message: () => ChatMessageDto, canChange: () => boolean, changed: (value: ChatMessageDto) => void) {
 const menu = ref(false), editing = ref(false), deleting = ref(false), busy = ref(false), error = ref(''), text = ref('');
 const revision = ref(0);
 function edit() { if (!canChange() || busy.value) return; menu.value = false; error.value = ''; text.value = message().body; revision.value = message().revision || 0; editing.value = true; deleting.value = false; }
 function remove() { if (!canChange() || busy.value) return; menu.value = false; error.value = ''; revision.value = message().revision || 0; deleting.value = true; editing.value = false; }
 function cancel() { if (busy.value) return; editing.value = false; deleting.value = false; error.value = ''; }
 async function submit(action: 'edit' | 'delete') {
  if (busy.value || !canChange()) return;
  if (action === 'edit' && (!text.value.trim() || text.value.trim().length > 4000)) { error.value = 'Введите от 1 до 4000 символов.'; return; }
  const row = message(); busy.value = true; error.value = '';
  try {
    const value = await $fetch<ChatMessageDto>(`/api/chat/conversations/${row.conversationId}/messages/${row.id}`, { method: 'PATCH', headers: { 'x-space-chat': '1' }, body: action === 'edit' ? { action, revision: revision.value, body: text.value.trim() } : { action, revision: revision.value } });
    changed(value); editing.value = false; deleting.value = false;
  } catch (e: any) { error.value = e?.data?.message || 'Не удалось изменить сообщение. Попробуйте ещё раз.'; }
  finally { busy.value = false; }
 }
 watch(() => !!message().deletedAt, deleted => { if (deleted) { menu.value = false; editing.value = false; deleting.value = false; } });
 return { menu, editing, deleting, busy, error, text, edit, remove, cancel, submit };
}
