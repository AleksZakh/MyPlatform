<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import type {ContractStructureListItem} from '~~/shared/types/diagnostic-contract-structures';
import type {ContractStructureWorkRecord,ContractStructureWorksResponse} from '~~/shared/types/diagnostic-contract-details';
import ContractColumnFilter from './ContractColumnFilter.vue';
import WorkStatusIcon from './WorkStatusIcon.vue';
import WorkStatusLegend from './WorkStatusLegend.vue';
import {structureFilterColumns,emptyStructureFilters,structureMatches,filterText,diagnosticWorkStatus,type StructureFilterKey} from '~~/shared/utils/diagnostic-contract-table';
const props=defineProps<{contractId:number|null}>();
const emit=defineEmits<{count:[number]}>();
const rows=ref<ContractStructureListItem[]>([]),busy=ref(false),error=ref('');
const filters=ref(emptyStructureFilters()),filterResetKey=ref(0),filterPortal=ref<HTMLElement|null>(null);
const visibleRows=computed(()=>rows.value.filter(row=>structureMatches(row,filters.value)));
const hasFilters=computed(()=>Object.values(filters.value).some(value=>!!filterText(value)));
const filterOptions=computed(()=>Object.fromEntries(structureFilterColumns.map(({key})=>[key,[...new Set(rows.value.filter(row=>structureMatches(row,filters.value,key)).map(row=>row[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}))])) as Record<StructureFilterKey,string[]>);
function clearFilters(){filters.value=emptyStructureFilters();filterResetKey.value++;}
const selectedId=ref<number|null>(null);
const selected=computed(()=>rows.value.find(row=>row.id===selectedId.value)??null);
const works=ref<ContractStructureWorkRecord[]>([]),worksBusy=ref(false),worksError=ref('');
const detail=ref<ContractStructureWorkRecord|null>(null);
const date=(s:string|null)=>s?s.split('-').reverse().join('.'):'—';
const state=(s:string)=>diagnosticWorkStatus(s).title;
const hasUnknownStatus=computed(()=>works.value.some(work=>diagnosticWorkStatus(work.status).key==='unknown'));
let listGeneration=0,worksGeneration=0;

function clearWorks(){worksGeneration++;works.value=[];worksError.value='';worksBusy.value=false;detail.value=null;}
async function loadWorks(){
 clearWorks();
 const request=worksGeneration,contractId=props.contractId,linkId=selectedId.value;
 if(!contractId||!linkId)return;
 worksBusy.value=true;
 try{
  const data=await $fetch<ContractStructureWorksResponse>(`/api/diagnostic/contracts/${contractId}/structures/${linkId}/works`);
  if(request===worksGeneration&&data.linkId===linkId)works.value=data.works;
 }catch(e:any){if(request===worksGeneration)worksError.value=e?.data?.message||'Не удалось загрузить работы сооружения.';}
 finally{if(request===worksGeneration)worksBusy.value=false;}
}
async function load(){
 const request=++listGeneration,contractId=props.contractId;
 rows.value=[];selectedId.value=null;busy.value=false;error.value='';clearWorks();
 if(!contractId){emit('count',0);return;}
 busy.value=true;
 try{
  const data=await $fetch<ContractStructureListItem[]>(`/api/diagnostic/contracts/${contractId}/structures`);
  if(request!==listGeneration)return;
  rows.value=data;emit('count',data.length);selectedId.value=visibleRows.value[0]?.id??null;
 }catch(e:any){if(request===listGeneration)error.value=e?.data?.message||'Не удалось загрузить сооружения.';}
 finally{if(request===listGeneration)busy.value=false;}
}
watch(()=>props.contractId,()=>{clearFilters();void load();},{immediate:true});
watch(visibleRows,list=>{if(!list.some(row=>row.id===selectedId.value))selectedId.value=list[0]?.id??null;});
watch(selectedId,()=>void loadWorks());
onBeforeUnmount(()=>{listGeneration++;worksGeneration++;});
</script>

<template>
 <section class="contract-structures-workspace">
  <header class="contract-section-head">
   <h2>Перечень сооружений <small v-if="!busy&&!error" class="cs-filter-count">Показано: {{ visibleRows.length }} из {{ rows.length }}</small></h2>
   <button type="button" :disabled="!hasFilters" @click="clearFilters">Очистить фильтры</button>
   <button type="button" :disabled="busy||!contractId" @click="load">Обновить</button>
  </header>
  <div ref="filterPortal" class="cs-filter-layer"></div>
  <div class="contract-detail-table contract-compact-table cs-list" :aria-busy="busy">
   <table><caption class="sr-only">Сооружения договора. Нажмите на код ИССО для просмотра работ.</caption>
    <thead><tr><th>№</th><th v-for="column in structureFilterColumns" :key="column.key" class="cs-filter-heading"><ContractColumnFilter v-model="filters[column.key]" :label="column.label" :options="filterOptions[column.key]" :portal="filterPortal" :reset-key="filterResetKey"/></th></tr></thead>
    <tbody>
     <tr v-if="busy"><td colspan="8" role="status">Загрузка сооружений…</td></tr>
     <tr v-else-if="error"><td colspan="8" role="alert">{{ error }} <button type="button" @click="load">Повторить</button></td></tr>
     <tr v-else-if="!rows.length"><td colspan="8">{{ contractId?'К этому договору пока не привязаны сооружения.':'Сохраните договор, чтобы просмотреть связанные сооружения.' }}</td></tr>
     <tr v-else-if="!visibleRows.length"><td colspan="8">По заданным фильтрам сооружения не найдены. <button type="button" @click="clearFilters">Очистить фильтры</button></td></tr>
     <template v-else><tr v-for="(row,index) in visibleRows" :key="row.id" :class="{'is-selected':selectedId===row.id}" @click="selectedId=row.id">
      <td>{{ index+1 }}</td><td><button type="button" class="cs-code" :aria-pressed="selectedId===row.id" :aria-label="`Работы сооружения ${row.code}`" @click.stop="selectedId=row.id">{{ row.code }}</button></td>
      <td>{{ row.structureName }}</td><td><span class="contract-cell-ellipsis cs-road" :title="row.roadName">{{ row.roadName }}</span></td>
      <td>{{ row.location }}</td><td>{{ row.additionalId }}</td><td>{{ row.obstacleName }}</td><td>{{ row.district }}</td>
     </tr></template>
    </tbody>
   </table>
  </div>
  <section class="cs-work-panel" aria-label="Работы выбранного сооружения">
   <div class="cs-selected" aria-live="polite">
    <template v-if="selected"><p><strong>{{ selected.structureName||'Сооружение' }}</strong> · Код ИССО: <strong>{{ selected.code }}</strong> · {{ selected.location||'Место не указано' }}</p><p class="contract-cell-ellipsis cs-address" :title="[selected.roadName,selected.district].filter(Boolean).join(' · ')">{{ [selected.roadName,selected.district].filter(Boolean).join(' · ') }}</p></template>
    <p v-else>{{ busy?'Загрузка сооружений…':'Выберите сооружение в верхней таблице.' }}</p>
   </div>
   <header class="cs-work-heading"><h3>Работы по сооружению <small v-if="selected&&!worksBusy&&!worksError">· Всего: {{ works.length }}</small></h3><button type="button" :disabled="!selected||worksBusy" @click="loadWorks">Обновить работы</button></header>
   <WorkStatusLegend :unknown="hasUnknownStatus"/>
   <div class="contract-detail-table contract-compact-table cs-works" :aria-busy="worksBusy">
    <table><thead><tr><th class="odis-status-cell">Статус</th><th>№</th><th>Работа</th><th>Начало, план</th><th>Окончание, план</th><th>План, чел·ч</th><th>Исполнитель, план</th><th>Примечания</th></tr></thead>
     <tbody>
      <tr v-if="!selected"><td colspan="8">Выберите сооружение для просмотра работ.</td></tr>
      <tr v-else-if="worksBusy"><td colspan="8" role="status">Загрузка работ…</td></tr>
      <tr v-else-if="worksError"><td colspan="8" role="alert">{{ worksError }} <button type="button" @click="loadWorks">Повторить</button></td></tr>
      <tr v-else-if="!works.length"><td colspan="8">В этом договоре у выбранного сооружения пока нет сохранённых работ.</td></tr>
      <template v-else><tr v-for="(work,index) in works" :key="work.id" @dblclick="detail=work">
       <td class="odis-status-cell"><WorkStatusIcon :status="work.status"/></td><td>{{ index+1 }}</td><td><button type="button" class="cw-name contract-cell-ellipsis" :title="work.name" @click="detail=work">{{ work.name }}</button></td>
       <td>{{ date(work.planStart) }}</td><td>{{ date(work.planFinish) }}</td><td class="cs-hours">{{ work.planHours??'—' }}</td><td>{{ work.planExecutor||'—' }}</td><td><span class="contract-cell-ellipsis cs-note" :title="work.note">{{ work.note||'—' }}</span></td>
      </tr></template>
     </tbody>
    </table>
   </div>
  </section>
 </section>
 <UModal :open="!!detail" title="Работа по сооружению" :description="selected?`Код ИССО: ${selected.code}`:undefined" :ui="{content:'diagnostic-contract-modal cs-detail-modal w-[95vw] sm:max-w-xl',header:'cs-import-header',body:'cs-import-body',footer:'cs-import-footer'}" @update:open="value=>{if(!value)detail=null}">
  <template #body><div v-if="detail" class="cs-detail">
   <p>{{ state(detail.status) }}</p><h3>{{ detail.name }}</h3><p>Шифр: {{ detail.code }}</p>
   <p v-if="detail.planHours===null&&detail.hours!==null">Трудоёмкость назначения: {{ detail.hours }} чел·ч</p>
   <h4>Запланировано</h4><p>Исполнитель: <strong>{{ detail.planExecutor||'Не назначен' }}</strong></p>
   <dl><div><dt>Начало</dt><dd>{{ date(detail.planStart) }}</dd></div><div><dt>Окончание</dt><dd>{{ date(detail.planFinish) }}</dd></div><div><dt>Трудоёмкость, чел·ч</dt><dd>{{ detail.planHours??'—' }}</dd></div></dl>
   <h4>Фактически</h4><p>Исполнитель: <strong>{{ detail.factExecutor||'Не указан' }}</strong></p>
   <dl><div><dt>Начало</dt><dd>{{ date(detail.factStart) }}</dd></div><div><dt>Окончание</dt><dd>{{ date(detail.factFinish) }}</dd></div><div><dt>Трудоёмкость, чел·ч</dt><dd>{{ detail.factHours??'—' }}</dd></div></dl>
   <h4>Критерий приёмки</h4><p>{{ detail.criteria||'Не указан' }}</p><h4>Примечание</h4><p>{{ detail.note||'Не указано' }}</p>
   <template v-if="detail.warning"><h4>Предупреждение</h4><p>{{ detail.warning }}</p></template>
  </div></template>
  <template #footer><button type="button" @click="detail=null">Закрыть</button></template>
 </UModal>
</template>

<style>
.contract-structures-workspace{position:relative}
.cs-filter-layer{position:absolute;inset:0;z-index:30;pointer-events:none}
.cs-filter-count{display:inline-block;margin-left:10px;font-size:12px;font-weight:400;color:var(--contract-text,#253647)}
.contract-compact-table th.cs-filter-heading{vertical-align:top}

.cs-detail-modal .cs-import-header,.cs-detail-modal .cs-import-body,.cs-detail-modal .cs-import-footer{padding:16px 22px;box-sizing:border-box}
.cs-detail-modal .cs-import-body{display:block;overflow-y:auto;min-width:0}
.cs-detail-modal .cs-detail dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:10px}
.cs-detail-modal .cs-detail dt{font-size:12px}
.cs-detail-modal .cs-detail dd{margin:4px 0 0;padding:8px;border:1px solid #8093a655;border-radius:4px;overflow-wrap:anywhere}
@media(max-width:480px){.cs-detail-modal .cs-import-header,.cs-detail-modal .cs-import-body,.cs-detail-modal .cs-import-footer{padding-left:16px;padding-right:16px}.cs-detail-modal .cs-detail dl{grid-template-columns:1fr}}
</style>
