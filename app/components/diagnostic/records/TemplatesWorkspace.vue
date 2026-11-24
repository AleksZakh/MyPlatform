<script setup lang="ts">
import {categoryNames,type Category} from '~~/shared/utils/diagnostic-planning';
import type {DraftWork,WorkTemplate} from '~~/shared/types/diagnostic-templates';

type Action='CREATE'|'UPDATE'|'DELETE';
type LibraryWork=DraftWork & {category:Category};
const templates=ref<WorkTemplate[]>([]);
const library=ref<LibraryWork[]>([]);
const rights=ref<Record<Action,boolean>>({CREATE:false,UPDATE:false,DELETE:false});
const dialog=ref<'create'|'edit'|'delete'|null>(null);
const selected=ref<WorkTemplate|null>(null);
const name=ref(''),category=ref<Category>('contract'),ids=ref<number[]>([]);
const loading=ref(false),loadingWorks=ref(false),pending=ref(false);
const listError=ref(''),issue=ref(''),libraryError=ref(''),stale=ref(false);
const visibleWorks=computed(()=>library.value.filter(w=>w.category===category.value));
const title=computed(()=>dialog.value==='delete'?'Удалить шаблон работ':dialog.value==='edit'?'Редактировать шаблон работ':'Новый шаблон работ');
const canSave=computed(()=>!!name.value.trim()&&ids.value.length>0&&!loadingWorks.value&&!libraryError.value&&!stale.value&&!pending.value);
const modalUi={header:'ow-chrome',description:'ow-number',body:'ow-body',footer:'ow-chrome ow-footer'};
const headers={'x-space-diagnostic':'1','Content-Type':'application/json'};
let request=0;

