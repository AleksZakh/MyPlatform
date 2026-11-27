<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import ReferenceImportReview from './ReferenceImportReview.vue';

import type { StructureRecord } from '~~/shared/types/diagnostic-structures';
import { planStructureImport,structureHeaderKey } from '~~/shared/utils/diagnostic-structures';
import { readStructuresWorkbook, type StructureWorkbookSheet } from '~/utils/diagnostic/readStructuresWorkbook';
const props=defineProps<{open:boolean; previewOnly?:boolean}>();
const emit=defineEmits<{ 'update:open':[value:boolean]; preview:[records:StructureRecord[]]; imported:[] }>();
const busy=ref(false), fileName=ref(''), note=ref(''), error=ref(''), sheets=ref<StructureWorkbookSheet[]>([]), sheetIndex=ref(0), dragging=ref(false), inputKey=ref(0);
const reviewing=ref(false);
let generation=0;
const readingProgress=ref('');
const fileInput=ref<HTMLInputElement|null>(null);
const prepared=computed(()=>{
  const sheet=sheets.value[sheetIndex.value];
  if(!sheet)return {plan:null,error:''};
  try{return {plan:planStructureImport(sheet.rows,[],fileName.value,note.value),error:''};}
  catch(e){return {plan:null,error:e instanceof Error?e.message:'Не удалось проверить столбцы.'};}
});
const present=computed(()=>[...(sheets.value[sheetIndex.value]?.rows[0]||[]).map(structureHeaderKey).filter(Boolean).map(k=>k==='lengthMetres'?'lengthRaw':String(k)),...(note.value.trim()?['note']:[])]);
const plan=computed(()=>prepared.value.plan);
watch(()=>props.open,open=>{if(!open){generation++;busy.value=false;readingProgress.value='';fileName.value='';note.value='';error.value='';sheets.value=[];sheetIndex.value=0;inputKey.value++;}});
async function choose(files:FileList|File[]|null){
  if(busy.value||reviewing.value||!files?.length)return;

  sheets.value=[];error.value='';fileName.value='';sheetIndex.value=0;
  if(files.length!==1){error.value='Выберите один Excel-файл.';return;}
  const file=files[0];if(!file)return;
  const current=++generation;busy.value=true;fileName.value=file.name;readingProgress.value='Открытие книги…';
  try{await nextTick();await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    const parsed=await readStructuresWorkbook(file,message=>{if(current===generation)readingProgress.value=message;});if(current===generation)sheets.value=parsed;}
  catch(e){if(current===generation)error.value=e instanceof Error?e.message:'Не удалось прочитать Excel. Проверьте файл.';}
  finally{if(current===generation){busy.value=false;inputKey.value++;}}
}
function picked(event:Event){const input=event.target as HTMLInputElement;const files=Array.from(input.files||[]);input.value='';void choose(files);}
function reread(){fileInput.value?.click();}
function dropped(event:DragEvent){dragging.value=false;void choose(event.dataTransfer?.files||null);}
function close(){if(!busy.value&&!reviewing.value)emit('update:open',false);}
</script>
<template>
  <UModal :open="open" :title="previewOnly?'Проверка Excel · сооружения':'Импорт сооружений из Excel'" description="Сверка с эталонной базой сооружений" :dismissible="!busy&&!reviewing" :ui="{content:'st-import-panel w-[calc(100vw-2rem)] max-w-[1440px]',body:'st-import-body block min-w-0',footer:'st-import-footer'}" @update:open="value=>{if(!value)close()}">
    <template #body>
      <div class="st-import-content">
      <div class="st-import-toolbar" :class="{'st-import-has-sheet':sheets.length}">
        <div class="st-drop" :class="{'st-drop-active':dragging}" @dragover.prevent="dragging=true" @dragleave.prevent="dragging=false" @drop.prevent="dropped">
          <Icon name="lucide:file-up" aria-hidden="true"/>
          <div class="st-drop-controls"><label>Excel-файл<input ref="fileInput" :key="inputKey" type="file" accept=".xlsx" :disabled="busy||reviewing" @change="picked"/></label><small>Выберите или перетащите .xlsx · до 2 МБ</small></div>
        </div>
        <label v-if="sheets.length" class="st-import-sheet">Лист<select v-model.number="sheetIndex" :disabled="busy||reviewing"><option v-for="(sheet,index) in sheets" :key="sheet.name" :value="index">{{ sheet.name }}</option></select></label>
        <label class="st-import-note">Примечание для добавляемых сооружений<textarea v-model="note" rows="2" maxlength="2000" :disabled="busy||reviewing" placeholder="Например, название обследования или группы"/></label>
      </div>
      <div v-if="busy" class="st-import-reading" role="status" aria-live="polite"><span class="st-import-spinner" aria-hidden="true"/><div><strong>Чтение файла {{ fileName }}</strong><p>{{ readingProgress }}</p></div></div>
      <p v-else-if="fileName" class="st-import-filename">Файл: {{ fileName }} <button type="button" :disabled="busy" @click="reread">Выбрать исправленный файл</button></p>
      <p v-if="error||prepared.error||plan?.errors.length" class="st-muted">Исправьте файл и выберите его снова здесь, даже с тем же именем. Закрывать окно не нужно.</p>
      <p v-if="error||prepared.error" role="alert" class="st-error">{{ error||prepared.error }}</p>
      <template v-if="plan">
        <div class="st-import-summary" role="status"><span>Строк: <b>{{ plan.total }}</b></span><span>К сверке: <b>{{ plan.records.length }}</b></span><span>Пропустить: <b>{{ plan.skipped.length }}</b></span><span>Ошибок: <b>{{ plan.errors.length }}</b></span></div>
        <p v-if="plan.ignoredHeaders.length" class="st-notice">Не используются столбцы: {{ plan.ignoredHeaders.join(', ') }}.</p>
        <p v-if="!plan.total" class="st-notice">В листе есть заголовки, но нет строк сооружений.</p>
        <details v-if="plan.errors.length" open class="st-import-issues"><summary>Исправьте ошибки в исходном файле</summary><ul><li v-for="issue in plan.errors.slice(0,50)" :key="issue.row">Строка {{ issue.row }}{{ issue.code?' · '+issue.code:'' }}: {{ issue.reason }}</li></ul><p v-if="plan.errors.length>50">Показаны первые 50 ошибок.</p></details>
        <details v-if="plan.skipped.length" class="st-import-issues"><summary>Пропускаемые строки ({{ plan.skipped.length }})</summary><ul><li v-for="issue in plan.skipped.slice(0,50)" :key="issue.row">Строка {{ issue.row }} · {{ issue.code }}: {{ issue.reason }}</li></ul><p v-if="plan.skipped.length>50">Показаны первые 50 строк.</p></details>
        <ReferenceImportReview v-if="plan.records.length&&!plan.errors.length" :records="plan.records" :present="present" :file-name="fileName" :readonly="previewOnly" @busy="reviewing=$event" @imported="emit('imported')"/>
      </template>
      <div v-if="!fileName&&!busy&&!error" class="st-import-empty"><Icon name="lucide:table-2" aria-hidden="true"/><p>Выберите Excel-файл — здесь появятся результаты проверки и таблица сооружений.</p></div>
      </div>
    </template>
    <template #footer><button type="button" :disabled="busy||reviewing" @click="close">Закрыть</button></template>
  </UModal>
</template>

<style scoped>
.st-import-reading{display:flex;align-items:center;gap:12px;padding:12px;border:1px solid currentColor;border-radius:8px;color:var(--ui-primary,#0284c7)}
.st-import-reading p{margin:4px 0 0;font-size:13px}
.st-import-spinner{display:inline-block;width:22px;height:22px;flex:0 0 22px;border:3px solid currentColor;border-right-color:transparent;border-radius:50%;animation:st-import-spin .8s linear infinite}
@keyframes st-import-spin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.st-import-spinner{animation:none}}
</style>
