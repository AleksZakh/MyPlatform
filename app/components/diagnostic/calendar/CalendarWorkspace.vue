<script setup lang="ts">
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import {onWorkChange} from '~/composables/diagnostic/workChanges';
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
import ContractEditor from '../contracts/ContractEditor.vue';
import WorkStatusIcon from '../contracts/WorkStatusIcon.vue';
import type {ContractRecord,DiagnosticCatalog} from '~~/shared/types/diagnostic-contracts';
import type {CalendarResult,CalendarRow,CalendarSort} from '~~/shared/types/diagnostic-calendar';
import {calendarShortName,calendarMonth} from '~~/shared/utils/diagnostic-calendar';
import {tripToday} from '~~/shared/utils/diagnostic-trip-lifecycle';
import {tripDateLabel} from '~~/shared/utils/diagnostic-trips';
import {diagnosticWorkStatus,workStatusLegend} from '~~/shared/utils/diagnostic-contract-table';
const month=ref(tripToday().slice(0,7)),employeeId=ref<number|null>(null),employeeQuery=ref(''),search=ref(''),status=ref(''),page=ref(1),sort=ref<CalendarSort>('employeeName'),descending=ref(false),data=ref<CalendarResult|null>(null),busy=ref(false),error=ref(''),selected=ref<string|null>(null),opening=ref(false);
const contract=ref<ContractRecord|null>(null),catalog=ref<DiagnosticCatalog|null>(null);let generation=0,contractGeneration=0,timer:ReturnType<typeof setTimeout>|undefined;
const monthLabel=computed(()=>{try{calendarMonth(month.value);return new Intl.DateTimeFormat('ru',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month.value+'-01T00:00:00Z'));}catch{return 'Выберите месяц';}});
const employees=computed(()=>(data.value?.employees||[]).filter(e=>e.name.toLocaleLowerCase('ru').includes(employeeQuery.value.trim().toLocaleLowerCase('ru'))));
const pages=computed(()=>Math.max(1,Math.ceil((data.value?.total||0)/(data.value?.pageSize||200))));
const typeLabel=(kind:CalendarRow['kind'])=>({contract:'Договор',structure:'Сооружение',trip:'Командировка'}[kind]);
const basicColumns:{key:CalendarSort;label:string}[]=[{key:'employeeName',label:'ФИО'},{key:'contractNumber',label:'№ договора'},{key:'kind',label:'Тип работ'},{key:'structureCode',label:'ИССО'},{key:'status',label:'Статус'},{key:'name',label:'Наименование работы'}];
const dateColumns:{key:CalendarSort;label:string}[]=[{key:'planStart',label:'Дата начала'},{key:'planHours',label:'Чел·ч'},{key:'planFinish',label:'Дата окончания'},{key:'factStart',label:'Дата начала'},{key:'factHours',label:'Чел·ч'},{key:'factFinish',label:'Дата окончания'}];
function setSort(key:CalendarSort){if(sort.value===key)descending.value=!descending.value;else{sort.value=key;descending.value=false;}}
async function load(){const g=++generation;busy.value=true;error.value='';selected.value=null;try{calendarMonth(month.value);const result=await $fetch<CalendarResult>('/api/diagnostic/calendar',{query:{month:month.value,...(employeeId.value!==null?{employeeId:employeeId.value}:{}),search:search.value,status:status.value,page:page.value,pageSize:200,sort:sort.value,descending:descending.value}});if(g===generation)data.value=result;}catch(e:any){if(g===generation){data.value=null;error.value=e?.data?.message||e.message||'Не удалось загрузить календарный план.';}}finally{if(g===generation)busy.value=false;}}
function moveMonth(step:number){const d=new Date(month.value+'-01T00:00:00Z');if(Number.isNaN(d.getTime()))return;d.setUTCMonth(d.getUTCMonth()+step);const next=d.toISOString().slice(0,7);try{calendarMonth(next);month.value=next;}catch{/* End of supported date range. */}}
watch([month,employeeId,status,sort,descending],()=>{page.value=1;generation++;clearTimeout(timer);timer=setTimeout(()=>void load(),0);});
watch(search,()=>{page.value=1;generation++;clearTimeout(timer);timer=setTimeout(()=>void load(),250);});
watch(page,()=>{generation++;clearTimeout(timer);timer=setTimeout(()=>void load(),0);});
onWorkChange(()=>void load());
const canEditWork=ref(false);
onMounted(async()=>{
 try{canEditWork.value=(await $fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.contracts',action:'UPDATE'}})).allowed;}catch{canEditWork.value=false;}
});
onMounted(load);onBeforeUnmount(()=>{generation++;contractGeneration++;clearTimeout(timer);});
const focusWork=ref<CalendarRow|null>(null);
async function openContract(row:CalendarRow,focus=false){if(busy.value)return;const g=++contractGeneration;opening.value=true;error.value='';selected.value=row.key;try{const [record,options]=await Promise.all([$fetch<ContractRecord>('/api/diagnostic/contracts/'+row.contractId),$fetch<DiagnosticCatalog>('/api/diagnostic/catalog')]);if(g!==contractGeneration)return;focusWork.value=focus?row:null;contract.value=record;catalog.value=options;}catch(e:any){if(g===contractGeneration)error.value=e?.data?.message||'Не удалось открыть договор. Возможно, он удалён или недоступен.';}finally{if(g===contractGeneration)opening.value=false;}}
function closeContract(){++contractGeneration;focusWork.value=null;contract.value=null;catalog.value=null;}
</script>
<template><section class="odis-calendar">
 <DiagnosticModuleTabs active="calendar"><input v-model="search" type="search" placeholder="Поиск работ, договоров, ИССО" aria-label="Поиск в календарном плане"/></DiagnosticModuleTabs>
 <header class="oc-title"><h1>Календарный план</h1><span v-if="opening" role="status">Открытие договора…</span><button :disabled="busy" @click="load">Обновить</button></header>
 <div class="oc-layout"><aside class="oc-employees" aria-label="Сотрудники группы ОДИС"><h2>Сотрудники</h2><input v-model="employeeQuery" type="search" placeholder="Найти сотрудника" aria-label="Найти сотрудника"/><button :aria-pressed="employeeId===null" @click="employeeId=null">Все сотрудники <small>{{data?.monthTotal??'—'}}</small></button><button v-for="e in employees" :key="e.id" :title="e.name" :aria-pressed="employeeId===e.id" @click="employeeId=e.id">{{calendarShortName(e.name)}}<small>{{e.count}}</small></button><p v-if="!employees.length&&!busy">Сотрудники не найдены.</p></aside>
 <main class="oc-main"><div class="oc-period"><button aria-label="Предыдущий месяц" @click="moveMonth(-1)">‹</button><strong>{{monthLabel}}</strong><button aria-label="Следующий месяц" @click="moveMonth(1)">›</button><label class="oc-month"><span>Месяц</span><input v-model="month" type="month" min="1900-01" max="2199-12"/></label><button @click="month=tripToday().slice(0,7)">Текущий месяц</button><label class="oc-state">Статус<select v-model="status"><option value="">Все</option><option v-for="s in workStatusLegend" :key="s.key" :value="s.key">{{s.label}}</option><option value="unknown">Не указан / неизвестен</option></select></label></div>
  <div class="oc-table-title"><h2>Перечень работ</h2><small>Дважды нажмите на строку, чтобы перейти к работе в договоре. Нажмите на номер, чтобы открыть договор.</small></div>
  <p v-if="error" class="oc-error" role="alert">{{error}} <button @click="load">Повторить</button></p><p v-if="data?.warning" class="oc-warning" role="status">{{data.warning}}</p>
  <div class="oc-table-scroll" :aria-busy="busy"><table><thead><tr><th v-for="c in basicColumns" :key="c.key" rowspan="2" scope="col" :aria-sort="sort===c.key?(descending?'descending':'ascending'):'none'"><button @click="setSort(c.key)">{{c.label}}<span v-if="sort===c.key">{{descending?' ↓':' ↑'}}</span></button></th><th colspan="3" scope="colgroup">План</th><th colspan="3" scope="colgroup">Факт</th></tr><tr><th v-for="c in dateColumns" :key="c.key" scope="col" :aria-sort="sort===c.key?(descending?'descending':'ascending'):'none'"><button @click="setSort(c.key)">{{c.label}}<span v-if="sort===c.key">{{descending?' ↓':' ↑'}}</span></button></th></tr></thead><tbody>
   <tr v-if="busy"><td colspan="12">Загрузка календарного плана…</td></tr><template v-else><tr v-for="r in data?.rows" :key="r.key" :class="{'is-selected':selected===r.key}" @click="selected=r.key" tabindex="0" @keydown.enter.self.prevent="openContract(r,true)" @dblclick="openContract(r,true)"><td :title="r.employeeName">{{calendarShortName(r.employeeName)}}</td><td><button class="oc-contract-link" :disabled="opening" @click.stop="openContract(r)" @dblclick.stop>{{r.contractNumber}}</button></td><td>{{typeLabel(r.kind)}}</td><td>{{r.structureCode||'—'}}</td><td><span class="oc-status"><WorkStatusIcon :status="r.status"/>{{diagnosticWorkStatus(r.status).title}}</span></td><td class="oc-work-name" :title="r.name">{{r.name}}</td><td>{{tripDateLabel(r.planStart)}}</td><td :title="r.planShared?'Общие часы работы для нескольких исполнителей; индивидуальная доля не задана.':r.planEstimated?'Расчётный план: календарные дни поездки × 8 часов на участника.':''">{{r.planHours??'—'}}{{r.planShared?' *':r.planEstimated?' ≈':''}}</td><td>{{tripDateLabel(r.planFinish)}}</td><td>{{tripDateLabel(r.factStart)}}</td><td :title="r.factShared?'Общие часы работы для нескольких исполнителей; индивидуальная доля не задана.':''">{{r.factHours??'—'}}{{r.factShared?' *':''}}</td><td>{{tripDateLabel(r.factFinish)}}</td></tr><tr v-if="!data?.rows.length"><td colspan="12">{{error?'Данные не загружены.':'Работ за выбранный период по заданным условиям нет.'}}</td></tr></template>
  </tbody></table></div>
  <footer class="oc-summary"><span>Строк: {{data?.total??0}} · За месяц: {{data?.monthTotal??0}}</span><div><button :disabled="busy||(data?.page??1)<=1" @click="page=(data?.page??1)-1">Назад</button><span>{{data?.page??1}} / {{pages}}</span><button :disabled="busy||(data?.page??1)>=pages" @click="page=(data?.page??1)+1">Далее</button></div></footer>
  <p class="oc-hint">Показаны работы, пересекающие месяц по плану или факту. ≈ — расчётный план поездки; * — общие часы работы, индивидуальная доля не определена.</p>
  <p v-if="data?.unresolvedWorks" class="oc-warning">Работ с незаполненным или неоднозначным исполнителем: {{data.unresolvedWorks}}. Неопределённые назначения не включены в персональные строки.</p>
  <p v-if="data?.unlinkedTravelWorks" class="oc-warning">Работ по выездам без связи с командировкой: {{data.unlinkedTravelWorks}}. Они показаны отдельно; для исключения возможных исторических дублей требуется сопоставление.</p>
 </main></div>
 <ContractEditor v-if="contract&&catalog" :contract="contract" :catalog="catalog" read-only :can-create="false" :can-edit="false" :can-edit-works="canEditWork" :focus-work="focusWork" @close="closeContract"/>
</section></template>
<style src="~/assets/css/diagnostic-calendar.css"></style>
<style src="~/assets/css/diagnostic-contracts.css"></style>
