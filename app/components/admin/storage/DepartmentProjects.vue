<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';
const props = defineProps<{ department: string }>();
interface Entry { kind: string; id: string | number; name: string; size?: number; private?: boolean; url?: string }
const expanded = ref(false), loading = ref(false), error = ref(''), title = ref('');
const items = ref<Entry[]>([]), total = ref(0), page = ref(1), projectId = ref<number | null>(null), contractId = ref<number | null>(null);
let token = 0;
const controller = new AbortController();
async function load() {
  const sequence = ++token; loading.value = true; error.value = ''; items.value = [];
  try {
    const data = await $fetch<{ items: Entry[]; total: number; title: string }>('/api/admin/files/departments/projects', { signal: controller.signal, retry: 0,
      query: { department: props.department, projectId: projectId.value || undefined, contractId: contractId.value || undefined, page: page.value } });
    if (sequence !== token) return;
    items.value = data.items; total.value = data.total; title.value = data.title;
  } catch (e: any) { if (sequence === token && !controller.signal.aborted) error.value = e.data?.message || 'Не удалось загрузить файлы проектов'; }
  finally { if (sequence === token) loading.value = false; }
}
function enter(entry: Entry) { if (entry.kind === 'project') { projectId.value = Number(entry.id); contractId.value = null; } else contractId.value = Number(entry.id); page.value = 1; load(); }
function back() { if (contractId.value) contractId.value = null; else projectId.value = null; page.value = 1; load(); }
watch(() => props.department, () => { token++; expanded.value = false; items.value = []; projectId.value = null; contractId.value = null; });
onBeforeUnmount(() => { token++; controller.abort(); });
</script>
<template>
  <section class="department-projects">
    <button type="button" :aria-expanded="expanded" @click="expanded=!expanded; expanded && load()"><Icon name="lucide:folders"/> Проекты и объекты группы Space</button>
    <template v-if="expanded">
      <p>Показаны проекты, доступные вам, их общие документы и ваши личные файлы. Расположение документов на сервере сохраняется.</p>
      <div class="project-bar"><button v-if="projectId" @click="back">← Назад</button><strong>{{ title }}</strong><button :disabled="loading" @click="load">Обновить</button></div>
      <p v-if="loading" role="status">Загрузка…</p><p v-if="error" role="alert">{{ error }}</p>
      <ul v-else><li v-for="item in items" :key="item.kind+item.id"><button v-if="item.kind!=='file'" @click="enter(item)"><Icon name="lucide:folder"/> {{ item.name }}</button><a v-else :href="item.url"><Icon name="lucide:file-text"/> {{ item.name }} <small>{{ ((item.size||0)/1024/1024).toFixed(2) }} МиБ{{ item.private?' · личный':'' }}</small></a></li></ul>
      <p v-if="!loading&&!error&&!items.length">Доступных проектов или документов здесь пока нет.</p>
      <div v-if="total>100" class="project-bar"><button :disabled="page===1||loading" @click="page--;load()">Назад</button><span>Страница {{ page }}</span><button :disabled="page*100>=total||loading" @click="page++;load()">Далее</button></div>
    </template>
  </section>
</template>
<style scoped>
.department-projects{padding:14px;border:1px solid var(--space-line,#d8e1ec);border-radius:8px;margin:14px 0;background:var(--space-panel,#fff)}button,a{font:inherit;display:inline-flex;gap:7px;align-items:center;color:var(--space-accent,#176b88)}button{border:1px solid var(--space-line,#d8e1ec);padding:8px 10px;border-radius:6px;background:transparent;cursor:pointer}button:disabled{opacity:.5}p{color:var(--space-muted,#62738a);font-size:13px;line-height:1.5}ul{list-style:none;padding:0;margin:12px 0}li{padding:7px 0;border-bottom:1px solid var(--space-line,#d8e1ec);overflow-wrap:anywhere}.project-bar{display:flex;gap:10px;flex-wrap:wrap;align-items:center}small{color:var(--space-muted,#62738a)}a{flex-wrap:wrap}svg{flex-shrink:0}
</style>
