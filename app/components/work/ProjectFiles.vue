<script setup lang="ts">
import { useProjectFiles } from '~/composables/useProjectFiles';
import type { WorkProjectDTO } from '~~/shared/types/work';
import { workUserName } from '~~/shared/types/work';
const props = defineProps<{ project: WorkProjectDTO; contractId?:number; defaultScope?:'SHARED'|'PRIVATE';taskId?:number }>();
const emit=defineEmits<{pending:[value:boolean]}>();
const { documentType,scope, trash, data, error, loading, busy, selected, queue, base, load, choose, upload, changeState, cancel } = useProjectFiles(props.project.id,props.contractId,props.defaultScope,props.taskId);
const picker = ref<HTMLInputElement | null>(null), dragging = ref(false);
const groups=computed(()=>{
  const groups=new Map<string,NonNullable<typeof data.value>['items']>();
  for(const file of data.value?.items||[]){const folder=props.contractId?(file.documentFolder||'Ранее загруженные документы'):'';if(!groups.has(folder))groups.set(folder,[]);groups.get(folder)!.push(file);}
  return Array.from(groups,([folder,files])=>({folder,files}));
});
function fileFormat(name:string){const ext=name.includes('.')?name.split('.').at(-1)!.toUpperCase():'';return /^[A-Z0-9]{1,8}$/.test(ext)?ext:'ФАЙЛ';}
function fileIcon(name:string){const ext=fileFormat(name);return ['JPG','JPEG','PNG','GIF','WEBP','SVG','TIFF','BMP'].includes(ext)?'lucide:file-image':['ZIP','RAR','7Z','GZ'].includes(ext)?'lucide:file-archive':['XLS','XLSX','CSV'].includes(ext)?'lucide:file-spreadsheet':['DWG','DXF'].includes(ext)?'lucide:file-cog':'lucide:file-text';}
const remaining = computed(() => queue.value.some(q => q.state !== 'Загружен'));
watch(()=>busy.value||queue.value.some(q=>q.state!=='Загружен'),v=>emit('pending',v),{immediate:true});
const canUpload = computed(() => data.value?.canUpload && !props.project.archivedAt);
function size(bytes: number) { return bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} МБ` : `${Math.ceil(bytes / 1024)} КБ`; }
function day(value: string) { return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/Moscow' }).format(new Date(value)); }
function chosen(event: Event) { const input = event.target as HTMLInputElement; choose(Array.from(input.files || [])); input.value = ''; }
function dropped(event: DragEvent) { dragging.value = false; choose(Array.from(event.dataTransfer?.files || [])); }
watch(() => props.project.version, () => { if (!busy.value) load(); });
</script>
<template>
  <section class="project-files" :class="{'project-files-compact':!!contractId}" aria-label="Файлы проекта">
    <div class="work-toolbar">
      <div v-if="!taskId" class="work-view-switch" aria-label="Область файлов">
        <button type="button" :disabled="busy" :aria-pressed="scope === 'SHARED'" @click="scope = 'SHARED'">Общие документы</button>
        <button type="button" :disabled="busy" :aria-pressed="scope === 'PRIVATE'" @click="scope = 'PRIVATE'">Мои файлы · только я</button>
      </div>
      <label class="work-check"><input v-model="trash" type="checkbox" :disabled="busy">Корзина</label>
      <button type="button" :disabled="busy || loading" @click="load()">Обновить файлы</button>
    </div>
    <p class="work-muted project-files-access">{{ scope === 'PRIVATE' ? 'Эти файлы доступны только вам, пока у вас есть доступ к проекту. Руководитель проекта их не видит.' : 'Общие документы видны сотрудникам, имеющим доступ к объекту или проекту.' }}</p>
    <p v-if="project.archivedAt" class="work-muted">Проект в архиве: файлы доступны только для чтения.</p>
    <p v-if="error" class="work-error" role="alert">{{ error }}</p>
    <p v-if="loading" role="status">Загружаем список файлов…</p>
    <div v-if="canUpload && !trash" class="project-file-drop" :class="{ dragging }" @dragover.prevent="dragging = !busy" @dragleave.prevent="dragging = false" @drop.prevent="dropped">
      <div class="project-file-upload-controls"><label v-if="contractId">Тип документа<select v-model="documentType" :disabled="busy"><option>Выписка из ЕГРН</option><option>Чертёж</option><option>Отчёт</option><option>Межевой план</option><option>Технический план</option><option>КУВД</option><option>Иное</option></select></label>
      <input ref="picker" type="file" multiple hidden :disabled="busy" aria-label="Выберите файлы" @change="chosen">
      <button type="button" :disabled="busy" @click="picker?.click()"><Icon name="lucide:folder-open" /> Выбрать файлы</button></div>
      <p class="work-muted project-file-hint">Перетащите файлы сюда · до {{ size(data!.maxBytes) }} на файл.</p>
      <div v-if="queue.length" class="project-file-queue" aria-live="polite">
        <div v-for="item in queue" :key="item.key"><span class="queued-file"><Icon :name="fileIcon(item.file.name)" /><strong>{{ item.file.name }}</strong><small class="project-file-format">{{ fileFormat(item.file.name) }}</small></span><small>{{ item.state }}{{ item.state === 'Загрузка' ? ` · ${item.progress}%` : '' }}</small><progress v-if="item.state === 'Загрузка'" :value="item.progress" max="100" :aria-label="item.file.name"/></div>
        <div class="work-actions"><button type="button" v-if="!busy && remaining" class="work-primary" @click="upload">Загрузить</button><button type="button" v-if="busy" @click="cancel">Остановить загрузку</button><button type="button" v-else @click="queue = []">Очистить список</button></div>
      </div>
    </div>
    <div v-if="selected" class="work-confirm" role="alert">
      <p>{{ selected.deletedAt ? 'Восстановить' : 'Переместить в корзину' }} «{{ selected.name }}»?</p>
      <div class="work-actions"><button type="button" :disabled="busy" @click="changeState">Подтвердить</button><button type="button" :disabled="busy" @click="selected = null">Отмена</button></div>
    </div>
    <div v-if="data?.items.length" class="work-table-wrap project-file-table">
      <table><thead><tr><th>Файл</th><th>Размер</th><th>Добавил</th><th>Дата</th><th>Действия</th></tr></thead><tbody>
        <template v-for="group in groups" :key="group.folder"><tr v-if="group.folder" class="project-document-folder"><th colspan="5" scope="rowgroup"><Icon name="lucide:folder" /> {{ group.folder }}</th></tr>
        <tr v-for="file in group.files" :key="file.id">
          <td class="project-file-name"><div class="project-file-identity"><span class="project-file-symbol" aria-hidden="true"><Icon :name="fileIcon(file.name)" /><small class="project-file-format">{{ fileFormat(file.name) }}</small></span><div><strong>{{ file.name }}</strong><small v-if="file.documentType || file.taskId" class="project-file-meta">{{ file.documentType }}<template v-if="file.taskId"> · Работа #{{ file.taskId }}</template></small></div></div></td><td>{{ size(file.size) }}</td><td>{{ workUserName(file.owner) }}</td><td>{{ day(file.createdAt) }}</td>
          <td><div class="work-actions"><a v-if="!file.deletedAt" :href="base + '/' + file.id" download>Скачать</a><button type="button" v-if="file.canManage && !project.archivedAt" :disabled="busy" @click="selected = file">{{ file.deletedAt ? 'Восстановить' : 'В корзину' }}</button></div></td>
        </tr></template>
      </tbody></table>
    </div>
    <p v-else-if="data && !loading" class="work-empty">{{ trash ? 'Корзина пуста' : 'В этой области пока нет файлов' }}</p>
    <footer v-if="data" class="work-list-footer"><span>Всего файлов: {{ data.total }}</span><button type="button" v-if="data.page > 1" :disabled="busy || loading" @click="load(data.page - 1)">Назад</button><button type="button" v-if="data.page * 40 < data.total" :disabled="busy || loading" @click="load(data.page + 1)">Далее</button></footer>
  </section>
</template>
<style scoped>
.project-files{min-width:0}.project-file-drop{margin:16px 0;padding:18px;border:2px dashed var(--work-line);border-radius:10px;background:var(--work-panel);display:grid;gap:10px}.project-file-drop.dragging{border-color:var(--work-accent)}.project-file-drop>button{justify-self:start}.project-file-queue{display:grid;gap:10px;max-height:300px;overflow:auto}.project-file-queue>div{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.project-file-queue span{overflow-wrap:anywhere;flex:1;min-width:140px}.project-file-queue small{color:var(--work-muted)}.project-file-queue progress{width:100%;accent-color:var(--work-accent)}.project-file-table{margin-top:16px;max-height:60vh;overflow:auto}.project-file-table thead th{position:sticky;top:0;background:var(--work-panel)}.project-file-name{min-width:180px;max-width:420px;overflow-wrap:anywhere}.project-file-table a{color:var(--work-accent);text-decoration:underline}.project-file-table td{font-size:13px}

.project-file-upload-controls{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.project-file-upload-controls label{flex:1;min-width:160px;margin:0}.project-file-upload-controls button{flex-shrink:0}.project-file-hint{margin:0;font-size:11px}.project-file-identity{display:flex;align-items:center;gap:9px}.project-file-identity>div{min-width:0}.project-file-identity strong{display:block;font-weight:650;color:var(--work-text)}.project-file-symbol{display:flex;flex-direction:column;align-items:center;gap:2px;flex:0 0 34px;color:var(--work-accent)}.project-file-symbol>.iconify{width:24px;height:24px}.project-file-format{font-size:9px;line-height:1.2;border:1px solid var(--work-line);padding:1px 3px;border-radius:3px;background:var(--work-panel);color:var(--work-text);font-weight:600}.project-file-meta{display:block;margin-top:2px;font-size:10px;color:var(--work-muted)}.project-document-folder th{padding:5px 8px;text-align:left;font-size:11px;font-weight:600;background:color-mix(in srgb,var(--work-line) 30%,var(--work-panel))}.project-document-folder .iconify{color:#d69b25;margin-right:5px}.queued-file{display:flex;gap:6px;align-items:center}.queued-file strong{overflow-wrap:anywhere}
.project-files-compact .work-toolbar{margin:0;gap:8px}.project-files-compact .work-toolbar button{padding:4px 8px;font-size:11px}.project-files-compact .project-files-access{margin:5px 0;font-size:10px}.project-files-compact .project-file-drop{margin:6px 0;padding:8px 10px;gap:5px;border-width:1px;border-radius:6px}.project-files-compact .project-file-drop :is(button,select){padding:5px 8px;min-height:28px;font-size:12px}.project-files-compact .project-file-drop label{font-size:11px;gap:3px}.project-files-compact .project-file-queue{gap:5px;max-height:130px}.project-files-compact .project-file-queue>div{gap:6px}.project-files-compact .project-file-queue span{font-size:11px}.project-files-compact .project-file-table{margin-top:7px;max-height:38vh}.project-files-compact .project-file-table :is(td,th){padding:6px 8px;font-size:12px}.project-files-compact .project-file-table button{padding:3px 6px;font-size:11px}.project-files-compact .work-list-footer{padding:5px 0;font-size:11px}.project-files-compact .project-file-table .work-actions{gap:6px}
</style>
