<script setup lang="ts">
import { useMessenger } from '~/composables/useMessenger';
const chat = useMessenger();
const { open, search, tab, inbox, active, messages, error, sending, loading, hasOlder, draft, myId, people, presence, retrying } = chat;
const { loggedIn } = useUserSession();
const panel = ref<HTMLElement | null>(null);
const atBottom = ref(true);
function bottom() { const el = panel.value; return !!el && el.scrollHeight - el.scrollTop - el.clientHeight < 40; }
function scrolled() { atBottom.value = bottom(); if (atBottom.value) void chat.markVisibleRead(); }
async function toBottom() { await nextTick(); if (panel.value) panel.value.scrollTop = panel.value.scrollHeight; scrolled(); }
watch(() => active.value?.id, () => { atBottom.value = true; });
watch(() => messages.value.at(-1)?.id, () => { if (atBottom.value) void toBottom(); });
watch(open, value => { if (value) void toBottom(); });
function focus() { if (bottom()) void chat.markVisibleRead(); }
onMounted(() => { window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus); });
onBeforeUnmount(() => { window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); });
async function loadOlder() { const el = panel.value, height = el?.scrollHeight || 0; atBottom.value = false; await chat.older(); await nextTick(); if (el) el.scrollTop += el.scrollHeight - height; }
function keydown(e: KeyboardEvent) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); void chat.send(); } }
function time(value: string) { return new Date(value).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
const statusText = (s: string) => s === 'online' ? 'В сети' : s === 'away' ? 'Отошёл' : 'Не в сети';
</script>
<template>
  <UModal v-if="loggedIn" v-model:open="open" title="Личные сообщения" description="Переписка с пользователями Space" :ui="{ content: 'sm:max-w-5xl', body: 'p-0 sm:p-0' }">
    <UButton icon="i-lucide-message-circle" color="neutral" variant="soft" aria-label="Открыть личные сообщения">
      Сообщения <UBadge v-if="inbox.unread" color="error" size="sm">{{ inbox.unread }}</UBadge>
    </UButton>
    <template #body>
      <div class="grid grid-cols-[minmax(130px,30%)_1fr] h-[min(70dvh,650px)] min-h-80">
        <aside class="border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
          <div class="p-3 space-y-2">
            <UInput v-model="search" class="w-full" placeholder="Найти пользователя" aria-label="Поиск собеседника" />
            <div class="flex flex-wrap gap-1"><UButton size="xs" :variant="tab === 'dialogs' ? 'solid' : 'ghost'" @click="tab = 'dialogs'">Диалоги</UButton><UButton size="xs" :variant="tab === 'online' ? 'solid' : 'ghost'" @click="tab = 'online'">Online</UButton></div>
          </div>
          <div class="overflow-y-auto flex-1">
            <template v-if="search.trim() || tab === 'online'">
              <button v-for="person in people" :key="person.id" class="w-full text-left p-3 hover:bg-sky-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800" @click="chat.start(person)">
                <span class="block font-medium break-words">{{ person.fullName || person.login }}</span><span class="text-xs text-gray-500">{{ statusText(chat.status(person)) }}</span>
              </button>
              <p v-if="!people.length" class="p-3 text-sm text-gray-500">{{ search ? 'Пользователи не найдены' : 'Нет других подключённых пользователей' }}</p>
            </template>
            <template v-else>
              <button v-for="dialog in inbox.dialogs" :key="dialog.id" class="w-full text-left p-3 border-b border-gray-100 dark:border-gray-800" :class="active?.id === dialog.id ? 'bg-sky-50 dark:bg-gray-800' : ''" @click="chat.select(dialog)">
                <span class="font-medium break-words">{{ dialog.peer.fullName || dialog.peer.login }}</span>
                <UBadge v-if="dialog.unread" class="ml-1" size="xs">{{ dialog.unread }}</UBadge>
                <span class="block truncate text-xs text-gray-500">{{ dialog.last?.body || 'Новый диалог' }}</span>
                <span class="text-xs">{{ statusText(chat.status(dialog.peer)) }}</span>
              </button>
              <p v-if="!inbox.dialogs.length" class="p-3 text-sm text-gray-500">Выберите пользователя во вкладке Online или найдите по имени.</p>
            </template>
          </div>
        </aside>
        <section class="flex flex-col min-w-0 min-h-0">
          <p v-if="!presence.isConnected" class="px-3 py-2 bg-amber-50 text-amber-900 text-xs">Нет WebSocket-соединения. Сообщения синхронизируются каждые 15 секунд.</p>
          <p v-if="error" role="alert" class="p-3 text-red-600 text-sm">{{ error }}</p>
          <template v-if="active">
            <header class="p-3 border-b border-gray-200 dark:border-gray-700"><strong>{{ active.peer.fullName || active.peer.login }}</strong><span class="block text-xs text-gray-500">{{ active.peer.status === 'ACTIVE' ? statusText(chat.status(active.peer)) : 'Учётная запись отключена' }}</span></header>
            <div ref="panel" class="flex-1 overflow-y-auto p-4 space-y-3" @scroll="scrolled">
              <UButton v-if="hasOlder" size="xs" variant="ghost" :loading="loading" @click="loadOlder">Предыдущие сообщения</UButton>
              <p v-if="loading && !messages.length" role="status">Загрузка…</p>
              <div v-for="message in messages" :key="message.id" class="flex" :class="message.senderId === myId ? 'justify-end' : 'justify-start'">
                <div class="max-w-[90%] rounded-xl px-3 py-2" :class="message.senderId === myId ? 'bg-sky-100 text-gray-900' : 'bg-gray-100 text-gray-900'">
                  <p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{{ message.body }}</p>
                  <p class="text-[11px] text-gray-500 mt-1">{{ time(message.createdAt) }}<span v-if="message.senderId === myId"> · {{ message.id <= active.peerReadThrough ? 'Прочитано' : 'Отправлено' }}</span></p>
                </div>
              </div>
            </div>
            <UButton v-if="!atBottom" size="xs" variant="ghost" @click="toBottom">К последним сообщениям</UButton>
            <form class="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2" @submit.prevent="chat.send">
              <textarea v-model="draft" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 resize-none bg-transparent" rows="3" maxlength="4000" aria-label="Текст сообщения" placeholder="Сообщение…" :disabled="sending || retrying || active.peer.status !== 'ACTIVE'" @keydown="keydown" />
              <div class="flex items-center justify-between gap-2"><span class="text-xs text-gray-500">Enter — отправить · Shift+Enter — новая строка</span><UButton type="submit" :loading="sending" :disabled="!draft.trim() || loading || active.peer.status !== 'ACTIVE'">{{ retrying ? 'Повторить отправку' : 'Отправить' }}</UButton></div>
            </form>
          </template>
          <p v-else class="m-auto p-6 text-gray-500">Выберите собеседника. Можно написать и пользователю не в сети.</p>
        </section>
      </div>
    </template>
  </UModal>
</template>
