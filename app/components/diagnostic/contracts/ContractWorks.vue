<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import type {DraftWork} from '~~/shared/types/diagnostic-templates';
import type {ContractWorkRecord} from '~~/shared/types/diagnostic-contract-works';
import {vRevealWorkRow} from './revealWorkRow';
import WorkCard from './WorkCard.vue';
import {onWorkChange} from '~/composables/diagnostic/workChanges';
import WorkStatusIcon from './WorkStatusIcon.vue';
import WorkStatusLegend from './WorkStatusLegend.vue';
import {diagnosticWorkStatus} from '~~/shared/utils/diagnostic-contract-table';
const props=defineProps<{contractId:number|null;draft?:DraftWork[];removed?:ReadonlyMap<number,number>;editMode?:boolean;canRemove?:boolean;saving?:boolean;contractNumber:string;focusId?:number;canEdit:boolean;employees:{id:number;name:string}[]}>();
const highlight=ref(props.focusId);
const focusNotice=ref('');
const emit=defineEmits<{count:[number];catalogIds:[number[]];remove:[ContractWorkRecord];removeDraft:[number]}>();
const rows=ref<ContractWorkRecord[]>([]),busy=ref(false),error=ref('');
const visible=computed(()=>rows.value.filter(w=>!props.removed?.has(w.id)));
const pending=computed(()=>{
 const existing=new Set(rows.value.map(w=>w.workId));
 return (props.draft??[]).filter(w=>!existing.has(w.id));
});
const actions=computed(()=>props.editMode&&(props.canRemove||pending.value.length>0));
const selected=ref<ContractWorkRecord|null>(null);
let generation=0;
const date=(s:string|null)=>s?s.split('-').reverse().join('.'):'—';
const hasUnknownStatus=computed(()=>visible.value.some(row=>diagnosticWorkStatus(row.status).key==='unknown'));
async function load(){
 const current=++generation,id=props.contractId;
 rows.value=[];selected.value=null;error.value='';busy.value=false;
 
 if(!id){emit('count',0);return;}
 busy.value=true;
 try{const data=await $fetch<ContractWorkRecord[]>('/api/diagnostic/contracts/'+id+'/works');if(current===generation){rows.value=data;emit('catalogIds',data.flatMap(w=>w.workId?[w.workId]:[]));focusNotice.value=props.focusId&&!data.some(r=>r.id===props.focusId)?'Выбранная в календаре работа больше недоступна.':'';emit('count',data.length);}}
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
  <p v-if="focusNotice" role="status">{{focusNotice}}</p>
  <div class="contract-detail-table contract-compact-table cw-scroll" :aria-busy="busy">
   <table><thead><tr><th rowspan="2" class="odis-status-cell">Статус</th><th rowspan="2">№</th><th rowspan="2">Работа</th><th colspan="4">План</th><th colspan="4">Факт</th><th rowspan="2">Примечания</th><th v-if="actions" rowspan="2">Действия</th></tr><tr><template v-for="group in ['plan','fact']" :key="group"><th>Дата начала</th><th>Чел·ч</th><th>Дата окончания</th><th>Исполнитель</th></template></tr></thead>
    <tbody>
     <tr v-if="busy"><td :colspan="actions?13:12" role="status">Загрузка работ…</td></tr>
     <tr v-else-if="error"><td :colspan="actions?13:12" role="alert">{{ error }} <button type="button" @click="load">Повторить</button></td></tr>
     <tr v-else-if="!visible.length&&!pending.length"><td :colspan="actions?13:12">{{ contractId?'Работы к этому договору пока не добавлены.':'Работы с договором пока не добавлены.' }}</td></tr>
     <template v-else><tr v-for="(row,index) in visible" :key="row.id" tabindex="-1" v-reveal-work-row="highlight===row.id?'focus':false" :class="{'odis-work-highlight':highlight===row.id}" @click="highlight=row.id" @keydown.enter.self.prevent="selected=row" @dblclick="selected=row">
      <td class="odis-status-cell"><WorkStatusIcon :status="row.status"/></td><td>{{ index+1 }}</td>
      <td><button type="button" class="cw-name contract-cell-ellipsis" :title="row.name" @click="selected=row">{{ row.name }}</button></td>
      <td>{{ date(row.planStart) }}</td><td>{{ row.planHours??'—' }}</td><td>{{ date(row.planFinish) }}</td><td>{{ row.planExecutor||'—' }}</td>
      <td>{{ date(row.factStart) }}</td><td>{{ row.factHours??'—' }}</td><td>{{ date(row.factFinish) }}</td><td>{{ row.factExecutor||'—' }}</td>
      <td><span class="contract-cell-ellipsis cw-note" :title="row.note">{{ row.note }}</span></td>
      <td v-if="actions"><button v-if="canRemove" type="button" class="odis-remove-row" :disabled="saving||row.tripManaged" :aria-label="'Удалить работу '+row.name" :title="row.tripManaged?'Работа связана с командировкой':'Удалить работу из договора'" @click.stop="emit('remove',row)" @dblclick.stop><Icon name="lucide:trash-2"/></button></td>
     </tr>
     <tr v-for="(work,index) in pending" :key="'draft-'+work.id"><td><WorkStatusIcon status="unplanned"/></td><td>{{visible.length+index+1}}</td><td>{{work.name}}</td><td colspan="8">Добавляется при сохранении</td><td>{{work.note||'—'}}</td>
      <td v-if="actions"><button type="button" class="odis-remove-row" :disabled="saving" :aria-label="'Убрать работу '+work.name" title="Убрать из добавляемых" @click="emit('removeDraft',work.id)"><Icon name="lucide:trash-2"/></button></td></tr></template>
    </tbody>
   </table>
  </div>
  <small v-if="!busy&&!error">Работ: {{ visible.length+pending.length }}</small>
  <WorkCard v-if="selected && contractId" :row="selected" kind="contract" :contract-id="contractId"
   :contract-number="contractNumber" :employees="employees" :can-edit="canEdit" @close="closeDetail" @saved="reloadAfterSave" />
 </section>
</template>
<style>
.cw-name{text-align:left;text-decoration:underline;text-underline-offset:3px}
.cw-note{max-width:420px;overflow:hidden;text-overflow:ellipsis}
.contract-works tbody tr:hover{background:var(--contract-panel)}
</style>
