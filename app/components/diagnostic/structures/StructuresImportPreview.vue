<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {structureRequestError} from '~/composables/diagnostic/useStructures';
import {parseStructureImportBatch} from '~~/shared/utils/diagnostic-structure-import';
import type { StructureRecord } from '~~/shared/types/diagnostic-structures';
import { planStructureImport } from '~~/shared/utils/diagnostic-structures';
import { readStructuresWorkbook, type StructureWorkbookSheet } from '~/utils/diagnostic/readStructuresWorkbook';
const props=defineProps<{open:boolean; existing:Pick<StructureRecord,'issoCode'>[]; previewOnly?:boolean}>();
const emit=defineEmits<{ 'update:open':[value:boolean]; preview:[records:StructureRecord[]]; imported:[] }>();
const busy=ref(false), fileName=ref(''), note=ref(''), error=ref(''), sheets=ref<StructureWorkbookSheet[]>([]), sheetIndex=ref(0), dragging=ref(false), inputKey=ref(0);
const started=ref(false),finished=ref(false),cursor=ref(0),createdCount=ref(0),skippedCount=ref(0),targetCount=ref(0);
let pending:StructureRecord[]=[];
let generation=0;
const prepared=computed(()=>{
  const sheet=sheets.value[sheetIndex.value];
  if(!sheet)return {plan:null,error:''};
  try{return {plan:planStructureImport(sheet.rows,props.existing,fileName.value,note.value),error:''};}
  catch(e){return {plan:null,error:e instanceof Error?e.message:'Не удалось проверить столбцы.'};}
});
const plan=computed(()=>prepared.value.plan);
watch(()=>props.open,open=>{if(!open){generation++;busy.value=false;started.value=false;finished.value=false;cursor.value=0;createdCount.value=0;skippedCount.value=0;targetCount.value=0;pending=[];fileName.value='';note.value='';error.value='';sheets.value=[];sheetIndex.value=0;inputKey.value++;}});
async function choose(files:FileList|null){
  if(busy.value||started.value||!files?.length)return;
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
async function apply(){
  if(props.previewOnly||busy.value||finished.value||!plan.value||plan.value.errors.length||!plan.value.records.length)return;
  error.value='';
  if(!started.value){
    pending=plan.value.records.map(row=>({...row}));
    // Validate every batch before the first write, including lengths and unsupported links.
    try{for(let i=0;i<pending.length;i+=25)parseStructureImportBatch({fileName:fileName.value,records:pending.slice(i,i+25)});}
    catch(e){error.value=e instanceof Error?e.message:'Некорректные данные.';return;}
    targetCount.value=pending.length;started.value=true;
  }
  busy.value=true;
  try{
    while(cursor.value<pending.length){
      const records=pending.slice(cursor.value,cursor.value+25);
      const result=await $fetch<{created:string[];skipped:string[]}>('/api/diagnostic/structures/import',{
        method:'POST',headers:{'x-space-diagnostic':'1'},body:{fileName:fileName.value,records},retry:0,
      });
      createdCount.value+=result.created.length;skippedCount.value+=result.skipped.length;cursor.value+=records.length;
    }
    finished.value=true;
  }catch(e){error.value=structureRequestError(e)+' Завершённые пакеты сохранены. Нажмите «Продолжить импорт» или повторно загрузите файл: существующие коды будут пропущены.';}
  finally{busy.value=false;emit('imported');}
}
</script>
<template>
  <UModal :open="open" :title="previewOnly?'Проверка Excel · сооружения':'Импорт сооружений из Excel'" description="Проверка Excel и пропуск существующих кодов ИССО" :dismissible="!busy" :ui="{content:'st-import-panel w-[calc(100vw-2rem)] max-w-[1440px]',body:'st-import-body block min-w-0',footer:'st-import-footer'}" @update:open="value=>{if(!value)close()}">
    <template #body>
      <div class="st-import-content">
      <div class="st-import-toolbar" :class="{'st-import-has-sheet':sheets.length}">
        <div class="st-drop" :class="{'st-drop-active':dragging}" @dragover.prevent="dragging=true" @dragleave.prevent="dragging=false" @drop.prevent="dropped">
          <Icon name="lucide:file-up" aria-hidden="true"/>
          <div class="st-drop-controls"><label>Excel-файл<input :key="inputKey" type="file" accept=".xlsx" :disabled="busy||started" @change="picked"/></label><small>Выберите или перетащите .xlsx · до 2 МБ</small></div>
        </div>
        <label v-if="sheets.length" class="st-import-sheet">Лист<select v-model.number="sheetIndex" :disabled="busy||started"><option v-for="(sheet,index) in sheets" :key="sheet.name" :value="index">{{ sheet.name }}</option></select></label>
        <label class="st-import-note">Примечание для добавляемых сооружений<textarea v-model="note" rows="2" maxlength="2000" :disabled="busy||started" placeholder="Например, название обследования или группы"/></label>
      </div>
      <p v-if="busy&&!started" role="status">Чтение файла {{ fileName }}…</p>
      <p v-else-if="fileName" class="st-import-filename">Файл: {{ fileName }}</p>
      <p v-if="previewOnly" class="st-preview-note">Проверка файла без записи в справочник. Существующие коды сверены со всей базой на момент открытия окна. Результаты остаются в этом окне.</p><p v-else class="st-preview-note">После проверки нажмите «Импортировать». Новые сооружения сохраняются в справочник. Существующие коды, включая архивные, пропускаются без изменения данных. Требуется право создания сооружений.</p>
      <p v-if="started" class="st-preview-note" role="status">{{ finished?'Импорт завершён.':'Импорт:' }} Обработано {{ cursor }} из {{ targetCount }}. Создано: {{ createdCount }}. Пропущено сервером: {{ skippedCount }}.</p>
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
      <div v-if="!fileName&&!busy&&!error" class="st-import-empty"><Icon name="lucide:table-2" aria-hidden="true"/><p>Выберите Excel-файл — здесь появятся результаты проверки и таблица сооружений.</p></div>
      </div>
    </template>
    <template #footer><span class="st-muted">{{ previewOnly?'Проверка файла без сохранения':'Сохранение в справочник сооружений' }}</span><button type="button" :disabled="busy" @click="close">Закрыть</button><button v-if="!previewOnly" type="button" class="st-primary" :disabled="busy||finished||!plan?.records.length||!!plan?.errors.length" @click="apply">{{ finished?'Импорт завершён':started?'Продолжить импорт':'Импортировать ('+(plan?.records.length||0)+')' }}</button></template>
  </UModal>
</template>
