<script setup lang="ts">
import { useMessenger } from '~/composables/useMessenger';
const chat = useMessenger();
const { contactsWarning, invitee, inviting, invitationNotice, contactsMore, contactsLoading, open, search, tab, inbox, active, messages, error, sending, loading, hasOlder, draft, myId, people, presence, retrying } = chat;
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
  <UModal v-if="loggedIn" v-model:open="open" title="Сообщения" description="Личные и групповые переписки Space" :ui="{ content: 'w-[calc(100vw-2rem)] sm:w-[calc(100vw-2rem)] sm:max-w-5xl', body: 'block min-w-0 p-0 sm:p-0' }">
    <UButton data-space-stat="chat.open" color="neutral" variant="ghost" class="space-chat-launcher relative shrink-0" title="Сообщения"
      :aria-label="inbox.unread ? `Открыть сообщения. Непрочитанных: ${inbox.unread}` : 'Открыть сообщения'">
      <Icon name="streamline-freehand-color:send-email-paper-plane-1" size="18" aria-hidden="true" />
      <UBadge v-if="inbox.unread" color="error" size="sm" class="absolute -right-2 -top-1" aria-hidden="true">{{ inbox.unread > 99 ? '99+' : inbox.unread }}</UBadge>
    </UButton>
    <template #body>
      <div class="grid w-full min-w-0 grid-cols-[minmax(0,40%)_minmax(0,1fr)] sm:grid-cols-[280px_minmax(0,1fr)] h-[min(70dvh,650px)] min-h-80">
        <aside class="border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0 min-w-0">
          <div class="p-3 space-y-2">
            <ChatGroupPanel @changed="chat.groupChanged" />
            <UInput v-model="search" class="w-full" placeholder="Найти пользователя" aria-label="Поиск собеседника" />
            <div class="flex flex-nowrap gap-1 overflow-x-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap"><UButton size="xs" :variant="tab === 'dialogs' ? 'solid' : 'ghost'" @click="tab = 'dialogs'">Диалоги</UButton><UButton size="xs" :variant="tab === 'contacts' ? 'solid' : 'ghost'" @click="tab = 'contacts'">Контакты</UButton><UButton size="xs" :variant="tab === 'online' ? 'solid' : 'ghost'" @click="tab = 'online'">Online</UButton></div>
          </div>
          <p v-if="contactsWarning" class="px-3 text-xs text-amber-700" role="status">{{ contactsWarning }}</p>
          <div class="overflow-y-auto flex-1 min-w-0">
            <template v-if="search.trim() || tab !== 'dialogs'">
              <button v-for="person in people" :key="person.directoryObjectId || person.directoryLogin || person.id" class="w-full text-left p-3 hover:bg-sky-50 dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-800" @click="chat.start(person)">
                <span class="block font-medium break-words">{{ person.fullName || person.login }}</span><span class="text-xs text-gray-500">{{ person.status === 'ACTIVE' ? statusText(chat.status(person)) : 'Ожидает активации' }}</span><span v-if="person.department" class="block text-xs text-gray-500">{{ person.department }}</span>
              </button>
              <UButton v-if="contactsMore && (search.trim() || tab === 'contacts')" variant="ghost" :loading="contactsLoading" @click="chat.loadContacts(true)">Показать ещё</UButton>
              <p v-if="contactsLoading" class="p-3 text-sm" role="status">Загрузка…</p>
              <p v-if="!people.length && !contactsLoading" class="p-3 text-sm text-gray-500">{{ search || tab === 'contacts' ? 'Пользователи не найдены' : 'Нет других подключённых пользователей' }}</p>
            </template>
            <template v-else>
              <button v-for="dialog in inbox.dialogs" :key="dialog.id" class="w-full text-left p-3 border-b border-gray-100 dark:border-gray-800" :class="active?.id === dialog.id ? 'bg-sky-50 dark:bg-gray-800' : ''" @click="chat.select(dialog)">
                <span v-if="dialog.kind === 'GROUP'" class="text-xs mr-1">Группа ·</span><span class="font-medium break-words">{{ dialog.peer.fullName || dialog.peer.login }}</span>
                <UBadge v-if="dialog.unread" class="ml-1" size="xs">{{ dialog.unread }}</UBadge>
                <span class="block truncate text-xs text-gray-500">{{ dialog.last?.deletedAt ? 'Сообщение удалено' : dialog.last?.body || 'Новый диалог' }}</span>
                <span class="text-xs">{{ dialog.kind === 'GROUP' ? (dialog.archived ? 'В архиве' : `Участников: ${dialog.memberCount}`) : statusText(chat.status(dialog.peer)) }}</span>
              </button>
              <p v-if="!inbox.dialogs.length" class="p-3 text-sm text-gray-500">Выберите пользователя во вкладке «Контакты» или найдите по имени.</p>
            </template>
          </div>
        </aside>
        <section class="flex flex-col min-w-0 min-h-0">
          <p v-if="!presence.isConnected" class="px-4 sm:px-6 py-2 bg-amber-50 text-amber-900 text-xs">Нет WebSocket-соединения. Сообщения синхронизируются каждые 15 секунд.</p>
          <p v-if="error" role="alert" class="px-4 sm:px-6 py-3 text-red-600 text-sm">{{ error }}</p>
          <div v-if="invitee" class="m-auto p-6 space-y-4 max-w-lg">
            <h3 class="font-semibold">{{ invitee.fullName || invitee.login }}</h3>
            <p>Этот сотрудник ещё не активирован в Space. Хотите отправить ему приглашение на корпоративную электронную почту?</p>
            <p v-if="invitee.hasEmail === false" class="text-sm text-amber-700">В профиле Space почта не указана. Перед отправкой проверим актуальный адрес в AD.</p>
            <p v-if="invitationNotice" role="status">{{ invitationNotice }}</p>
            <p v-else-if="invitee.invitationPending" class="text-sm">Ранее уже отправлено приглашение. Ожидаем вход сотрудника. Повторную отправку можно запросить кнопкой ниже. Если действует ограничение, Space подскажет срок ожидания.</p>
            <div class="flex gap-2"><UButton :loading="inviting" :disabled="!!invitationNotice" @click="chat.invite">Отправить приглашение</UButton><UButton variant="ghost" :disabled="inviting" @click="invitee = null">Отмена</UButton></div>
          </div>
          <template v-else-if="active">
            <header class="px-4 sm:px-6 py-3 border-b border-gray-200 dark:border-gray-700"><ChatGroupPanel v-if="active.kind === 'GROUP'" :key="active.id" :group-id="active.id" class="float-right" @changed="chat.groupChanged" /><strong>{{ active.peer.fullName || active.peer.login }}</strong><span class="block text-xs text-gray-500">{{ active.kind === 'GROUP' ? (active.archived ? 'Группа в архиве' : `Участников: ${active.memberCount}`) : active.peer.status === 'ACTIVE' ? statusText(chat.status(active.peer)) : 'Учётная запись отключена' }}</span></header>
            <div ref="panel" class="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-4 space-y-3" @scroll="scrolled">
              <UButton v-if="hasOlder" size="xs" variant="ghost" :loading="loading" @click="loadOlder">Предыдущие сообщения</UButton>
              <p v-if="loading && !messages.length" role="status">Загрузка…</p>
              <div v-for="message in messages" :key="message.id" class="flex" :class="message.senderId === myId ? 'justify-end' : 'justify-start'">
                <div class="max-w-[90%] rounded-xl px-3 py-2" :class="message.senderId === myId ? 'bg-sky-100 text-gray-900' : 'bg-gray-100 text-gray-900'">
                  <p v-if="active.kind === 'GROUP'" class="text-xs font-semibold mb-1">{{ message.sender?.fullName || message.sender?.login || `Участник #${message.senderId}` }}</p>
                  <ChatMessageContent :message="message" :can-change="message.senderId === myId && !active.archived" @changed="chat.messageChanged" />
                  <p class="text-[11px] text-gray-500 mt-1">{{ time(message.createdAt) }}<span v-if="message.editedAt && !message.deletedAt"> · изменено</span><span v-if="message.senderId === myId"> · {{ message.id <= active.peerReadThrough ? (active.kind === 'GROUP' ? 'Прочитано всеми' : 'Прочитано') : 'Отправлено' }}</span></p>
                </div>
              </div>
            </div>
            <UButton v-if="!atBottom" size="xs" variant="ghost" @click="toBottom">К последним сообщениям</UButton>
            <form class="px-4 sm:px-6 py-3 border-t border-gray-200 dark:border-gray-700 space-y-2" @submit.prevent="chat.send">
              <textarea v-model="draft" class="w-full rounded-lg border border-gray-300 dark:border-gray-600 p-2 resize-none bg-transparent" rows="3" maxlength="4000" aria-label="Текст сообщения" placeholder="Сообщение…" :disabled="sending || retrying || active.archived || active.peer.status !== 'ACTIVE'" @keydown="keydown" />
              <div class="flex items-center justify-between gap-2"><span class="text-xs text-gray-500">Enter — отправить · Shift+Enter — новая строка</span><UButton type="submit" :loading="sending" :disabled="!draft.trim() || loading || active.archived || active.peer.status !== 'ACTIVE'">{{ retrying ? 'Повторить отправку' : 'Отправить' }}</UButton></div>
            </form>
          </template>
          <p v-else class="m-auto p-6 text-gray-500">Выберите собеседника. Можно написать и пользователю не в сети.</p>
        </section>
      </div>
    </template>
  </UModal>
</template>

<style>
.space-chat-launcher{box-sizing:border-box!important;display:inline-flex;align-items:center;justify-content:center;width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;padding:3px!important;line-height:1;gap:0}
.space-chat-launcher>.iconify{width:18px;height:18px;flex-shrink:0}

html.dark .space-chat-launcher{background:#cbd5e1!important;border:1px solid #94a3b8!important;color:#172b3a!important;min-width:34px;min-height:34px;justify-content:center;border-radius:8px}html.dark .space-chat-launcher:hover{background:#e2e8f0!important}html.dark .space-chat-launcher:focus-visible{outline:2px solid #78d6ea;outline-offset:3px}
</style>
