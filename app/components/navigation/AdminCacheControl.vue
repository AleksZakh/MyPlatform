<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
type CacheStatus = { lastUpdated: string | null; usersCount: number; expired: boolean;
  refresh: { running: boolean; lastFailed: boolean; lastAttemptAt: string | null } }
const status = ref<CacheStatus | null>(null), error = ref('')
let timer: ReturnType<typeof setInterval> | undefined
let alive = true, fetching = false
async function readStatus() {
  if (fetching) return
  fetching = true
  try {
    const value = await $fetch<CacheStatus>('/api/admin/ad-cache/status')
    if (!alive) return
    const changed = status.value !== null && status.value.lastUpdated !== value.lastUpdated
    status.value = value; error.value = ''
    if (changed) window.dispatchEvent(new Event('space-ad-cache-updated'))
  } catch { if (alive) error.value = 'Статус кэша AD недоступен' }
  finally { fetching = false }
}
onMounted(() => { void readStatus(); timer = setInterval(() => { void readStatus() }, 30000) })
onBeforeUnmount(() => { alive = false; clearInterval(timer) })
</script>
<template>
  <div class="admin-cache" aria-label="Кэш AD — автоматическое обновление">
    <span role="status" :title="status?.lastUpdated ? `Обновлён: ${new Date(status.lastUpdated).toLocaleString('ru-RU')}. Автоматически, каждые 15 минут.` : 'Кэш загружается автоматически при запуске сервера и каждые 15 минут.'">
      <span :class="['dot', { stale: !status || status.expired || status.refresh.lastFailed, updating: status?.refresh.running }]" aria-hidden="true" />
      {{ status?.refresh.running ? 'AD: обновление…' : status ? `AD: ${status.usersCount} · ${status.lastUpdated ? new Date(status.lastUpdated).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : 'нет кэша'}${status.expired ? ' · устарел' : ''} · авто` : 'AD: проверка…' }}
    </span>
    <span v-if="status?.refresh.lastFailed" role="status">Обновление не удалось. Следующая попытка по расписанию.</span>
    <span v-if="error" role="alert" class="error">{{ error }}</span>
  </div>
</template>
<style scoped>
.admin-cache { display:flex; align-items:center; flex-wrap:wrap; gap:8px; font-size:12px; }.dot { display:inline-block; width:7px; height:7px; margin-right:4px; border-radius:50%; background:#228453; }.stale { background:#b17b16; }.updating { background:#2563b8; }.error { color:#a12c20; }
</style>
