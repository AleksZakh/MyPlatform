<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import type {ContractWorkRecord} from '~~/shared/types/diagnostic-contract-works';
import WorkCard from './WorkCard.vue';
import {onWorkChange} from '~/composables/diagnostic/workChanges';
import WorkStatusIcon from './WorkStatusIcon.vue';
import WorkStatusLegend from './WorkStatusLegend.vue';
import {diagnosticWorkStatus} from '~~/shared/utils/diagnostic-contract-table';
const props=defineProps<{contractId:number|null;contractNumber:string;canEdit:boolean;employees:{id:number;name:string}[]}>();
const emit=defineEmits<{count:[number]}>();
const rows=ref<ContractWorkRecord[]>([]),busy=ref(false),error=ref('');
const selected=ref<ContractWorkRecord|null>(null);
let generation=0;
const date=(s:string|null)=>s?s.split('-').reverse().join('.'):'—';
const hasUnknownStatus=computed(()=>rows.value.some(row=>diagnosticWorkStatus(row.status).key==='unknown'));
async function load(){
 const current=++generation,id=props.contractId;
 rows.value=[];selected.value=null;error.value='';busy.value=false;
 
 if(!id){emit('count',0);return;}
 busy.value=true;
 try{const data=await $fetch<ContractWorkRecord[]>('/api/diagnostic/contracts/'+id+'/works');if(current===generation){rows.value=data;emit('count',data.length);}}
 catch(e:any){if(current===generation)error.value=e?.data?.message||'Не удалось загрузить работы.';}
 finally{if(current===generation)busy.value=false;}
}
watch(()=>props.contractId,()=>void load(),{immediate:true});
// Keep an open draft intact. Its version is checked at save time.
let refreshAfterClose=false;
onWorkChange(()=>{
 if (selected.value) refreshAfterClose=true;
 else void load();
});
function closeDetail() {
 selected.value=null;
 if (refreshAfterClose) reloadAfterSave();
}
function reloadAfterSave() {
 refreshAfterClose=false;
 void load();
}
onBeforeUnmount(()=>generation++);
</script>
<template>
 <section class="contract-works">
  <header class="contract-section-head"><h2 title="Двойной щелчок по строке или нажатие на название — просмотр работы.">Перечень работ с договором</h2><div class="odis-work-heading-tools"><WorkStatusLegend :unknown="hasUnknownStatus"/><button type="button" :disabled="busy||!contractId" @click="load">Обновить</button></div></header>
  <div class="contract-detail-table contract-compact-table cw-scroll" :aria-busy="busy">
   <table><thead><tr><th rowspan="2" class="odis-status-cell">Статус</th><th rowspan="2">№</th><th rowspan="2">Работа</th><th colspan="4">План</th><th colspan="4">Факт</th><th rowspan="2">Примечания</th></tr><tr><template v-for="group in ['plan','fact']" :key="group"><th>Дата начала</th><th>Чел·ч</th><th>Дата окончания</th><th>Исполнитель</th></template></tr></thead>
    <tbody>
     <tr v-if="busy"><td colspan="12" role="status">Загрузка работ…</td></tr>
     <tr v-else-if="error"><td colspan="12" role="alert">{{ error }} <button type="button" @click="load">Повторить</button></td></tr>
     <tr v-else-if="!rows.length"><td colspan="12">{{ contractId?'Работы к этому договору пока не добавлены.':'Сначала сохраните договор.' }}</td></tr>
     <template v-else><tr v-for="(row,index) in rows" :key="row.id" @dblclick="selected=row">
      <td class="odis-status-cell"><WorkStatusIcon :status="row.status"/></td><td>{{ index+1 }}</td>
      <td><button type="button" class="cw-name contract-cell-ellipsis" :title="row.name" @click="selected=row">{{ row.name }}</button></td>
      <td>{{ date(row.planStart) }}</td><td>{{ row.planHours??'—' }}</td><td>{{ date(row.planFinish) }}</td><td>{{ row.planExecutor||'—' }}</td>
      <td>{{ date(row.factStart) }}</td><td>{{ row.factHours??'—' }}</td><td>{{ date(row.factFinish) }}</td><td>{{ row.factExecutor||'—' }}</td>
      <td><span class="contract-cell-ellipsis cw-note" :title="row.note">{{ row.note }}</span></td>
     </tr></template>
    </tbody>
   </table>
  </div>
  <small v-if="!busy&&!error">Работ: {{ rows.length }}</small>
  <WorkCard v-if="selected && contractId" :row="selected" kind="contract" :contract-id="contractId"
   :contract-number="contractNumber" :employees="employees" :can-edit="canEdit" @close="closeDetail" @saved="reloadAfterSave" />
 </section>
</template>
<style>
.cw-name{text-align:left;text-decoration:underline;text-underline-offset:3px}
.cw-note{max-width:420px;overflow:hidden;text-overflow:ellipsis}
.contract-works tbody tr:hover{background:var(--contract-panel)}
</style>
