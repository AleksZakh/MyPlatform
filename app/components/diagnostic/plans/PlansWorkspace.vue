<script setup lang="ts">
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import TripDateInput from '../trips/TripDateInput.vue';
import {plansWeek,parsePlansPeriod,type PlansPeriodMode} from '~~/shared/utils/diagnostic-plans-period';
import {onWorkChange} from '~/composables/diagnostic/workChanges';
import PlanEditor from './PlanEditor.vue';
import WorkStatusIcon from '../contracts/WorkStatusIcon.vue';
import WorkStatusLegend from '../contracts/WorkStatusLegend.vue';
import {regionalCenterCode} from '~~/shared/utils/diagnostic-regional-center';
import type {EmployeePlansResult,PlanWorkRow} from '~~/shared/types/diagnostic-plans';
import {calendarShortName} from '~~/shared/utils/diagnostic-calendar';
import {tripDateLabel} from '~~/shared/utils/diagnostic-trips';
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
const auditing=ref(false);
const planning=ref(false),canPlan=ref(false),planNotice=ref('');
onMounted(async()=>{try{canPlan.value=(await $fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.contracts',action:'CREATE'}})).allowed;}catch{canPlan.value=false;}});
function planSaved(person:number){
 planning.value=false;planNotice.value='Работы сохранены в плане.';
 if(employee.value==='all'||employee.value===String(person)||employee.value==='me'&&data.value?.currentUser.id===person)refresh();
 else employee.value=String(person);
}
const tab=ref<'staff'|'external'>('staff');
const week=plansWeek(),filtersOpen=ref(false),periodMode=ref<PlansPeriodMode>('worklist'),dateFrom=ref(week.from),dateTo=ref(week.to),draftMode=ref<PlansPeriodMode>('worklist'),draftFrom=ref(week.from),draftTo=ref(week.to),filterError=ref('');
const filterTitle=computed(()=>periodMode.value==='worklist'?'Текущая неделя, будущие и незакрытые работы':periodMode.value==='all'?'Все даты':`${tripDateLabel(dateFrom.value)} — ${tripDateLabel(dateTo.value)}`);
function applyPeriod(){try{parsePlansPeriod({periodMode:draftMode.value,from:draftFrom.value,to:draftTo.value});}catch(e){filterError.value=(e as Error).message;return;}filterError.value='';periodMode.value=draftMode.value;dateFrom.value=draftFrom.value;dateTo.value=draftTo.value;refresh();}
function resetPeriod(){const w=plansWeek();draftMode.value='worklist';draftFrom.value=w.from;draftTo.value=w.to;applyPeriod();}
const centerTitle=(r:PlanWorkRow)=>[r.regionalCenter,({database:'Подразделение учётной записи Space',ad:'Подразделение из AD',missing:'Подразделение не указано',unavailable:'Не удалось получить подразделение из AD'}[r.regionalCenterSource])].filter(Boolean).join(' · ');
const employee=ref('me'),search=ref(''),page=ref(1),data=ref<EmployeePlansResult|null>(null),busy=ref(false),error=ref('');
let generation=0,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined;
const cursors=ref<(string|null)[]>([null]);
const pages=computed(()=>Math.max(1,Math.ceil((data.value?.total||0)/(data.value?.pageSize||200))));
const summaryReady=computed(()=>!busy.value&&!error.value&&!!data.value);
const summaryTitle=computed(()=>{const h=data.value?.hoursSummary;if(!h)return 'Итог ещё не загружен';return ['Количество и сумма часов по всем отобранным строкам, включая другие страницы. В сумме используется план; если плановых часов нет — факт.',h.missing?`Без указанных часов: ${h.missing}. Сумма неполная.`:'',h.shared?`Строк с общими часами нескольких исполнителей: ${h.shared}. Эти значения не разделены между участниками.`:'',h.estimated?`Строк с расчётными часами поездок: ${h.estimated}.`:'',h.factOnly?`Строк с фактом вместо плана: ${h.factOnly}.`:''].filter(Boolean).join(' ');});
const summaryHours=computed(()=>{const h=data.value?.hoursSummary;return h?h.hours.replace('.',',')+(h.missing||h.shared?' *':h.estimated?' ≈':''):'—';});
function cancelCurrent(){generation++;controller?.abort();clearTimeout(timer);}
function pause(signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const abort=()=>{clearTimeout(t);reject(new Error('Отменено'));};const t=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},1000);signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});}
async function load(){
 if(tab.value!=='staff')return;cancelCurrent();const g=generation,c=new AbortController();controller=c;busy.value=true;error.value='';
 const query={...(auditing.value?{audit:"1"}:{}),employee:employee.value,search:search.value,page:page.value,periodMode:periodMode.value,...(periodMode.value==='period'?{from:dateFrom.value,to:dateTo.value}:{}),...(cursors.value[page.value-1]?{cursor:cursors.value[page.value-1]}:{})};
 try{let result:EmployeePlansResult|undefined;for(let attempt=0;attempt<16;attempt++){try{result=await $fetch<EmployeePlansResult>('/api/diagnostic/plans',{query,signal:c.signal,retry:0});break;}catch(e:any){if(c.signal.aborted)throw e;if(e?.data?.data?.code!=='PLANS_BUSY'||attempt===15)throw e;await pause(c.signal);}}
  if(g!==generation)return;
  if(!result || !Array.isArray(result.rows) || !Array.isArray(result.employees)
      || !Number.isSafeInteger(result.total) || result.total<result.rows.length
      || (query.page===1 && result.total>0 && !result.rows.length)
      || result.selection!==query.employee)throw Error('Сервер вернул некорректный ответ при загрузке списка работ.');
  data.value=result;cursors.value[page.value]=result.nextCursor;cursors.value.length=page.value+1;
 }catch(e:any){if(g===generation&&!c.signal.aborted)error.value=e?.data?.message||e?.message||'Не удалось загрузить работы.';}
 finally{if(g===generation)busy.value=false;}
}
function schedule(delay=150){cancelCurrent();busy.value=true;error.value='';timer=setTimeout(()=>void load(),delay);}
function resetPage(){cursors.value=[null];page.value=1;}
function refresh(){resetPage();void load();}
function nextPage(){if(!data.value?.nextCursor||busy.value)return;cursors.value[page.value]=data.value.nextCursor;page.value++;void load();}
function previousPage(){if(page.value<=1||busy.value)return;page.value--;void load();}
watch(employee,()=>{resetPage();schedule();});watch(search,()=>{resetPage();schedule(300);});
watch(tab,()=>{cancelCurrent();busy.value=false;if(tab.value==='staff')refresh();});
onWorkChange(refresh);
onMounted(load);onBeforeUnmount(cancelCurrent);
const period=(a:string|null,b:string|null)=>a||b?`${tripDateLabel(a)} — ${tripDateLabel(b)}`:'—';
const rowPeriod=(r:PlanWorkRow)=>period(r.planStart||r.planFinish?r.planStart:r.factStart,r.planStart||r.planFinish?r.planFinish:r.factFinish);
const periodTitle=(r:PlanWorkRow)=>`План: ${period(r.planStart,r.planFinish)}. Факт: ${period(r.factStart,r.factFinish)}`;
const hourTitle=(r:PlanWorkRow)=>`План: ${r.planHours??'—'} чел·ч; факт: ${r.factHours??'—'} чел·ч.${r.planShared||r.factShared?' Общие часы нескольких исполнителей.':''}${r.planEstimated?' План рассчитан: дни поездки × 8.':''}`;

