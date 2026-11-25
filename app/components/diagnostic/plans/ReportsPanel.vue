<script setup lang="ts">
import {ref,shallowRef,computed,watch,onMounted,onBeforeUnmount} from 'vue';
import ReportMailDialog from './ReportMailDialog.vue';
import TripDateInput from '../trips/TripDateInput.vue';
import {tripToday} from '~~/shared/utils/diagnostic-trip-lifecycle';
import {plansWeek} from '~~/shared/utils/diagnostic-plans-period';
import {calendarShortName} from '~~/shared/utils/diagnostic-calendar';
import {reportTypes,reportIntervals,reportCenters,reportWeek,reportPeriod,centerColors,type ReportRoster,type SavedReport,type ReportInfo,type ReportParams} from '~~/shared/utils/diagnostic-reports';

const today=tripToday(),currentWeek=plansWeek(today);
const interval=ref<keyof typeof reportIntervals>('week'),kind=ref<keyof typeof reportTypes>('timesheet');
const day=ref(today),week=ref(reportWeek(today)),month=ref(today.slice(0,7));
const from=ref(currentWeek.from),to=ref(currentWeek.to);
const period=computed(()=>reportPeriod(interval.value,day.value,week.value,month.value,from.value,to.value));
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
const {user}=useUserSession();
const report=shallowRef<SavedReport|null>(null),archives=ref<ReportInfo[]>([]);
const historyId=ref(''),running=ref(false),stale=ref(false),notice=ref(''),historyError=ref(false);
const skipPrompt=ref(false),showMail=ref(false),mailReport=shallowRef<SavedReport|null>(null);
const prefKey=computed(()=>'space.odis.reports.skip-mail.'+String(user.value?.id??''));
const page=ref(1),pageSize=120;
const pages=computed(()=>Math.ceil((report.value?.lines.length??0)/pageSize));
const visible=computed(()=>{
  const rows=(report.value?.lines??[]).slice((page.value-1)*pageSize,page.value*pageSize);
  const spans:number[]=Array(rows.length).fill(0);
  for(let i=0;i<rows.length;){let j=i+1;while(j<rows.length&&rows[j]!.group===rows[i]!.group)j++;spans[i]=j-i;i=j;}
  return rows.map((row,i)=>({row,span:spans[i]!}));
});
const grouped=computed(()=>!report.value||report.value.params.kind==='timesheet'?0:report.value.params.kind==='external'?2:3);
const params=computed<ReportParams|null>(()=>period.value?{kind:kind.value,interval:interval.value,...period.value,employeeIds:selection.value?[...selection.value].sort((a,b)=>a-b):null}:null);
let revision=0,restoring=false;
watch([interval,day,week,month,from,to,selection,kind],(now,old)=>{
  if(restoring)return;
  revision++;showMail.value=false;notice.value='';
  if(now[7]!==old[7]){report.value=null;historyId.value='';stale.value=false;}
  else if(report.value){stale.value=true;historyId.value='';}
},{flush:'sync'});
async function loadHistory(){
  try{archives.value=await $fetch<ReportInfo[]>('/api/diagnostic/reports');historyError.value=false;}
  catch{historyError.value=true;}
}
async function generate(){
  if(!params.value||params.value.employeeIds?.length===0||running.value)return;
  const at=revision;running.value=true;notice.value='';
  try{
    const saved=await $fetch<SavedReport>('/api/diagnostic/reports',{method:'POST',retry:0,headers:{'x-space-diagnostic':'1'},body:params.value});
    const {id,title,params:savedParams,createdAt}=saved;
    archives.value=[{id,title,params:savedParams,createdAt},...archives.value.filter(item=>item.id!==saved.id)];
    if(at===revision){report.value=saved;historyId.value=saved.id;stale.value=false;page.value=1;}
  }catch(e:any){if(at===revision)notice.value=e.data?.message||'Не удалось сформировать и сохранить отчёт.';}
  finally{running.value=false;}
}
async function openHistory(id:string){
  if(!id||running.value)return;
  const at=revision;running.value=true;notice.value='';
  try{
    const saved=await $fetch<SavedReport>('/api/diagnostic/reports/'+id);
    if(at!==revision)return;
    restoring=true;
    const p=saved.params;kind.value=p.kind;interval.value=p.interval;
    day.value=p.from;week.value=reportWeek(p.from);month.value=p.from.slice(0,7);from.value=p.from;to.value=p.to;
    selection.value=p.employeeIds?new Set(p.employeeIds):null;
    report.value=saved;stale.value=false;historyId.value=id;page.value=1;
  }catch(e:any){notice.value=e.data?.message||'Не удалось открыть архивную копию.';historyId.value=report.value?.id||'';}
  finally{restoring=false;running.value=false;}
}
function save(){
  if(!report.value||stale.value)return;
  const link=document.createElement('a');link.href='/api/diagnostic/reports/'+report.value.id+'/download';link.download='';link.click();
  if(!skipPrompt.value)openMail();
}
function openMail(){if(report.value&&!stale.value){mailReport.value=report.value;showMail.value=true;}}
function closeMail(remember:boolean,sent:boolean){
  skipPrompt.value=remember;
  if(sent)notice.value='Почтовый сервер принял отчёт для выбранных получателей.';
  if(user.value?.id){try{if(remember)localStorage.setItem(prefKey.value,'1');else localStorage.removeItem(prefKey.value);}catch{}}
  showMail.value=false;
}
onMounted(()=>{
  try{skipPrompt.value=localStorage.getItem(prefKey.value)==='1';}catch{}
  void loadHistory();
});
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
   <label>История отчётов<select :value="historyId" :disabled="running||!archives.length" @change="openHistory(($event.target as HTMLSelectElement).value)">
    <option value="" disabled>{{archives.length?'Выберите отчёт':'Сохранённых отчётов нет'}}</option>
    <option v-for="item in archives" :key="item.id" :value="item.id">{{new Date(item.createdAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'})}} · {{item.title}}</option>
   </select></label>
  </div>
  <p v-if="!period" role="alert" class="report-message">{{interval==='custom'?'Укажите обе даты. Начало интервала должно быть не позже окончания.':'Укажите корректный период.'}}</p>
  <div class="report-actions">
   <button type="button" class="opr-button" :disabled="running||!params||selection?.size===0" @click="generate">{{running?'Загрузка…':'Сформировать'}}</button>
   <button type="button" class="opr-button" :disabled="!report||stale||running" title="Сохранить отчёт в Excel" @click="save"><Icon name="lucide:file-spreadsheet"/>Сохранить отчёт</button>
   <button v-if="skipPrompt&&report" class="opr-button" :disabled="stale||running" @click="openMail">Отправить на почту</button>
   <span v-if="stale"  role="status">Параметры изменены. Сформируйте отчёт заново.</span>
   <span v-if="historyError" role="alert">История недоступна. <button class="opr-button" @click="loadHistory">Повторить</button></span>
  </div>
  <p v-if="notice" role="alert" class="report-feedback">{{notice}}</p>
  <template v-if="report">
   <p v-for="msg in report.warnings" :key="msg" role="status" class="report-message">{{msg}}</p>
   <div class="report-table" :class="{'is-stale':stale}" :aria-disabled="stale">
    <table><caption>{{report.title}}</caption>
     <thead><tr><th v-for="(col,i) in report.columns" :key="i" scope="col">{{col}}</th></tr></thead>
     <tbody>
      <tr v-if="!report.lines.length"><td class="empty" :colspan="report.columns.length">За выбранный период по указанным условиям работ нет.</td></tr>
      <tr v-for="({row,span},index) in visible" :key="index" :style="row.center?{'--row-color':centerColors[row.center]}:{}" :class="{colored:row.center}">
       <template v-for="(cell,i) in row.cells" :key="i"><td v-if="i>=grouped||span" :rowspan="i<grouped?span:1" :class="{hours:kind==='timesheet'&&i>=3}">{{typeof cell==='number'?cell.toLocaleString('ru-RU',{maximumFractionDigits:4}):cell}}</td></template>
      </tr>
     </tbody>
     <tfoot v-if="report.totals"><tr><th v-for="(n,i) in report.totals" :key="i" :class="{hours:i>=3}">{{typeof n==='number'?n.toLocaleString('ru-RU',{maximumFractionDigits:4}):n}}</th></tr></tfoot>
    </table>
   </div>
   <div v-if="pages>1" class="report-actions"><button class="opr-button" :disabled="page<=1||stale" @click="page--">Назад</button>{{page}} / {{pages}}<button class="opr-button" :disabled="page>=pages||stale" @click="page++">Вперёд</button></div>
  </template>
  <ReportMailDialog v-if="showMail&&mailReport" :report="mailReport" :skip-prompt="skipPrompt" @close="closeMail"/>
 </section>
</template>

<style scoped>
.report-panel{position:relative}
.report-parameters{display:grid;grid-template-columns:minmax(130px,.8fr) minmax(195px,1.45fr) minmax(210px,1.15fr) minmax(145px,1fr) minmax(160px,1fr);align-items:end;gap:10px 14px;padding:12px 14px;background:var(--opr-panel);border-bottom:1px solid var(--opr-line);font-size:13px}
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
.report-roster p,.report-feedback,.report-message,.report-actions{padding:7px 12px}.report-message{color:var(--ui-error)}
.report-actions{display:flex;gap:8px;border-bottom:1px solid var(--opr-line);font-size:13px}
.report-table{min-height:0;max-height:calc(100dvh - 290px);overflow:auto;flex:1}.report-table thead th{position:sticky;top:0;z-index:1}
.report-table table{width:100%;border-collapse:collapse;font-size:13px}
.report-table caption{padding:9px 12px;background:var(--opr-panel);font-size:16px;font-weight:600;text-align:center}
.report-table th{border:1px solid var(--opr-line);padding:5px 8px;background:var(--opr-panel);white-space:nowrap;text-align:left}
.report-table td{padding:3px 7px;border:1px solid var(--opr-line);vertical-align:middle}.report-table .empty{text-align:center;padding:20px}.report-table .hours{text-align:right;font-variant-numeric:tabular-nums}.report-table .colored td{background:var(--row-color);color:#152a38}
:global(html.dark .odis-plans .report-table .colored td){background:color-mix(in srgb,var(--row-color) 25%,#13222e);color:#f3f7fa}
.report-table.is-stale{opacity:.6;filter:saturate(.4)}.report-actions{align-items:center;flex-wrap:wrap}
@media (max-width:1150px){.report-parameters{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:600px){.report-parameters{grid-template-columns:minmax(0,1fr)}.report-roster{left:0;right:auto}}
</style>
