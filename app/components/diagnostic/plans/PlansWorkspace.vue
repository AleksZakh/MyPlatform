<script setup lang="ts">
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import WorkStatusIcon from '../contracts/WorkStatusIcon.vue';
import type {EmployeePlansResult,PlanWorkRow} from '~~/shared/types/diagnostic-plans';
import {calendarShortName} from '~~/shared/utils/diagnostic-calendar';
import {tripDateLabel} from '~~/shared/utils/diagnostic-trips';
import {diagnosticWorkStatus} from '~~/shared/utils/diagnostic-contract-table';
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
const tab=ref<'staff'|'external'>('staff');
const employee=ref('me'),search=ref(''),page=ref(1),data=ref<EmployeePlansResult|null>(null),busy=ref(false),error=ref('');
let generation=0,timer:ReturnType<typeof setTimeout>|undefined;
const pages=computed(()=>Math.max(1,Math.ceil((data.value?.total||0)/(data.value?.pageSize||200))));
async function load(){if(tab.value!=='staff')return;clearTimeout(timer);const g=++generation;busy.value=true;error.value='';try{const result=await $fetch<EmployeePlansResult>('/api/diagnostic/plans',{query:{employee:employee.value,search:search.value,page:page.value}});if(g===generation)data.value=result;}catch(e:any){if(g===generation)error.value=e?.data?.message||e?.message||'Не удалось загрузить работы.';}finally{if(g===generation)busy.value=false;}}
function schedule(delay=0){generation++;clearTimeout(timer);timer=setTimeout(()=>void load(),delay);}
watch(employee,()=>{page.value=1;schedule();});watch(search,()=>{page.value=1;schedule(250);});watch(page,()=>schedule());
watch(tab,()=>{generation++;clearTimeout(timer);busy.value=false;if(tab.value==='staff')void load();});
onMounted(load);onBeforeUnmount(()=>{generation++;clearTimeout(timer);});
const typeLabel=(kind:PlanWorkRow['kind'])=>({contract:'Договор',structure:'Сооружение',trip:'Командировка'}[kind]);
const period=(a:string|null,b:string|null)=>a||b?`${tripDateLabel(a)} — ${tripDateLabel(b)}`:'—';
const rowPeriod=(r:PlanWorkRow)=>period(r.planStart||r.planFinish?r.planStart:r.factStart,r.planStart||r.planFinish?r.planFinish:r.factFinish);
const periodTitle=(r:PlanWorkRow)=>`План: ${period(r.planStart,r.planFinish)}. Факт: ${period(r.factStart,r.factFinish)}`;
const hourTitle=(r:PlanWorkRow)=>`План: ${r.planHours??'—'} чел·ч; факт: ${r.factHours??'—'} чел·ч.${r.planShared||r.factShared?' Общие часы нескольких исполнителей.':''}${r.planEstimated?' План рассчитан: дни поездки × 8.':''}`;

