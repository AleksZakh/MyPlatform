<script setup lang="ts">
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
import {journalKinds,type JournalRow,type JournalPage} from '~~/shared/types/diagnostic-journal';
import {diagnosticWorkStatus} from '~~/shared/utils/diagnostic-contract-table';
const badges = {
 DiagnosticContract: { icon: 'lucide:file-text', tone: 'blue' },
 DiagnosticTrip: { icon: 'lucide:briefcase-business', tone: 'amber' },
 DiagnosticWorkTemplate: { icon: 'lucide:list-tree', tone: 'violet' },
 DiagnosticContractWork: { icon: 'lucide:clipboard-list', tone: 'blue' },
 DiagnosticStructureWork: { icon: 'lucide:wrench', tone: 'teal' },
 DiagnosticStructure: { icon: 'lucide:construction', tone: 'teal' },
 DiagnosticContractStructure: { icon: 'lucide:link-2', tone: 'teal' },
 DiagnosticWork: { icon: 'lucide:book-open', tone: 'violet' },
 DiagnosticWorkPlan: { icon: 'lucide:calendar-days', tone: 'blue' },
 DiagnosticPlanCompletion: { icon: 'lucide:list-checks', tone: 'green' },
 DiagnosticCounterparty: { icon: 'lucide:handshake', tone: 'amber' },
 DiagnosticProjectType: { icon: 'lucide:folders', tone: 'violet' },
 DiagnosticWorkCategory: { icon: 'lucide:tags', tone: 'violet' },
} satisfies Record<keyof typeof journalKinds, {icon:string; tone:string}>;
const kind=ref(''),search=ref(''),person=ref(''),from=ref(''),to=ref(''),page=ref(1);
const history=ref<JournalRow|null>(null),historyPage=ref(1);
const searchTerm=ref(''),personTerm=ref('');
let timer:ReturnType<typeof setTimeout>;
watch([search,person],()=>{clearTimeout(timer);timer=setTimeout(()=>{searchTerm.value=search.value;personTerm.value=person.value;},300);});
onBeforeUnmount(()=>clearTimeout(timer));
const fieldNames:Record<string,string>={name:'Название',number:'Номер',status:'Статус',planStart:'Плановое начало',planFinish:'Плановое окончание',planHours:'План, чел·ч',planExecutor:'Плановый исполнитель',factStart:'Фактическое начало',factFinish:'Фактическое окончание',factHours:'Факт, чел·ч',factExecutor:'Фактический исполнитель',note:'Примечание',start:'Начало',finish:'Окончание',category:'Категория',deletedAt:'Удаление'};
function value(field:string,v:unknown){
 if(v===null||v===undefined||v==='')return '—';
 if(field==='status')return diagnosticWorkStatus(String(v)).title;
 if(typeof v==='string'&&/^\d{4}-\d{2}-\d{2}(T|$)/.test(v))return v.slice(0,10).split('-').reverse().join('.');
 return typeof v==='object'?JSON.stringify(v):String(v);
}
const {data,status,error,refresh}=await useFetch<JournalPage>('/api/diagnostic/journal',{query:{kind,search:searchTerm,person:personTerm,from,to,page},lazy:true});
watch([kind,searchTerm,personTerm,from,to],()=>{page.value=1;},{flush:'sync'});
function reset(){kind.value='';search.value='';person.value='';from.value='';to.value='';page.value=1;}
const events=ref<JournalPage|null>(null),issue=ref('');
watch([history,historyPage],async ([row,p],_,onCleanup)=>{
 let current=true;onCleanup(()=>{current=false;});events.value=null;issue.value='';
 if(!row)return;
 try{const result=await $fetch<JournalPage>('/api/diagnostic/journal',{query:{kind:row.kind,...(row.entity&&row.kind!=='DiagnosticWorkPlan'?{entity:row.entity}:{entry:row.id}),page:p}});
 if(current)events.value=result;}catch(e:any){if(current)issue.value=e.data?.message||'Не удалось загрузить историю.';}
});
const action=(s:string)=>({CREATE:'Создание',UPDATE:'Изменение',DELETE:'Удаление',STATUS:'Смена статуса'}[s]||s);
const stamp=(s:string)=>new Date(s).toLocaleString('ru-RU',{timeZone:'Europe/Moscow',dateStyle:'short',timeStyle:'short'});
</script>
<template><section class="odis-records"><DiagnosticModuleTabs active="journal"/><header><h1>Журнал событий ОДИС</h1><strong>Всего событий: {{data?.total??'…'}}</strong></header>
<div class="journal-filters"><select v-model="kind" aria-label="Тип события"><option value="">Все события</option><option v-for="(v,k) in journalKinds" :key="k" :value="k">{{v}}</option></select>
<input v-model="search" type="search" placeholder="Договор, сооружение, работа" aria-label="Поиск событий"/><input v-model="person" type="search" placeholder="Автор / редактор" aria-label="Автор или редактор"/>
<label>С <input v-model="from" type="date"/></label><label>по <input v-model="to" type="date"/></label><button @click="reset">Сбросить</button></div>
<p v-if="error" role="alert">{{error.message||'Не удалось загрузить журнал.'}} <button @click="refresh()">Повторить</button></p>
<div class="records-scroll"><table><thead><tr><th>Событие</th><th>Основные данные</th><th>Дата и время, МСК</th><th>Создано</th><th>Автор</th><th>Кто изменил</th><th>История</th></tr></thead>
<tbody><tr v-for="r in data?.rows" :key="r.id"><td><div class="journal-event"><span aria-hidden="true" class="journal-badge" :class="badges[r.kind].tone"><Icon :name="badges[r.kind].icon"/></span><span><strong>{{journalKinds[r.kind]}}</strong><small>{{action(r.action)}}</small></span></div></td><td>{{r.title}}</td><td>{{stamp(r.time)}}</td><td>{{r.created?stamp(r.created):'—'}}</td><td>{{r.author||'—'}}</td><td>{{r.editor||'—'}}</td><td><button title="История записи" aria-label="История записи" @click="historyPage=1;history=r"><Icon name="lucide:history"/></button></td></tr></tbody></table><p v-if="status==='pending'">Загрузка журнала…</p><p v-else-if="!error&&!data?.rows.length">Событий за выбранный период нет.</p></div>
<footer><button :disabled="page===1" @click="page--">Назад</button>{{page}} / {{Math.ceil((data?.total||0)/25)||1}}<button :disabled="page*25>=(data?.total||0)" @click="page++">Вперёд</button></footer>
<UModal v-if="history" open title="История записи" :description="history.title" @update:open="v=>{if(!v)history=null}"><template #body><div class="odis-records"><p v-if="issue" role="alert">{{issue}}</p><div v-for="r in events?.rows" :key="r.id"><p>{{stamp(r.time)}} · {{action(r.action)}} · {{r.editor||'—'}} <span v-if="r.status">· {{diagnosticWorkStatus(r.status).title}}</span></p>
 <ul v-if="r.details"><li v-for="(v,k) in r.details" :key="k">{{fieldNames[k]||k}}: {{value(k,v.before)}} → {{value(k,v.after)}}</li></ul></div>
<footer><button :disabled="historyPage===1" @click="historyPage--">Назад</button>{{historyPage}}<button :disabled="historyPage*25>=(events?.total||0)" @click="historyPage++">Вперёд</button></footer></div></template></UModal>
</section></template>

<style scoped>
.journal-event{display:flex;gap:8px;align-items:center}.journal-event small{display:block;color:var(--ui-text-muted)}
.journal-badge{display:grid;place-items:center;flex:none;width:32px;height:32px;border-radius:8px;color:var(--ink);background:var(--wash)}
.journal-badge .iconify{font-size:17px}.blue{--ink:#145d8a;--wash:#e0f2fe}.teal{--ink:#126364;--wash:#d7f4ef}.amber{--ink:#874b09;--wash:#fff0c7}.violet{--ink:#594486;--wash:#eee8fb}.green{--ink:#21643d;--wash:#ddf4e4}
html.dark .journal-badge{color:var(--wash);background:color-mix(in srgb,var(--ink) 60%,#202d36)}
</style>
