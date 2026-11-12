<script setup lang="ts">
import {ref,onMounted,onBeforeUnmount,computed} from 'vue';
import Modal from '../work/Modal.vue';
import type {UptsExportView,UptsExportPreview} from '~~/shared/types/upts-export';
const props=defineProps<{filters:Record<string,string|number|undefined>}>();const emit=defineEmits<{close:[]}>();
// Freeze the same filters for preview and preparation while this window is open.
const filters={...props.filters},preview=ref<UptsExportPreview|null>(null),registry=ref(true),types=ref<string[]>([]),job=ref<UptsExportView|null>(null),recent=ref<UptsExportView[]>([]),error=ref(''),busy=ref(false);
let alive=true,timer:ReturnType<typeof setTimeout>|undefined;const controller=new AbortController();let requestId=crypto.randomUUID();
const selectedCount=computed(()=>preview.value?.types.filter(t=>!types.value.length?registry.value:types.value.includes(t.name)).reduce((n,t)=>n+t.count,0)||0);
const canPrepare=computed(()=>!!preview.value&&selectedCount.value>0&&selectedCount.value<=preview.value.limit&&(registry.value||types.value.length>0));
const labels:Record<string,string>={PREPARED:'Состав подготовлен',QUEUED:'В очереди',RUNNING:'Собираем архив…',READY:'Архив готов',FAILED:'Ошибка выгрузки',CANCELLED:'Выгрузка отменена'};
const bytes=(n:number)=>n<1024*1024?(n/1024).toFixed(1)+' КБ':n<1024**3?(n/1024**2).toFixed(1)+' МБ':(n/1024**3).toFixed(2)+' ГБ';
const when=(v:string)=>new Intl.DateTimeFormat('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'short'}).format(new Date(v));
function message(e:any){return e.data?.message||'Не удалось выполнить запрос. Повторите попытку.';}
async function load(){busy.value=true;error.value='';try{const [p,r]=await Promise.all([$fetch<UptsExportPreview>('/api/upts/exports/preview',{query:filters,signal:controller.signal}),$fetch<UptsExportView[]>('/api/upts/exports',{signal:controller.signal})]);if(!alive)return;preview.value=p;types.value=p.types.map(t=>t.name);recent.value=r;}catch(e){if(alive)error.value=message(e);}finally{if(alive)busy.value=false;}}
async function prepare(){busy.value=true;error.value='';try{job.value=await $fetch<UptsExportView>('/api/upts/exports',{method:'POST',headers:{'x-space-work':'1'},query:filters,body:{registry:registry.value,types:types.value,requestId},signal:controller.signal});}catch(e){if(alive)error.value=message(e);}finally{if(alive)busy.value=false;}}
async function poll(){if(!alive||!job.value)return;try{job.value=await $fetch<UptsExportView>(`/api/upts/exports/${job.value.id}`,{signal:controller.signal});if(alive&&['QUEUED','RUNNING'].includes(job.value.status))timer=setTimeout(poll,2000);}catch(e){if(alive)error.value=message(e);}}
async function confirm(){if(!job.value)return;busy.value=true;error.value='';try{job.value=await $fetch<UptsExportView>(`/api/upts/exports/${job.value.id}/confirm`,{method:'POST',headers:{'x-space-work':'1'},body:{},signal:controller.signal});await poll();}catch(e){if(alive)error.value=message(e);}finally{if(alive)busy.value=false;}}
async function cancel(){if(!job.value)return;busy.value=true;error.value='';try{await $fetch(`/api/upts/exports/${job.value.id}/cancel`,{method:'POST',headers:{'x-space-work':'1'},body:{},signal:controller.signal});job.value={...job.value,status:'CANCELLED'};clearTimeout(timer);}catch(e){if(alive)error.value=message(e);}finally{if(alive)busy.value=false;}}
function reset(){clearTimeout(timer);job.value=null;requestId=crypto.randomUUID();load();}
async function select(j:UptsExportView){job.value=j;clearTimeout(timer);await poll();}
onMounted(load);onBeforeUnmount(()=>{alive=false;controller.abort();clearTimeout(timer);});
</script>
<template><Modal title="Экспорт документов УПТС" subtitle="Excel и документы в ZIP-архиве" icon="vscode-icons:file-type-excel2" grey-header @close="emit('close')">
 <div class="upts-export">
 <p class="export-info">Учитываются все фильтры основного экрана: объект, исполнитель, поиск, документы и архив. Документы группируются по объектам и типам.</p>
 <p v-if="error" class="work-error" role="alert">{{ error }}</p>
 <p v-if="busy" role="status">Загрузка…</p>
 <template v-if="!job">
 <fieldset :disabled="busy"><legend>Содержимое выгрузки</legend><label class="work-check"><input v-model="registry" type="checkbox" />Реестр</label><small>Excel-таблица. Названия включённых файлов — ссылки на документы в архиве.</small>
 <template v-for="t in preview?.types||[]" :key="t.name"><label class="work-check"><input v-model="types" type="checkbox" :value="t.name" />{{ t.name }} <span class="work-muted">({{ t.count }})</span></label></template>
 <p v-if="preview&&!preview.types.length" class="work-muted">В выбранных объектах нет общих документов.</p></fieldset>
 <p v-if="preview" class="work-muted">Объектов: {{ preview.objects }}. Документов к выгрузке: {{ selectedCount }}. Лимит: {{ preview.limit }}.</p>
 <p v-if="preview&&selectedCount>preview.limit" class="work-error">Уточните фильтры или сократите список типов документов.</p>
 <p v-if="registry&&!types.length" class="work-muted">Будет выгружен только реестр всех документов выборки, без файлов и ссылок на них.</p>
 <p class="work-muted">Сначала подготовим состав и размер выгрузки. Сборка ZIP начнётся после подтверждения. Готовые архивы доступны сутки. Для перехода по ссылкам распакуйте весь архив.</p>
 <div class="work-actions"><button class="work-primary" :disabled="busy||!canPrepare" @click="prepare">Подготовить выгрузку</button><button :disabled="busy" @click="load">Обновить</button></div>
 <details v-if="recent.length"><summary>Недавние выгрузки</summary><button v-for="j in recent" :key="j.id" class="export-recent" @click="select(j)">{{ when(j.createdAt) }} · {{ labels[j.status] }} · {{ j.documents }} документов</button></details>
 </template>
 <template v-else><h3>{{ labels[job.status] }}</h3><p>Объектов: {{ job.objects }} · Документов: {{ job.documents }} · Размер файлов: {{ bytes(job.bytes) }}</p><p v-if="job.registry">Реестр.xlsx</p><p>{{ job.types.join(', ') }}</p>
 <progress v-if="job.status==='RUNNING'" :value="job.processed" :max="job.documents" /><p v-if="['QUEUED','RUNNING'].includes(job.status)" role="status">Обработано: {{ job.processed }} из {{ job.documents }}. Окно можно закрыть — сборка продолжится.</p>
 <p v-if="job.error" class="work-error" role="alert">{{ job.error }}</p>
 <div class="work-actions"><button v-if="job.status==='PREPARED'" class="work-primary" :disabled="busy" @click="confirm">Собрать ZIP</button><a v-if="job.status==='READY'" class="export-download" :href="`/api/upts/exports/${job.id}/download`">Скачать ZIP ({{ bytes(job.archiveBytes||0) }})</a><button v-if="['PREPARED','QUEUED','RUNNING'].includes(job.status)" :disabled="busy" @click="cancel">Отменить выгрузку</button><button v-else @click="reset">Новая выгрузка</button><button v-if="error" :disabled="busy" @click="poll">Обновить состояние</button></div></template>
 <footer><button @click="emit('close')">Закрыть</button></footer>
 </div>
</Modal></template>
<style scoped>
.upts-export{display:grid;gap:12px}.upts-export p{margin:0;font-size:13px}.upts-export fieldset{border:1px solid var(--work-line);border-radius:5px;padding:12px;display:grid;gap:12px;max-height:36vh;overflow:auto}.upts-export legend{padding:0 6px;font-weight:600}.upts-export small{color:var(--work-muted);padding-left:23px}.upts-export label.work-check{display:flex;flex-direction:row;gap:8px;align-items:center}.export-info{padding:10px;background:color-mix(in srgb,var(--work-accent) 8%,var(--work-panel));border:1px solid var(--work-line);border-radius:5px}.export-download{padding:8px 12px;color:white;background:var(--work-accent);border-radius:5px;text-decoration:none}.upts-export footer{border-top:1px solid var(--work-line);padding-top:12px;text-align:right}.export-recent{display:block;margin-top:6px;width:100%;text-align:left}.upts-export progress{width:100%}
</style>
