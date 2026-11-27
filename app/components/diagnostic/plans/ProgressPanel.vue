<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue';
import WorklogTripReview from './WorklogTripReview.vue';
const reconcileContract=ref(0);
import WorklogImport from './WorklogImport.vue';
const importing=ref(false);
import ProgressFilter from './ProgressFilter.vue';
import {workStatusLegend} from '~~/shared/utils/diagnostic-contract-table';
import {reportCenters,centerColors} from '~~/shared/utils/diagnostic-reports';
type Contract={id:number;number:string};
type Link={id:number;contractId:number;structure:{code:string;location:string;structureName:string;roadName:string}};
const contracts=ref<Contract[]>([]),links=ref<Link[]>([]);
const contractIds=ref<string[]>([]),structureIds=ref<string[]>([]),statuses=ref<string[]>([]),centers=ref<string[]>([]);
const contractError=ref(false),linkError=ref(false),loadingContracts=ref(true),loadingLinks=ref(false),retry=ref(0);
const numbers=computed(()=>new Map(contracts.value.map(c=>[c.id,c.number])));
const contractOptions=computed(()=>contracts.value.map(c=>({id:String(c.id),label:c.number})));
const structureOptions=computed(()=>links.value.map(({id,contractId,structure:s})=>({
 id:String(id),label:[s.location,s.code,s.structureName,s.roadName,contractIds.value.length>1?numbers.value.get(contractId):''].filter(Boolean).join(' · ')
})));
const statusOptions=workStatusLegend.map(s=>({id:s.key,label:s.title}));
const centerOptions=reportCenters.map(c=>({id:c,label:c}));
const legend=[...reportCenters.map(c=>({name:c,color:centerColors[c]})),
 {name:'Без расчёта ГП',color:'#a6d9fa'},{name:'Исп. старый',color:'#d3e99c'},
 {name:'Субподряд',color:'#ded8ca'},{name:'Помечен на удаление',color:'#f1b6bd'}];
async function loadContracts(){
 loadingContracts.value=true;contractError.value=false;
 try{contracts.value=await $fetch<Contract[]>('/api/diagnostic/progress/filters');}
 catch{contractError.value=true;}
 finally{loadingContracts.value=false;}
}
watch([contractIds,retry],async ([ids],_,cleanup)=>{
 const controller=new AbortController();
 cleanup(()=>controller.abort());
 links.value=[];loadingLinks.value=ids.length>0;linkError.value=false;
 if(!ids.length){structureIds.value=[];return;}
 try{
  const items=await $fetch<Link[]>('/api/diagnostic/progress/filters',{query:{contracts:ids.join(',')},signal:controller.signal});
  if(controller.signal.aborted)return;
  links.value=items;
  const available=new Set(items.map(l=>String(l.id)));
  structureIds.value=structureIds.value.filter(id=>available.has(id));
 }catch{if(!controller.signal.aborted)linkError.value=true;}
 finally{if(!controller.signal.aborted)loadingLinks.value=false;}
});
onMounted(loadContracts);
</script>
<template>
 <section class="opr-content progress" aria-labelledby="progress-title">
  <h2 id="progress-title">Ход выполнения работ</h2>
  <div class="toolbar">
   <ProgressFilter v-model="contractIds" label="Договор" :options="contractOptions" :disabled="loadingContracts||contractError" :placeholder="loadingContracts?'Загрузка…':'Выберите договор'"/>
   <ProgressFilter v-model="structureIds" label="Сооружения" :options="structureOptions" :disabled="!contractIds.length||loadingLinks||linkError" :placeholder="loadingLinks?'Загрузка…':!contractIds.length?'Выберите договор':links.length?'Все сооружения':'Нет сооружений'"/>
   <ProgressFilter v-model="statuses" label="Статус работ" :options="statusOptions"/>
   <ProgressFilter v-model="centers" label="Рег. центр" :options="centerOptions"/>
   <div class="actions"><button type="button" class="opr-button" :disabled="contractIds.length!==1" title="Выберите один договор для сверки" @click="reconcileContract=Number(contractIds[0])">Сверка командировок</button><button type="button" class="opr-button" @click="importing=true"><Icon name="lucide:file-up"/>Импорт Excel</button><button class="opr-button" type="button" disabled><Icon name="lucide:table-2"/>Сформировать</button><button class="opr-button" type="button" disabled><Icon name="lucide:download"/>Загрузить</button></div>
  </div>
  <p v-if="contractError||linkError" class="load-error" role="alert">{{contractError?'Не удалось загрузить договоры.':'Не удалось загрузить сооружения.'}} <button type="button" class="opr-button" @click="contractError?loadContracts():retry++">Повторить</button></p>
  <div class="legend" aria-label="Легенда"><strong>Легенда</strong><span v-for="l in legend" :key="l.name" :style="{'--label-color':l.color}">{{l.name}}</span></div>
  <div class="matrix">
   <p>Формирование и загрузка отчёта будут доступны после подключения расчёта.</p>
  </div>
 <WorklogTripReview v-if="reconcileContract" :contract-id="reconcileContract" @close="reconcileContract=0"/>
 <WorklogImport v-if="importing" :initial-contract="contractIds.length===1?Number(contractIds[0]):undefined" @close="importing=false" @imported="loadContracts" @reconcile="id=>{importing=false;reconcileContract=id}"/>
 </section>
</template>
<style scoped>
.progress h2{font-size:19px;font-weight:600;text-align:center;background:var(--opr-panel);padding:8px 12px;border-bottom:1px solid var(--opr-line)}
.toolbar{display:grid;grid-template-columns:minmax(150px,1.3fr) minmax(145px,1.2fr) minmax(135px,1fr) minmax(115px,.8fr) auto;gap:8px 12px;align-items:end;background:var(--opr-panel);padding:10px 12px;border-bottom:1px solid var(--opr-line)}
.actions,.legend{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px}.actions{justify-content:flex-end}.legend{padding:8px 12px;border-bottom:1px solid var(--opr-line)}.legend strong{font-size:12px;margin-right:3px}.legend span{border-radius:3px;padding:2px 8px;font-size:12px;color:#243447;background:var(--label-color)}:global(html.dark .odis-plans .progress .legend span){color:#f4f8fc;background:color-mix(in srgb,var(--label-color) 28%,#1a2936)}
.matrix{min-width:0;overflow:auto;flex:1}.matrix p{position:sticky;left:0;text-align:center;color:var(--opr-muted);padding:24px 12px;font-size:13px}.load-error{padding:6px 12px}
@media(max-width:1150px){.toolbar{grid-template-columns:repeat(4,minmax(0,1fr))}.actions{grid-column:1/-1}}
@media(max-width:750px){.toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:500px){.toolbar{grid-template-columns:minmax(0,1fr)}}
</style>
