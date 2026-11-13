<script setup lang="ts">
import {ref,watch,onBeforeUnmount} from 'vue';
import type {ContractWorkRecord} from '~~/shared/types/diagnostic-contract-works';
const props=defineProps<{contractId:number|null}>();
const emit=defineEmits<{count:[number]}>();
const rows=ref<ContractWorkRecord[]>([]),busy=ref(false),error=ref('');
const selected=ref<ContractWorkRecord|null>(null);
let generation=0;
const date=(s:string|null)=>s?s.split('-').reverse().join('.'):'—';
const statusLabels:Record<string,string>={completed:'Выполнена',unplanned:'Не запланирована',planned:'Запланирована',in_progress:'В работе',active:'В работе'};
const state=(s:string)=>statusLabels[s]||s||'Не указан';
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
onBeforeUnmount(()=>generation++);
</script>
<template>
 <section class="contract-works">
  <header class="contract-section-head"><h2>Перечень работ с договором</h2><button type="button" :disabled="busy||!contractId" @click="load">Обновить</button></header>
  <p class="cw-help">Двойной щелчок по строке или нажатие на название — просмотр работы.</p>
  <div class="contract-detail-table contract-compact-table cw-scroll" :aria-busy="busy">
   <table><thead><tr><th rowspan="2">Статус</th><th rowspan="2">№</th><th rowspan="2">Шифр</th><th rowspan="2">Работа</th><th colspan="4">План</th><th colspan="4">Факт</th><th rowspan="2">Примечания</th></tr><tr><template v-for="group in ['plan','fact']" :key="group"><th>Дата начала</th><th>Чел·ч</th><th>Дата окончания</th><th>Исполнитель</th></template></tr></thead>
    <tbody>
     <tr v-if="busy"><td colspan="13" role="status">Загрузка работ…</td></tr>
     <tr v-else-if="error"><td colspan="13" role="alert">{{ error }} <button type="button" @click="load">Повторить</button></td></tr>
     <tr v-else-if="!rows.length"><td colspan="13">{{ contractId?'Работы к этому договору пока не добавлены.':'Сначала сохраните договор.' }}</td></tr>
     <template v-else><tr v-for="(row,index) in rows" :key="row.id" @dblclick="selected=row">
      <td><span :class="['cw-status',{'cw-done':row.status==='completed'}]">{{ state(row.status) }}</span></td><td>{{ index+1 }}</td><td>{{ row.code }}</td>
      <td><button type="button" class="cw-name contract-cell-ellipsis" :title="row.name" @click="selected=row">{{ row.name }}</button></td>
      <td>{{ date(row.planStart) }}</td><td>{{ row.planHours??'—' }}</td><td>{{ date(row.planFinish) }}</td><td>{{ row.planExecutor||'—' }}</td>
      <td>{{ date(row.factStart) }}</td><td>{{ row.factHours??'—' }}</td><td>{{ date(row.factFinish) }}</td><td>{{ row.factExecutor||'—' }}</td>
      <td><span class="contract-cell-ellipsis cw-note" :title="row.note">{{ row.note }}</span></td>
     </tr></template>
    </tbody>
   </table>
  </div>
  <small v-if="!busy&&!error">Работ: {{ rows.length }}</small>
  <UModal :open="!!selected" title="Работа с договором" :ui="{content:'cw-detail-modal w-[95vw] sm:max-w-xl',header:'cw-detail-header',body:'cw-detail-body',footer:'cw-detail-footer'}" @update:open="value=>{if(!value)selected=null}">
   <template #body><div v-if="selected" class="cw-detail">
    <span :class="['cw-status',{'cw-done':selected.status==='completed'}]">{{ state(selected.status) }}</span>
    <h3>{{ selected.name }}</h3><small>Шифр: {{ selected.code }}</small>
    <p class="cw-description">{{ selected.note||'Примечание не указано.' }}</p>
    <h4>Запланировано</h4><p>Исполнитель: <strong>{{ selected.planExecutor||'Не назначен' }}</strong></p>
    <dl><div><dt>Начало</dt><dd>{{ date(selected.planStart) }}</dd></div><div><dt>Окончание</dt><dd>{{ date(selected.planFinish) }}</dd></div><div><dt>Трудоёмкость, чел·ч</dt><dd>{{ selected.planHours??'—' }}</dd></div></dl>
    <h4>Фактически</h4><p>Исполнитель: <strong>{{ selected.factExecutor||'Не указан' }}</strong></p>
    <dl><div><dt>Начало</dt><dd>{{ date(selected.factStart) }}</dd></div><div><dt>Окончание</dt><dd>{{ date(selected.factFinish) }}</dd></div><div><dt>Трудоёмкость, чел·ч</dt><dd>{{ selected.factHours??'—' }}</dd></div></dl>
    <h4>Критерий приёмки</h4><p class="cw-description">{{ selected.criteria||'Не указан' }}</p>
   </div></template>
   <template #footer><button type="button" class="cw-close" @click="selected=null">Закрыть</button><small>Режим просмотра</small></template>
  </UModal>
 </section>
</template>
<style>
.cw-help{font-size:12px;color:var(--contract-muted);margin:6px 0}.cw-name{text-align:left;text-decoration:underline;text-underline-offset:3px}.cw-note{max-width:420px;overflow:hidden;text-overflow:ellipsis}.cw-status{display:inline-block;font-size:12px;color:#175b99;background:#e7f1fd;padding:3px 7px;border-radius:4px}.cw-done{color:#166534;background:#dcfce7}.dark .cw-status{color:#bfdbfe;background:#1e3a5f}.dark .cw-done{color:#bbf7d0;background:#14532d}.cw-detail-modal{background:#f7f9fc;color:#23374d}.dark .cw-detail-modal{background:var(--contract-bg,#253542);color:var(--contract-text,#e2e8f0)}.cw-detail h3{font-size:20px;font-weight:600;margin:10px 0 4px}.cw-detail h4{font-weight:600;margin:18px 0 8px;border-bottom:1px solid #8093a655;padding-bottom:5px}.cw-description{white-space:pre-wrap;overflow-wrap:anywhere;margin:12px 0}.cw-detail dl{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}.cw-detail dt{font-size:12px}.cw-detail dd{padding:8px;border:1px solid #8093a655;border-radius:4px;margin-top:4px}.cw-close{padding:7px 14px;border:1px solid #8093a6;border-radius:4px}.contract-works tbody tr:hover{background:var(--contract-panel)}
</style>
<style>
/* Local slot classes override the shared modal body p-2/sm:p-0 settings. */
.cw-detail-modal .cw-detail-header,
.cw-detail-modal .cw-detail-body,
.cw-detail-modal .cw-detail-footer{padding-left:22px;padding-right:22px;box-sizing:border-box}
.cw-detail-modal .cw-detail-header,
.cw-detail-modal .cw-detail-footer{padding-top:14px;padding-bottom:14px}
.cw-detail-modal .cw-detail-body{display:block;padding-top:16px;padding-bottom:16px;min-width:0;overflow-y:auto}
.cw-detail-modal .cw-detail-footer{gap:12px;flex-wrap:wrap}
.cw-detail{width:100%;min-width:0;overflow-wrap:anywhere}
.cw-detail dd{margin-left:0;overflow-wrap:anywhere}
@media(max-width:480px){
 .cw-detail-modal .cw-detail-header,
 .cw-detail-modal .cw-detail-body,
 .cw-detail-modal .cw-detail-footer{padding-left:16px;padding-right:16px}
 .cw-detail dl{grid-template-columns:1fr}
}
</style>
