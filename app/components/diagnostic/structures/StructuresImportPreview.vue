<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { StructureRecord } from '~~/shared/types/diagnostic-structures';
import { planStructureImport } from '~~/shared/utils/diagnostic-structures';
import { readStructuresWorkbook, type StructureWorkbookSheet } from '~/utils/diagnostic/readStructuresWorkbook';
const props=defineProps<{open:boolean; existing:StructureRecord[]}>();
const emit=defineEmits<{ 'update:open':[value:boolean]; preview:[records:StructureRecord[]] }>();
const busy=ref(false), fileName=ref(''), note=ref(''), error=ref(''), sheets=ref<StructureWorkbookSheet[]>([]), sheetIndex=ref(0), dragging=ref(false), inputKey=ref(0);
let generation=0;
const prepared=computed(()=>{
  const sheet=sheets.value[sheetIndex.value];
  if(!sheet)return {plan:null,error:''};
  try{return {plan:planStructureImport(sheet.rows,props.existing,fileName.value,note.value),error:''};}
  catch(e){return {plan:null,error:e instanceof Error?e.message:'Не удалось проверить столбцы.'};}
});
const plan=computed(()=>prepared.value.plan);
watch(()=>props.open,open=>{if(!open){generation++;busy.value=false;fileName.value='';note.value='';error.value='';sheets.value=[];sheetIndex.value=0;inputKey.value++;}});
async function choose(files:FileList|null){
  if(busy.value||!files?.length)return;
  sheets.value=[];error.value='';fileName.value='';sheetIndex.value=0;
  if(files.length!==1){error.value='Выберите один Excel-файл.';return;}
  const file=files[0];if(!file)return;
  const current=++generation;busy.value=true;fileName.value=file.name;
  try{const parsed=await readStructuresWorkbook(file);if(current===generation)sheets.value=parsed;}
  catch(e){if(current===generation)error.value=e instanceof Error?e.message:'Не удалось прочитать Excel. Проверьте файл.';}
  finally{if(current===generation)busy.value=false;}
}
function picked(event:Event){void choose((event.target as HTMLInputElement).files);}
function dropped(event:DragEvent){dragging.value=false;void choose(event.dataTransfer?.files||null);}
function close(){if(!busy.value)emit('update:open',false);}
function apply(){if(!busy.value&&plan.value&&!plan.value.errors.length&&plan.value.records.length){emit('preview',plan.value.records);emit('update:open',false);}}
</script>
<template>
  <UModal :open="open" title="Импорт сооружений · предварительный просмотр" description="Проверка Excel и пропуск существующих кодов ИССО" :dismissible="!busy" :ui="{content:'st-import-panel w-[calc(100vw-2rem)] max-w-5xl',body:'st-import-body',footer:'st-import-footer'}" @update:open="value=>{if(!value)close()}">
    <template #body>
      <p class="st-preview-note">Файл обрабатывается в браузере. Данные не отправляются на сервер и не записываются в БД. Добавленные строки исчезнут после обновления страницы.</p>
      <div class="st-drop" :class="{'st-drop-active':dragging}" @dragover.prevent="dragging=true" @dragleave.prevent="dragging=false" @drop.prevent="dropped">
        <Icon name="lucide:file-spreadsheet" aria-hidden="true"/>
        <label>Выберите Excel-файл или перетащите его сюда<input :key="inputKey" type="file" accept=".xlsx" :disabled="busy" @change="picked"/></label>
        <small>.xlsx, до 2 МБ · заголовки в первой строке</small>
      </div>
      <p v-if="busy" role="status">Чтение файла {{ fileName }}…</p>
      <div class="st-import-options">
        <label v-if="sheets.length">Лист<select v-model.number="sheetIndex"><option v-for="(sheet,index) in sheets" :key="sheet.name" :value="index">{{ sheet.name }}</option></select></label>
        <label>Примечание для добавляемых сооружений<textarea v-model="note" rows="2" maxlength="2000" :disabled="busy" placeholder="Например, название обследования или группы"/></label>
      </div>
      <p class="st-muted">Повторный код ИССО пропускается. Существующие записи и их примечания не изменяются.</p>
      <p v-if="error||prepared.error" role="alert" class="st-error">{{ error||prepared.error }}</p>
      <template v-if="plan">
        <div class="st-import-summary" role="status"><span>Строк: <b>{{ plan.total }}</b></span><span>Новых: <b>{{ plan.records.length }}</b></span><span>Пропустить: <b>{{ plan.skipped.length }}</b></span><span>Ошибок: <b>{{ plan.errors.length }}</b></span></div>
        <p v-if="plan.ignoredHeaders.length" class="st-notice">Не используются столбцы: {{ plan.ignoredHeaders.join(', ') }}.</p>
        <p v-if="!plan.total" class="st-notice">В листе есть заголовки, но нет строк сооружений.</p>
        <details v-if="plan.errors.length" open class="st-import-issues"><summary>Исправьте ошибки в исходном файле</summary><ul><li v-for="issue in plan.errors.slice(0,50)" :key="issue.row">Строка {{ issue.row }}{{ issue.code?' · '+issue.code:'' }}: {{ issue.reason }}</li></ul><p v-if="plan.errors.length>50">Показаны первые 50 ошибок.</p></details>
        <details v-if="plan.skipped.length" class="st-import-issues"><summary>Пропускаемые строки ({{ plan.skipped.length }})</summary><ul><li v-for="issue in plan.skipped.slice(0,50)" :key="issue.row">Строка {{ issue.row }} · {{ issue.code }}: {{ issue.reason }}</li></ul><p v-if="plan.skipped.length>50">Показаны первые 50 строк.</p></details>
        <div v-if="plan.records.length" class="st-import-table" tabindex="0" aria-label="Новые сооружения из файла"><table><caption class="sr-only">Новые сооружения, первые 50 строк</caption><thead><tr><th>Строка</th><th>Код ИССО</th><th>Автодорога</th><th>Место</th><th>Сооружение</th><th>Управление</th></tr></thead><tbody><tr v-for="row in plan.records.slice(0,50)" :key="row.id"><td>{{ row.sourceRow }}</td><td>{{ row.issoCode }}</td><td>{{ row.roadName }}</td><td>{{ row.location }}</td><td>{{ row.structureName }}</td><td>{{ row.management }}</td></tr></tbody></table></div>
        <p v-if="plan.records.length>50" class="st-muted">Показаны первые 50 из {{ plan.records.length }} новых сооружений.</p>
      </template>
    </template>
    <template #footer><span class="st-muted">Только временный просмотр</span><button type="button" :disabled="busy" @click="close">Закрыть</button><button type="button" class="st-primary" :disabled="busy||!plan?.records.length||!!plan?.errors.length" @click="apply">Добавить в просмотр{{ plan?.records.length?' ('+plan.records.length+')':'' }}</button></template>
  </UModal>
</template>
