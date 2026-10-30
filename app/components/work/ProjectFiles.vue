<script setup lang="ts">
import { useProjectFiles } from '~/composables/useProjectFiles';
import type { WorkProjectDTO } from '~~/shared/types/work';
import { workUserName } from '~~/shared/types/work';
const props = defineProps<{ project: WorkProjectDTO; contractId?:number; defaultScope?:'SHARED'|'PRIVATE' }>();
const { scope, trash, data, error, loading, busy, selected, queue, base, load, choose, upload, changeState, cancel } = useProjectFiles(props.project.id,props.contractId,props.defaultScope);
const picker = ref<HTMLInputElement | null>(null), dragging = ref(false);
const remaining = computed(() => queue.value.some(q => q.state !== 'Загружен'));
const canUpload = computed(() => data.value?.canUpload && !props.project.archivedAt);
function size(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} МБ` : `${Math.ceil(bytes / 1024)} КБ`; }
function day(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' }).format(new Date(value)); }
function chosen(event: Event) { const input = event.target as HTMLInputElement; choose(Array.from(input.files || [])); input.value = ''; }
function dropped(event: DragEvent) { dragging.value = false; choose(Array.from(event.dataTransfer?.files || [])); }
watch(() => props.project.version, () => { if (!busy.value) load(); });
</script>
<template>
  <section class="project-files" aria-label="Файлы проекта">
    <div class="work-toolbar">
      <div class="work-view-switch" aria-label="Область файлов">
        <button :disabled="busy" :aria-pressed="scope === 'SHARED'" @click="scope = 'SHARED'">Общие документы</button>
        <button :disabled="busy" :aria-pressed="scope === 'PRIVATE'" @click="scope = 'PRIVATE'">Мои файлы · только я</button>
      </div>
      <label class="work-check"><input v-model="trash" type="checkbox" :disabled="busy">Корзина</label>
      <button :disabled="busy || loading" @click="load()">Обновить файлы</button>
    </div>
    <p class="work-muted">{{ scope === 'PRIVATE' ? 'Эти файлы доступны только вам, пока у вас есть доступ к проекту. Руководитель проекта их не видит.' : 'Общие документы видны всем, кому доступен проект, включая сотрудников подразделения или группы при такой видимости проекта.' }}</p>
    <p v-if="project.archivedAt" class="work-muted">Проект в архиве: файлы доступны только для чтения.</p>
    <p v-if="error" class="work-error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Загружаем список файлов…</p>
    <div v-if="canUpload && !trash" class="project-file-drop" :class="{ dragging }" @dragover.prevent="dragging = !busy" @dragleave.prevent="dragging = false" @drop.prevent="dropped">
      <p>{{ scope === 'PRIVATE' ? 'Добавить личные файлы' : 'Добавить общие документы' }}</p>
      <p class="work-muted">Перетащите документы, чертежи или архивы сюда. До {{ size(data!.maxBytes) }} на файл.</p>
      <input ref="picker" type="file" multiple hidden :disabled="busy" aria-label="Выберите файлы" @change="chosen">
      <button :disabled="busy" @click="picker?.click()">Выбрать файлы</button>
      <div v-if="queue.length" class="project-file-queue" aria-live="polite">
        <div v-for="item in queue" :key="item.key"><span>{{ item.file.name }}</span><small>{{ item.state }}{{ item.state === 'Загрузка' ? ` · ${item.progress}%` : '' }}</small><progress v-if="item.state === 'Загрузка'" :value="item.progress" max="100" :aria-label="item.file.name"/></div>
        <div class="work-actions"><button v-if="!busy && remaining" class="work-primary" @click="upload">Загрузить {{ scope === 'PRIVATE' ? 'в личные' : 'в общие' }}</button><button v-if="busy" @click="cancel">Остановить загрузку</button><button v-else @click="queue = []">Очистить список</button></div>
      </div>
    </div>
    <div v-if="selected" class="work-confirm" role="alert">
      <p>{{ selected.deletedAt ? 'Восстановить' : 'Переместить в корзину' }} «{{ selected.name }}»?</p>
      <div class="work-actions"><button :disabled="busy" @click="changeState">Подтвердить</button><button :disabled="busy" @click="selected = null">Отмена</button></div>
    </div>
    <div v-if="data?.items.length" class="work-table-wrap project-file-table">
      <table><thead><tr><th>Файл</th><th>Размер</th><th>Добавил</th><th>Дата</th><th>Действия</th></tr></thead><tbody>
        <tr v-for="file in data.items" :key="file.id">
          <td class="project-file-name">{{ file.name }}</td><td>{{ size(file.size) }}</td><td>{{ workUserName(file.owner) }}</td><td>{{ day(file.createdAt) }}</td>
          <td><div class="work-actions"><a v-if="!file.deletedAt" :href="base + '/' + file.id" download>Скачать</a><button v-if="file.canManage && !project.archivedAt" :disabled="busy" @click="selected = file">{{ file.deletedAt ? 'Восстановить' : 'В корзину' }}</button></div></td>
        </tr>
      </tbody></table>
    </div>
    <p v-else-if="data && !loading" class="work-empty">{{ trash ? 'Корзина пуста' : 'В этой области пока нет файлов' }}</p>
    <footer v-if="data" class="work-list-footer"><span>Всего файлов: {{ data.total }}</span><button v-if="data.page > 1" :disabled="busy || loading" @click="load(data.page - 1)">Назад</button><button v-if="data.page * 40 < data.total" :disabled="busy || loading" @click="load(data.page + 1)">Далее</button></footer>
  </section>
</template>
<style scoped>
.project-files{min-width:0}.project-file-drop{margin:16px 0;padding:18px;border:2px dashed var(--work-line);border-radius:10px;background:var(--work-panel);display:grid;gap:10px}.project-file-drop.dragging{border-color:var(--work-accent)}.project-file-drop>button{justify-self:start}.project-file-queue{display:grid;gap:10px;max-height:300px;overflow:auto}.project-file-queue>div{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.project-file-queue span{overflow-wrap:anywhere;flex:1;min-width:140px}.project-file-queue small{color:var(--work-muted)}.project-file-queue progress{width:100%;accent-color:var(--work-accent)}.project-file-table{margin-top:16px;max-height:60vh;overflow:auto}.project-file-table th{position:sticky;top:0;background:var(--work-panel)}.project-file-name{min-width:180px;max-width:420px;overflow-wrap:anywhere}.project-file-table a{color:var(--work-accent);text-decoration:underline}.project-file-table td{font-size:13px}
</style>