const tabs=[{id:'staff',label:'Список работ'},{id:'external',label:'Работы внешних исполнителей'}] as const;
function moveTab(event:KeyboardEvent){tab.value=tab.value==='staff'?'external':'staff';(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`#odis-plans-tab-${tab.value}`)?.focus();}
</script>
<template>
 <section class="odis-plans">
  <DiagnosticModuleTabs active="plans"><label class="opr-search"><Icon name="lucide:search" aria-hidden="true"/><input v-model="search" type="search" placeholder="Работа, договор, ФИО, ИССО" aria-label="Поиск работ" :disabled="tab!=='staff'"/></label></DiagnosticModuleTabs>
  <header class="opr-title"><h1>Планы и отчёты</h1></header>
  <div class="opr-layout">
   <nav class="opr-sections" aria-label="Подразделы планов и отчётов">
    <button type="button" aria-current="page"><Icon name="lucide:calendar-days" aria-hidden="true"/>Планы</button>
    <button type="button" disabled title="Раздел будет доступен позже"><Icon name="lucide:file-chart-column" aria-hidden="true"/>Отчёты</button>
    <button type="button" disabled title="Раздел будет доступен позже"><Icon name="lucide:chart-no-axes-combined" aria-hidden="true"/>Ход работ</button>
   </nav>
   <div class="opr-content">
    <div class="opr-topline">
     <div class="opr-tabs" role="tablist" aria-label="Планы работ">
      <button v-for="item in tabs" :id="`odis-plans-tab-${item.id}`" :key="item.id" type="button" role="tab" :aria-selected="tab===item.id" aria-controls="odis-plans-panel" :tabindex="tab===item.id?0:-1" @click="tab=item.id" @keydown.right.prevent="moveTab" @keydown.left.prevent="moveTab">{{item.label}}</button>
     </div>
     <button class="opr-button opr-plan-button" type="button" disabled title="Планирование работ станет доступно на следующем этапе"><Icon name="lucide:calendar-plus" aria-hidden="true"/>Запланировать работы</button>
    </div>
    <div id="odis-plans-panel" class="opr-panel" role="tabpanel" :aria-labelledby="`odis-plans-tab-${tab}`" tabindex="0">
     <div class="opr-toolbar">
      <div class="opr-list-heading"><h2>{{tab==='staff'?'Перечень работ':'Работы внешних исполнителей'}}</h2><button class="opr-button opr-filter" type="button" disabled aria-label="Фильтры списка работ" title="Фильтры станут доступны после подключения списка планов"><Icon name="lucide:filter" aria-hidden="true"/></button></div>
      <label class="opr-employee"><span>{{tab==='staff'?'Сотрудник':'Исполнитель'}}</span><select v-if="tab==='staff'" v-model="employee" aria-label="Сотрудник"><option value="me">Мои работы{{data?.currentUser.name?' · '+calendarShortName(data.currentUser.name):''}}</option><option value="all">Все сотрудники</option><option v-for="person in data?.employees" :key="person.id" :value="String(person.id)">{{person.name}}</option></select><select v-else disabled aria-label="Внешний исполнитель"><option>Не выбран</option></select></label>
      <div class="opr-completion">
       <span>Факт. даты</span>
       <div class="opr-date"><input type="text" placeholder="дд.мм.гггг" aria-label="Фактическая дата начала" disabled/><Icon name="lucide:calendar-days" aria-hidden="true"/></div>
       <div class="opr-date"><input type="text" placeholder="дд.мм.гггг" aria-label="Фактическая дата окончания" disabled/><Icon name="lucide:calendar-days" aria-hidden="true"/></div>
       <label class="opr-hours">Затр. время, чел·ч<input type="text" inputmode="decimal" aria-label="Фактические человеко-часы" disabled/></label>
       <button class="opr-button" type="button" disabled title="Завершение работ станет доступно на следующем этапе"><Icon name="lucide:clipboard-check" aria-hidden="true"/>Завершить</button>
      </div>
     </div>
     <div v-if="tab==='staff'" class="opr-list-tools"><span>Все работы сотрудника, включая завершённые и без дат.</span><button class="opr-button" type="button" :disabled="busy" @click="load">Обновить</button></div>
     <p v-if="tab==='staff'&&data?.warning" class="opr-notice" role="status">{{data.warning}}</p>
     <p v-if="tab==='staff'&&error" class="opr-error" role="alert">{{error}} <button class="opr-button" @click="load">Повторить</button></p>
     <div class="opr-table-scroll" role="region" aria-label="Таблица планов" :aria-busy="busy" tabindex="0">
      <table>
       <caption class="opr-sr-only">{{tab==='staff'?'Планы сотрудников':'Планы внешних исполнителей'}}</caption>
       <colgroup><col class="opr-col-marker"/><col class="opr-col-person"/><col class="opr-col-contract"/><col class="opr-col-type"/><col class="opr-col-code"/><col class="opr-col-location"/><col class="opr-col-work"/><col class="opr-col-time"/><col class="opr-col-period"/><col class="opr-col-note"/><col class="opr-col-marker"/></colgroup>
       <thead><tr><th scope="col">Р/Ц</th><th scope="col">{{tab==='staff'?'ФИО':'Исполнитель'}}</th><th scope="col">№ договора</th><th scope="col">Тип</th><th scope="col">Код ИССО</th><th scope="col">км+м</th><th scope="col">Название работ</th><th scope="col" aria-label="Трудоёмкость, человеко-часы" title="Трудоёмкость, чел·ч"><Icon name="lucide:timer" aria-hidden="true"/></th><th scope="col">Срок выполнения</th><th scope="col">Примечания</th><th scope="col" aria-label="Отметка" title="Отметка"><svg class="opr-marker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="M12 8v5m0 3h.01"/></svg></th></tr></thead>
       <tbody>
        <tr v-if="tab==='external'"><td colspan="11" class="opr-empty"><p>Список внешних исполнителей пока недоступен.</p></td></tr>
        <tr v-else-if="busy"><td colspan="11" class="opr-empty" role="status">Загрузка работ…</td></tr>
        <tr v-else-if="error"><td colspan="11" class="opr-empty">Не удалось загрузить список работ.</td></tr>
        <template v-else>
         <tr v-for="row in data?.rows" :key="row.key" class="opr-work-row">
          <td class="opr-center">—</td><td :title="row.employeeName">{{calendarShortName(row.employeeName)}}</td><td>{{row.contractNumber}}</td><td>{{typeLabel(row.kind)}}</td><td>{{row.structureCode||'—'}}</td><td>{{row.location||'—'}}</td><td class="opr-work-name" :title="row.name">{{row.name}}</td>
          <td :title="hourTitle(row)">{{row.planHours===null&&row.factHours!==null?'Ф: ':''}}{{row.planHours??row.factHours??'—'}}{{row.planShared||row.planHours===null&&row.factShared?' *':row.planEstimated?' ≈':''}}</td>
          <td :title="periodTitle(row)">{{row.planStart||row.planFinish?'':row.factStart||row.factFinish?'Ф: ':''}}{{rowPeriod(row)}}</td><td class="opr-work-note" :title="row.note">{{row.note||'—'}}</td>
          <td class="opr-center" :title="diagnosticWorkStatus(row.status).title+(row.warning?' · '+row.warning:'')"><WorkStatusIcon :status="row.status"/><span v-if="row.warning" class="opr-data-warning" :title="row.warning" aria-label="Есть замечание к работе">!</span></td>
         </tr>
         <tr v-if="!data?.rows.length"><td colspan="11" class="opr-empty"><p>{{search?'По вашему запросу ничего не найдено.':'Для выбранного сотрудника работы не найдены.'}}</p></td></tr>
        </template>
       </tbody>
      </table>
     </div>
     <div v-if="tab==='staff'" class="opr-results"><span>Строк: {{error?0:data?.total??0}}</span><div><button class="opr-button" :disabled="busy||!!error||(data?.page??1)<=1" @click="page=(data?.page??1)-1">Назад</button><span>{{data?.page??1}} / {{pages}}</span><button class="opr-button" :disabled="busy||!!error||(data?.page??1)>=pages" @click="page=(data?.page??1)+1">Далее</button></div></div>
     <div v-if="tab==='staff'&&data&&!error" class="opr-list-notes"><p>* — общие часы; ≈ — расчётный план поездки; Ф — фактические данные. Подробности — при наведении на часы и срок.</p><p v-if="data.unresolvedWorks">В общем перечне есть работы с незаполненными или неоднозначными исполнителями: {{data.unresolvedWorks}}. Такие назначения требуют уточнения.</p><p v-if="data.unlinkedTravelWorks">Выездов без подтверждённой связи с командировкой: {{data.unlinkedTravelWorks}}. Они показаны отдельно.</p></div>
    </div>
   </div>
  </div>
 </section>
</template>
<style src="~/assets/css/diagnostic-plans.css"></style>