function errorText(e:unknown,fallback:string){
 const err=e as {data?:{data?:{message?:string};message?:string}};
 return err?.data?.data?.message||err?.data?.message||fallback;
}
async function load(){
 loading.value=true;listError.value='';
 try{templates.value=await $fetch('/api/diagnostic/templates');}
 catch(e){listError.value=errorText(e,'Не удалось загрузить шаблоны.');}
 finally{loading.value=false;}
}
onMounted(async()=>{
 await Promise.all([load(),...(['CREATE','UPDATE','DELETE'] as const).map(async action=>{
  try{rights.value[action]=(await $fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.contracts',action}})).allowed;}
  catch{rights.value[action]=false;}
 })]);
});
async function loadWorks(){
 const current=++request;
 loadingWorks.value=true;libraryError.value='';
 try{
  const data=await $fetch<{library:LibraryWork[]}>('/api/diagnostic/planning/options');
  if(current===request)library.value=data.library;
 }catch(e){if(current===request)libraryError.value=errorText(e,'Не удалось загрузить библиотеку работ.');}
 finally{if(current===request)loadingWorks.value=false;}
}
function open(mode:'create'|'edit'|'delete',row:WorkTemplate|null=null){
 selected.value=row;dialog.value=mode;stale.value=false;issue.value='';
 name.value=row?.name||'';category.value=row?.category||'contract';ids.value=row?.items.map(w=>w.id)||[];
 if(mode!=='delete')void loadWorks();
}
function close(){
 if(pending.value)return;
 request++;dialog.value=null;
}
async function submit(){
 const mode=dialog.value,row=selected.value;
 if(!mode||pending.value||stale.value||(mode!=='delete'&&!canSave.value))return;
 const action=mode==='create'?'CREATE':mode==='edit'?'UPDATE':'DELETE';
 if(!rights.value[action]||(mode!=='create'&&!row))return;
 pending.value=true;issue.value='';
 try{
  const body=mode==='delete'?{version:row!.version}:{name:name.value.trim(),category:category.value,items:ids.value,version:row?.version};
  await $fetch('/api/diagnostic/templates'+(row?'/'+row.id:''),{method:mode==='create'?'POST':mode==='edit'?'PUT':'DELETE',body,headers,retry:0});
  dialog.value=null;await load();
 }catch(e){
  issue.value=errorText(e,'Не удалось сохранить изменения.');
  if((e as {statusCode?:number}).statusCode===409){stale.value=true;await load();}
 }finally{pending.value=false;}
}
</script>

<template>
 <section class="odis-records odis-template-register">
  <header><h1>Шаблоны работ</h1><button type="button" :disabled="!rights.CREATE||pending" @click="open('create')">Создать шаблон</button></header>
  <p v-if="listError" role="alert">{{listError}} <button type="button" @click="load">Повторить</button></p>
  <div class="records-scroll">
   <table><thead><tr><th>Шаблон</th><th>Категория</th><th>Состав</th><th>Автор</th><th class="template-action-cell">Действия</th></tr></thead>
    <tbody><tr v-for="t in templates" :key="t.id">
     <td>{{t.name}}</td><td>{{categoryNames[t.category]}}</td>
     <td><details><summary>Работ: {{t.items.length}} <span v-if="t.unavailable">· недоступно: {{t.unavailable}}</span></summary><p v-for="w in t.items" :key="w.id">{{w.code}} · {{w.name}}</p></details></td>
     <td>{{t.author}}</td>
     <td class="template-action-cell"><div class="template-row-actions">
      <button type="button" title="Редактировать шаблон" :aria-label="'Редактировать шаблон '+t.name" :disabled="!rights.UPDATE||pending" @click="open('edit',t)"><Icon name="lucide:pencil"/></button>
      <button type="button" title="Удалить шаблон" :aria-label="'Удалить шаблон '+t.name" :disabled="!rights.DELETE||pending" @click="open('delete',t)"><Icon name="lucide:trash-2"/></button>
     </div></td>
    </tr></tbody></table>
   <p v-if="!templates.length&&!listError">{{loading?'Загрузка шаблонов…':'Шаблонов работ пока нет.'}}</p>
  </div>
  <UModal v-if="dialog" open :title="title" :description="dialog==='create'?undefined:selected?.name"
    :dismissible="!pending" :close="!pending" :ui="{...modalUi,content:'diagnostic-contract-modal odis-work-card odis-template-modal '+(dialog==='delete'?'template-confirm':'template-wide')}"
    @update:open="v=>{if(!v)close()}">
   <template #body>
    <template v-if="dialog==='delete'"><p>Удалить шаблон «{{selected?.name}}» из библиотеки?</p><p class="template-hint">Работы, уже добавленные в договоры, сохранятся.</p></template>
    <form v-else id="odis-template-form" @submit.prevent="submit">
     <fieldset class="template-content" :disabled="pending||stale">
      <div class="ow-fields template-fields">
       <label>Название<input class="ow-value" v-model="name" maxlength="150" required/></label>
       <label>Категория<select class="ow-value" v-model="category" @change="ids=[]"><option v-for="(label,key) in categoryNames" :key="key" :value="key">{{label}}</option></select></label>
      </div>
      <p v-if="selected?.unavailable" class="template-hint">Недоступных работ: {{selected.unavailable}}. При сохранении в шаблон войдут только отмеченные работы.</p>
      <fieldset class="ow-section template-library">
       <legend>Работы из библиотеки <small>Выбрано: {{ids.length}}</small></legend>
      <p v-if="loadingWorks" role="status">Загрузка работ…</p>
      <p v-else-if="libraryError" role="alert">{{libraryError}} <button type="button" @click="loadWorks">Повторить</button></p>
      <p v-else-if="!visibleWorks.length">В этой категории пока нет работ.</p>
      <div v-else class="template-grid" role="group" aria-label="Работы из библиотеки">
       <label v-for="w in visibleWorks" :key="w.id"><input v-model="ids" type="checkbox" :value="w.id"/><span><b>{{w.code}}</b> · {{w.name}}</span></label>
      </div>
      </fieldset>
     </fieldset>
    </form>
    <p v-if="issue" role="alert">{{issue}}</p>
   </template>
   <template #footer>
    <button v-if="dialog==='delete'" type="button" class="template-delete" :disabled="pending||stale" @click="submit">Удалить</button>
    <button v-else form="odis-template-form" type="submit" class="ow-primary" :disabled="!canSave">Сохранить</button>
    <button type="button" :disabled="pending" @click="close">Отмена</button>
   </template>
  </UModal>
 </section>
</template>

<style src="~/assets/css/diagnostic-work-card.css"></style>
<style>
.diagnostic-contract-modal.odis-template-modal.template-wide { width: min(95vw, 960px); }
.diagnostic-contract-modal.odis-template-modal.template-confirm { width: min(95vw, 460px); }
.odis-template-modal form, .template-content { width: 100%; min-width: 0; margin: 0; padding: 0; border: 0; }
.odis-template-modal .template-fields { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); margin-top: 0; }
.template-library { margin-top: 14px; }
.template-library small, .template-hint { font-size: 12px; font-weight: 400; }
.template-library small { margin-left: 8px; white-space: nowrap; }
.template-hint { margin-top: 6px; }
.template-grid {
 display: grid;
 grid-template-columns: repeat(2, minmax(0, 1fr));
 align-content: start;
 max-height: 48dvh;
 overflow: auto;
 overscroll-behavior: contain;
 border: 1px solid var(--contract-line);
 border-radius: 3px;
 background: var(--contract-field);
}
.template-grid label {
 display: flex;
 align-items: baseline;
 gap: 8px;
 padding: 4px 7px;
 border-bottom: 1px solid var(--contract-line);
 overflow-wrap: anywhere;
 cursor: pointer;
}
.template-grid label:nth-child(odd) { border-right: 1px solid var(--contract-line); }
.template-grid label:hover, .template-grid label:has(:checked) { background: var(--contract-panel); }
.template-grid input { flex: none; accent-color: #176b88; }
.odis-template-modal .template-delete { background: #953d3d; color: white; }
.odis-template-modal [role=alert] button { text-decoration: underline; }
.template-row-actions { display: flex; align-items: center; }
.odis-template-register .template-action-cell{width:1%;text-align:center;white-space:nowrap}.template-row-actions{justify-content:center;gap:4px}
.odis-template-register .template-row-actions button{display:inline-grid;place-items:center;width:29px;height:28px;padding:0;background:var(--ui-bg);color:var(--ui-text);border-color:var(--ui-border)}.template-row-actions .iconify{width:15px;height:15px}
html.dark .odis-template-register{--space-line:#506579;--space-panel:#344b5e;--space-field:#20313f;--space-text:#edf3f8}
@media (max-width: 640px) {
 .template-grid, .odis-template-modal .template-fields { grid-template-columns: 1fr; }
 .template-grid label:nth-child(odd) { border-right: 0; }
}
</style>
