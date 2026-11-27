<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue';
import WorklogTripReview from './WorklogTripReview.vue';
const reconcileContract=ref(0);
import WorklogImport from './WorklogImport.vue';
const importing=ref(false);
import ProgressFilter from './ProgressFilter.vue';
import {workStatusLegend} from '~~/shared/utils/diagnostic-contract-table';
import ProgressGrid from './ProgressGrid.vue';
import {onWorkChange,publishWorkChange} from '~/composables/diagnostic/workChanges';
import type {ProgressReport} from '~~/shared/utils/diagnostic-progress';
import {reportCenters} from '~~/shared/utils/diagnostic-reports';
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
const statusOptions:{id:string;label:string}[]=workStatusLegend.map(s=>({id:s.key,label:s.title}));
const centerOptions=reportCenters.map(c=>({id:c,label:c}));
statusOptions.push({id:'unknown',label:'Статус не указан'});
const report=shallowRef<ProgressReport|null>(null), editing=ref(false), busy=ref(false), changed=ref(false);
const notice=ref(''),problem=ref(''),generatedFor=ref(''),contractEdit=ref(false),structureEdit=ref(false);
const filters=computed(()=>({contracts:contractIds.value.map(Number),links:structureIds.value.map(Number),statuses:statuses.value,centers:centers.value}));
const inactive=computed(()=>changed.value||generatedFor.value!==JSON.stringify(filters.value));
const headers={'x-space-diagnostic':'1'};
async function generate(){
 if(busy.value||editing.value||!contractIds.value.length)return;
 const snapshot=JSON.stringify(filters.value);
 busy.value=true;problem.value='';notice.value='';
 try{
   const result=await $fetch<ProgressReport>('/api/diagnostic/progress/filters',{query:{action:'generate'},method:'POST',headers,body:JSON.parse(snapshot)});
   report.value=result;generatedFor.value=snapshot;changed.value=false;
 }catch(e:any){changed.value=true;problem.value=e?.data?.message||'Не удалось сформировать отчёт.';}
 finally{busy.value=false;}
}
async function saved(id:number){
 publishWorkChange([id]);await generate();if(!problem.value)notice.value='Изменения сохранены.';
}
async function download(){
 if(!report.value||inactive.value||busy.value||editing.value)return;
 busy.value=true;problem.value='';notice.value='';
 try{
   const res=await fetch('/api/diagnostic/progress/filters?action=export',{method:'POST',headers:{...headers,'Content-Type':'application/json'},
     body:JSON.stringify({filters:filters.value,token:report.value.token})});
   if(!res.ok){if(res.status===409)changed.value=true;throw Error((await res.json()).message||'Не удалось сохранить Excel.');}
   const url=URL.createObjectURL(await res.blob()),a=document.createElement('a');a.href=url;
   const name=res.headers.get('Content-Disposition')?.split("UTF-8''")[1];
   a.download=name?decodeURIComponent(name):'Ход работ.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
   notice.value='Копия Excel сохранена в файловом хранилище ОДИС, в папке Reports.';
 }catch(e:any){problem.value=e.message||'Не удалось сохранить Excel.';}finally{busy.value=false;}
}
function imported(){void loadContracts();retry.value++;changed.value=true;}
onWorkChange(()=>{if(report.value)changed.value=true;});
onMounted(async()=>{
 const check=(key:string)=>$fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.'+key,action:'UPDATE'}}).then(r=>r.allowed,()=>false);
 [contractEdit.value,structureEdit.value]=await Promise.all([check('contracts'),check('structures')]);
});
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
  <fieldset class="toolbar" :disabled="busy||editing">
   <ProgressFilter v-model="contractIds" label="Договор" :options="contractOptions" :disabled="loadingContracts||contractError" :placeholder="loadingContracts?'Загрузка…':'Выберите договор'"/>
   <ProgressFilter v-model="structureIds" label="Сооружения" :options="structureOptions" :disabled="!contractIds.length||loadingLinks||linkError" :placeholder="loadingLinks?'Загрузка…':!contractIds.length?'Выберите договор':links.length?'Все сооружения':'Нет сооружений'"/>
   <ProgressFilter v-model="statuses" label="Статус работ" :options="statusOptions"/>
   <ProgressFilter v-model="centers" label="Рег. центр" :options="centerOptions"/>
   <div class="actions"><button type="button" class="opr-button" :disabled="contractIds.length!==1" title="Выберите один договор для сверки" @click="reconcileContract=Number(contractIds[0])">Сверка командировок</button><button type="button" class="opr-button" @click="importing=true"><Icon name="lucide:file-up"/>Импорт Excel</button><button class="opr-button" type="button" :disabled="!contractIds.length||loadingLinks||linkError" @click="generate"><Icon name="lucide:table-2"/>Сформировать</button><button class="opr-button" type="button" :disabled="!report||inactive" @click="download"><Icon name="lucide:download"/>Сохранить в Excel</button></div>
  </fieldset>
  <p v-if="contractError||linkError" class="load-error" role="alert">{{contractError?'Не удалось загрузить договоры.':'Не удалось загрузить сооружения.'}} <button type="button" class="opr-button" @click="contractError?loadContracts():retry++">Повторить</button></p>
  <p v-if="problem" class="load-error" role="alert">{{problem}}</p>
  <p v-if="busy||notice||report?.warning" class="load-error" role="status">{{busy?'Подождите…':notice}} {{report?.warning}}</p>
  <p v-if="report&&inactive" class="load-error" role="status">Параметры или данные изменились. Сформируйте отчёт заново.</p>
  <ProgressGrid v-if="report" :class="{inactive}" :report="report" :inactive="inactive||busy" :contract-edit="contractEdit" :structure-edit="structureEdit"
    @editing="v=>editing=v" @saved="saved" @review="id=>reconcileContract=id"/>
  <div v-else class="matrix"><p>Выберите договор и нажмите «Сформировать».</p></div>
 <WorklogTripReview v-if="reconcileContract" :contract-id="reconcileContract" @close="reconcileContract=0;changed=true"/>
 <WorklogImport v-if="importing" :initial-contract="contractIds.length===1?Number(contractIds[0]):undefined" @close="importing=false" @imported="imported" @reconcile="id=>{importing=false;reconcileContract=id}"/>
 </section>
</template>
<style scoped>
.progress h2{font-size:19px;font-weight:600;text-align:center;background:var(--opr-panel);padding:8px 12px;border-bottom:1px solid var(--opr-line)}
.toolbar{display:grid;grid-template-columns:minmax(150px,1.3fr) minmax(145px,1.2fr) minmax(135px,1fr) minmax(115px,.8fr) auto;gap:8px 12px;align-items:end;background:var(--opr-panel);padding:10px 12px;border-bottom:1px solid var(--opr-line)}
.inactive{opacity:.62}.toolbar{min-width:0}.actions{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:13px;justify-content:flex-end}
.matrix{min-width:0;overflow:auto;flex:1}.matrix p{position:sticky;left:0;text-align:center;color:var(--opr-muted);padding:24px 12px;font-size:13px}.load-error{padding:6px 12px}
@media(max-width:1150px){.toolbar{grid-template-columns:repeat(4,minmax(0,1fr))}.actions{grid-column:1/-1}}
@media(max-width:750px){.toolbar{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:500px){.toolbar{grid-template-columns:minmax(0,1fr)}}
</style>