const tabs=[{id:'staff',label:'Список работ'},{id:'external',label:'Работы внешних исполнителей'}] as const;
function moveTab(event:KeyboardEvent){tab.value=tab.value==='staff'?'external':'staff';(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`#odis-plans-tab-${tab.value}`)?.focus();}
</script>
<template>
 <section class="odis-plans">
  <PlanEditor v-if="planning" @close="planning=false" @saved="planSaved"/><p v-if="planNotice" role="status">{{planNotice}}</p>
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
     <button class="opr-button opr-plan-button" type="button" :disabled="!canPlan||tab!=='staff'" @click="planNotice='';planning=true"><Icon name="lucide:calendar-plus" aria-hidden="true"/>Запланировать работы</button>
    </div>
    <div id="odis-plans-panel" class="opr-panel" role="tabpanel" :aria-labelledby="`odis-plans-tab-${tab}`" tabindex="0">
     <div class="opr-toolbar">
      <div class="opr-list-heading"><h2>{{tab==='staff'?'Перечень работ':'Работы внешних исполнителей'}}<span v-if="tab==='staff'" class="opr-totals" :title="summaryTitle" aria-live="polite"><span aria-label="Всего работ">({{summaryReady?data?.total:'—'}})</span><span aria-label="Всего человеко-часов">({{summaryReady?summaryHours:'—'}} чел·ч)</span></span></h2><button class="opr-button opr-filter" type="button" :disabled="tab!=='staff'" aria-label="Фильтры списка работ" :title="filterTitle" :aria-expanded="filtersOpen" aria-controls="odis-plans-date-filters" @click="filtersOpen=!filtersOpen"><Icon name="lucide:filter" aria-hidden="true"/></button><button v-if="tab==='staff'" class="opr-button opr-refresh" type="button" :disabled="busy" @click="refresh">Обновить</button><WorkStatusLegend v-if="tab==='staff'" class="opr-status-legend" :unknown="data?.rows.some(r=>r.status==='unknown')"/></div>
      <label class="opr-employee"><span>{{tab==='staff'?'Сотрудник':'Исполнитель'}}</span><select v-if="tab==='staff'" v-model="employee" aria-label="Сотрудник" :title="data?.warning||''"><option value="me">Мои работы{{data?.currentUser.name?' · '+calendarShortName(data.currentUser.name):''}}</option><option value="all">Все сотрудники</option><option v-for="person in data?.employees" :key="person.id" :value="String(person.id)">{{person.name}}</option></select><select v-else disabled aria-label="Внешний исполнитель"><option>Не выбран</option></select></label>
      <div class="opr-completion">
       <span>Факт. даты</span>
       <div class="opr-date"><input type="text" placeholder="дд.мм.гггг" aria-label="Фактическая дата начала" disabled/><Icon name="lucide:calendar-days" aria-hidden="true"/></div>
       <div class="opr-date"><input type="text" placeholder="дд.мм.гггг" aria-label="Фактическая дата окончания" disabled/><Icon name="lucide:calendar-days" aria-hidden="true"/></div>
       <label class="opr-hours">Затр. время, чел·ч<input type="text" inputmode="decimal" aria-label="Фактические человеко-часы" disabled/></label>
       <button class="opr-button" type="button" disabled title="Завершение работ станет доступно на следующем этапе"><Icon name="lucide:clipboard-check" aria-hidden="true"/>Завершить</button>
      </div>
     </div>
     <form v-if="tab==='staff'&&filtersOpen" id="odis-plans-date-filters" class="opr-date-filters" @submit.prevent="applyPeriod">
      <label>Период<select v-model="draftMode" aria-label="Режим периода"><option value="worklist">Текущая неделя, будущие и незакрытые</option><option value="period">Выбранный период</option><option value="all">Все даты</option></select></label>
      <label v-if="draftMode==='period'">С<TripDateInput v-model="draftFrom" label="Начало периода"/></label><label v-if="draftMode==='period'">По<TripDateInput v-model="draftTo" label="Конец периода"/></label>
      <button class="opr-button" type="submit">Применить</button><button class="opr-button" type="button" @click="resetPeriod">По умолчанию</button>
      <span class="opr-period-explanation">{{draftMode==='worklist'?'Неделя — с понедельника по воскресенье. Незакрытые работы без дат также включены.':draftMode==='period'?'Все статусы. Пересечение выбранного периода с датами плана или факта.':'Все сохранённые назначения независимо от дат и статуса.'}}</span>
      <label><span>Диагностика выборки</span><input v-model="auditing" type="checkbox" @change="refresh"/></label>
      <p v-if="filterError" class="opr-filter-error" role="alert">{{filterError}}</p>
     </form>
     <section v-if="tab==='staff' && auditing && summaryReady && data?.audit" class="opr-audit" aria-label="Проверка выборки">
      <strong>{{ !data.audit.eligible ? 'Выборка остановлена при проверке состава ОДИС' : data.audit.sources.reduce((n,s)=>n+s.accepted,0)===data.total ? 'Сумма по источникам совпадает с итогом списка' : 'Расхождение между источниками и итогом списка' }}</strong>
      <p>Первая колонка счётчиков показывает записи после условий БД. Следующие колонки показывают назначения сотрудникам. Одна запись может дать несколько назначений.</p>
      <table><thead><tr><th>Источник и условия БД</th><th>Из БД</th><th>По исполнителю</th><th>После поиска</th><th>После периода</th></tr></thead>
      <tbody><tr v-for="s in data.audit.sources" :key="s.model"><td><details><summary>{{ s.table }}</summary><pre>{{ s.where }}</pre></details></td><td>{{ s.read }}</td><td>{{ s.assigned }}</td><td>{{ s.searched }}</td><td><meter min="0" :max="Math.max(1,s.assigned)" :value="s.accepted"></meter> {{ s.accepted }}</td></tr></tbody></table>
      <p v-for="c in data.audit.controls" :key="c.start">ДСиР-2025-478 · АИС ИССО-Н. Внесение данных · {{tripDateLabel(c.start)}} — {{tripDateLabel(c.finish)}} · 2 ч. <b>{{c.accepted===1?'Найдена':c.accepted>1?'Найдено несколько совпадений':c.searched?'Исключена периодом':c.assigned?'Исключена поиском':'Совпадений среди назначений нет'}}</b></p>
      <details><summary>Применённые параметры</summary><pre>{{ JSON.stringify({employee:data.selection,search,period:data.period},null,2) }}</pre></details>
     </section>
     <p v-if="tab==='staff'&&error" class="opr-error" role="alert">{{error}} <button class="opr-button" @click="load">Повторить</button></p>
     <div class="opr-table-scroll" role="region" aria-label="Таблица планов" :aria-busy="busy" tabindex="0">
      <table>
       <caption class="opr-sr-only">{{tab==='staff'?'Планы сотрудников':'Планы внешних исполнителей'}}</caption>
       <colgroup><col class="opr-col-status"/><col class="opr-col-regional"/><col class="opr-col-person"/><col class="opr-col-contract"/><col class="opr-col-type"/><col class="opr-col-code"/><col class="opr-col-location"/><col class="opr-col-work"/><col class="opr-col-time"/><col class="opr-col-period"/><col class="opr-col-note"/><col class="opr-col-marker"/></colgroup>
       <thead><tr><th scope="col" class="opr-center">Статус</th><th scope="col">Р/Ц</th><th scope="col">{{tab==='staff'?'ФИО':'Исполнитель'}}</th><th scope="col">№ договора</th><th scope="col">Тип</th><th scope="col">Код ИССО</th><th scope="col">км+м</th><th scope="col">Название работ</th><th scope="col" aria-label="Трудоёмкость, человеко-часы" title="Трудоёмкость, чел·ч"><Icon name="lucide:timer" aria-hidden="true"/></th><th scope="col">Срок выполнения</th><th scope="col">Примечания</th><th scope="col" aria-label="Отметка" title="Отметка"><svg class="opr-marker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="M12 8v5m0 3h.01"/></svg></th></tr></thead>
       <tbody>
        <tr v-if="tab==='external'"><td colspan="12" class="opr-empty"><p>Список внешних исполнителей пока недоступен.</p></td></tr>
        <tr v-else-if="busy"><td colspan="12" class="opr-empty" role="status">Загрузка работ…</td></tr>
        <tr v-else-if="error"><td colspan="12" class="opr-empty">Не удалось загрузить список работ.</td></tr>
        <template v-else>
         <tr v-for="row in data?.rows" :key="row.key" class="opr-work-row">
          <td class="opr-center"><WorkStatusIcon :status="row.status"/></td><td :title="centerTitle(row)">{{regionalCenterCode(row.regionalCenter)}}</td><td :title="row.employeeName">{{calendarShortName(row.employeeName)}}</td><td>{{row.contractNumber}}</td><td>{{row.documentType}}</td><td>{{row.structureCode||'—'}}</td><td>{{row.location||'—'}}</td><td class="opr-work-name" :title="row.name">{{row.name}}</td>
          <td :title="hourTitle(row)">{{row.planHours===null&&row.factHours!==null?'Ф: ':''}}{{row.planHours??row.factHours??'—'}}{{row.planShared||row.planHours===null&&row.factShared?' *':row.planEstimated?' ≈':''}}</td>
          <td :title="periodTitle(row)">{{row.planStart||row.planFinish?'':row.factStart||row.factFinish?'Ф: ':''}}{{rowPeriod(row)}}</td><td class="opr-work-note" :title="row.note">{{row.note||'—'}}</td>
          <td class="opr-center"><span v-if="row.warning" class="opr-data-warning" :title="row.warning" aria-label="Есть замечание к работе">!</span><span v-else>—</span></td>
         </tr>
         <tr v-if="data && !data.rows.length"><td colspan="12" class="opr-empty"><p>{{search?'По вашему запросу ничего не найдено.':'Для выбранного сотрудника работы не найдены.'}}</p></td></tr>
        </template>
       </tbody>
      </table>
     </div>
     <div v-if="tab==='staff'" class="opr-results"><span>Строк: {{summaryReady?data?.total:'—'}}</span><div><button class="opr-button" :disabled="busy||!!error||(data?.page??1)<=1" @click="previousPage">Назад</button><span>{{page}} / {{pages}}</span><button class="opr-button" :disabled="busy||!!error||!data?.nextCursor" @click="nextPage">Далее</button></div></div>
     <div v-if="tab==='staff'&&data&&!error" class="opr-list-notes"><p>* — общие часы; ≈ — расчётный план поездки; Ф — фактические данные. Подробности — при наведении на часы и срок.</p><p v-if="data.unresolvedWorks">В общем перечне есть работы с незаполненными или неоднозначными исполнителями: {{data.unresolvedWorks}}. Такие назначения требуют уточнения.</p><p v-if="data.unlinkedTravelWorks">Выездов без подтверждённой связи с командировкой: {{data.unlinkedTravelWorks}}. Они показаны отдельно.</p></div>
    </div>
   </div>
  </div>
 </section>
</template>
<style src="~/assets/css/diagnostic-plans.css"></style>

<style scoped>
.opr-audit{padding:8px 12px;max-height:32vh;overflow:auto;background:var(--opr-panel);color:var(--opr-text);flex:none}
.opr-audit table{border-collapse:collapse}.opr-audit th,.opr-audit td{padding:3px 10px;text-align:left;border:1px solid var(--opr-line)}
.opr-audit summary{cursor:pointer}.opr-audit meter{width:64px}.opr-audit p{margin:4px 0}
</style>
