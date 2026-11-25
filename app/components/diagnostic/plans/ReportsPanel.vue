<script setup lang="ts">
import {ref,computed,onMounted,onBeforeUnmount} from 'vue';
import TripDateInput from '../trips/TripDateInput.vue';
import {tripToday} from '~~/shared/utils/diagnostic-trip-lifecycle';
import {tripDateLabel} from '~~/shared/utils/diagnostic-trips';
import {plansWeek} from '~~/shared/utils/diagnostic-plans-period';
import {calendarShortName} from '~~/shared/utils/diagnostic-calendar';
import {reportTypes,reportIntervals,reportCenters,reportWeek,reportPeriod,type ReportRoster} from '~~/shared/utils/diagnostic-reports';

const today=tripToday(),currentWeek=plansWeek(today);
const interval=ref<keyof typeof reportIntervals>('week'),kind=ref<keyof typeof reportTypes>('timesheet');
const day=ref(today),week=ref(reportWeek(today)),month=ref(today.slice(0,7));
const from=ref(currentWeek.from),to=ref(currentWeek.to);
const period=computed(()=>reportPeriod(interval.value,day.value,week.value,month.value,from.value,to.value));
const periodTitle=computed(()=>{
  const p=period.value;
  if(!p)return '';
  const label={day:'день',week:'неделю',month:'месяц',custom:'период'}[interval.value];
  return (kind.value==='planned'?'на ':'за ')+label+' · '+tripDateLabel(p.from)+(p.from!==p.to?' — '+tripDateLabel(p.to):'');
});
const columns=computed(()=>kind.value==='timesheet'?['№','Офис','ФИО','Итого, чел·ч']:
  ['№','Р/Ц','ФИО','№ договора','Код ИССО','Название работ',kind.value==='planned'?'Период (план)':'Период','Статус','Примечание']);

const roster=ref<ReportRoster>({employees:[],warning:null}),busy=ref(false),error=ref('');
const selection=ref<Set<number>|null>(null); // null includes every employee, even before the roster loads.
const groups=computed(()=>[...reportCenters,null].map(center=>({
  center,title:center??'Центр не определён',
  people:roster.value.employees.filter(p=>p.center===center).sort((a,b)=>a.name.localeCompare(b.name,'ru')||a.id-b.id)
})).filter(g=>g.center!==null||g.people.length));
const selectionLabel=computed(()=>{
  if(!selection.value)return 'Все сотрудники';
  if(selection.value.size===0)return 'Никто не выбран';
  if(selection.value.size===1)return roster.value.employees.find(p=>selection.value!.has(p.id))?.name||'Выбран 1 сотрудник';
  return 'Выбрано: '+selection.value.size;
});
function checked(id:number){return selection.value===null||selection.value.has(id);}
function changePeople(people:{id:number}[],enabled:boolean){
  const next=new Set(selection.value??roster.value.employees.map(p=>p.id));
  for(const {id} of people){if(enabled)next.add(id);else next.delete(id);}
  selection.value=next.size===roster.value.employees.length?null:next;
}
async function load(){
  busy.value=true;error.value='';
  try{roster.value=await $fetch<ReportRoster>('/api/diagnostic/reports/employees');}
  catch{error.value='Не удалось загрузить сотрудников ОДИС.';}
  finally{busy.value=false;}
}
const menu=ref<HTMLElement|null>(null),trigger=ref<HTMLButtonElement|null>(null),opened=ref(false);
function outside(e:PointerEvent){if(!menu.value?.contains(e.target as Node))opened.value=false;}
function escape(){opened.value=false;trigger.value?.focus();}
onMounted(()=>{void load();document.addEventListener('pointerdown',outside);});
onBeforeUnmount(()=>document.removeEventListener('pointerdown',outside));
</script>

<template>
 <section class="opr-content report-panel" aria-label="Отчёты ОДИС">
  <div class="report-parameters">
   <label>Интервал<select v-model="interval"><option v-for="(label,key) in reportIntervals" :key="key" :value="key">{{label}}</option></select></label>
   <label>Выберите отчёт<select v-model="kind"><option v-for="(label,key) in reportTypes" :key="key" :value="key">{{label}}</option></select></label>
   <div class="report-period">
    <label v-if="interval==='week'">Выберите неделю<input v-model="week" type="week" lang="ru" placeholder="2026-W48"/></label>
    <label v-else-if="interval==='month'">Выберите месяц<input v-model="month" type="month" lang="ru" placeholder="гггг-мм"/></label>
    <label v-else-if="interval==='day'">Выберите день<TripDateInput v-model="day" label="День отчёта"/></label>
    <template v-else><label>С<TripDateInput v-model="from" label="Начало интервала"/></label><label>По<TripDateInput v-model="to" label="Окончание интервала"/></label></template>
   </div>
   <div ref="menu" class="report-people" @keydown.esc.stop="escape" @focusout="e=>{if(e.relatedTarget && !menu?.contains(e.relatedTarget as Node))opened=false}">
    <span id="report-people-label">Сотрудники</span>
    <button id="report-people-choice" ref="trigger" type="button" class="opr-button" aria-labelledby="report-people-label report-people-choice" aria-controls="report-roster" :aria-expanded="opened" @click="opened=!opened"><span>{{selectionLabel}}</span><Icon name="lucide:chevron-down" aria-hidden="true"/></button>
    <div v-if="opened" id="report-roster" class="report-roster" role="group" aria-labelledby="report-people-label">
     <label><input type="checkbox" :checked="selection===null" :indeterminate="!!selection?.size" @change="selection=($event.target as HTMLInputElement).checked?null:new Set()"/>Все сотрудники</label>
     <p v-if="busy" role="status">Загрузка сотрудников…</p>
     <p v-else-if="error" role="alert">{{error}} <button class="opr-button" @click="load">Повторить</button></p>
     <template v-else>
      <p v-if="roster.warning" role="status">{{roster.warning}}</p>
      <div v-for="g in groups" :key="g.title" class="report-group" role="group" :aria-label="g.title">
       <label class="report-center"><input type="checkbox" :disabled="!g.people.length" :checked="!!g.people.length&&g.people.every(p=>checked(p.id))" :indeterminate="g.people.some(p=>checked(p.id))&&!g.people.every(p=>checked(p.id))" @change="changePeople(g.people,($event.target as HTMLInputElement).checked)"/>{{g.title}}</label>
       <label v-for="p in g.people" :key="p.id" class="report-person" :title="p.name"><input type="checkbox" :aria-label="p.name" :checked="checked(p.id)" @change="changePeople([p],($event.target as HTMLInputElement).checked)"/>{{calendarShortName(p.name)}}</label>
      </div>
     </template>
    </div>
   </div>
  </div>
  <p v-if="!period" role="alert" class="report-message">{{interval==='custom'?'Укажите обе даты. Начало интервала должно быть не позже окончания.':'Укажите корректный период.'}}</p>
  <div class="report-actions">
   <button type="button" class="opr-button" disabled>Сформировать</button>
   <button type="button" class="opr-button" disabled aria-label="Выгрузить в Excel" title="Выгрузить в Excel"><Icon name="lucide:file-spreadsheet"/>Excel</button>
  </div>
  <div class="report-table">
   <table><caption>{{reportTypes[kind]}} {{periodTitle}}</caption>
    <thead><tr><th v-for="col in columns" :key="col" scope="col">{{col}}</th></tr></thead>
    <tbody><tr><td :colspan="columns.length">Предпросмотр формы. Формирование отчёта и выгрузка в Excel будут доступны после подключения данных.</td></tr></tbody>
   </table>
  </div>
 </section>
</template>

<style scoped>
.report-panel{position:relative}
.report-parameters{display:grid;grid-template-columns:minmax(130px,.8fr) minmax(195px,1.45fr) minmax(210px,1.15fr) minmax(160px,1fr);align-items:end;gap:10px 14px;padding:12px 14px;background:var(--opr-panel);border-bottom:1px solid var(--opr-line);font-size:13px}
.report-parameters>label,.report-period>label,.report-people{display:grid;gap:4px;min-width:0}
.report-parameters select,.report-period>label>input,.report-people>button{width:100%;min-height:32px}
.report-period{display:flex;gap:6px}.report-period>label{flex:1}
.report-period :deep(.trip-date-text){width:100%;padding-right:29px}
.report-people{position:relative}
.report-people>button{justify-content:space-between;text-align:left}
.report-people>button span:first-child{overflow:hidden;text-overflow:ellipsis}
.report-roster{position:absolute;right:0;top:100%;z-index:5;width:min(310px,85vw);max-height:min(46dvh,360px);overflow:auto;background:var(--opr-field);border:1px solid var(--opr-line);border-radius:4px;box-shadow:0 4px 12px #142e4226;padding:4px}
.report-roster label{display:flex;align-items:center;gap:7px;padding:4px 7px;cursor:pointer}
.report-roster label:hover{background:var(--opr-selected)}.report-roster input{accent-color:var(--opr-accent)}
.report-group{border-top:1px solid var(--opr-line);padding:3px 0}.report-center{font-weight:600}.report-group .report-person{padding-left:26px}
.report-roster p,.report-message,.report-actions{padding:7px 12px}.report-message{color:var(--ui-error)}
.report-actions{display:flex;gap:8px;border-bottom:1px solid var(--opr-line);font-size:13px}
.report-table{min-height:0;overflow:auto;flex:1}
.report-table table{width:100%;border-collapse:collapse;font-size:13px}
.report-table caption{padding:9px 12px;background:var(--opr-panel);font-size:16px;font-weight:600;text-align:center}
.report-table th{border:1px solid var(--opr-line);padding:5px 8px;background:var(--opr-panel);white-space:nowrap;text-align:left}
.report-table td{padding:24px 12px;text-align:center;color:var(--opr-muted)}
@media (max-width:1150px){.report-parameters{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.report-parameters{grid-template-columns:minmax(0,1fr)}.report-roster{left:0;right:auto}}
</style>
