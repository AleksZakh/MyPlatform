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
const modalUi={header:'template-modal-header',body:'template-modal-body',footer:'template-modal-footer'};
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
    :dismissible="!pending" :close="!pending" :ui="{...modalUi,content:'odis-template-modal '+(dialog==='delete'?'template-confirm':'template-wide')}"
    @update:open="v=>{if(!v)close()}">
   <template #body>
    <template v-if="dialog==='delete'"><p>Удалить шаблон «{{selected?.name}}» из библиотеки?</p><p class="template-hint">Работы, уже добавленные в договоры, сохранятся.</p></template>
    <form v-else id="odis-template-form" @submit.prevent="submit">
     <fieldset :disabled="pending||stale">
      <div class="template-fields">
       <label>Название<input v-model="name" maxlength="150" required/></label>
       <label>Категория<select v-model="category" @change="ids=[]"><option v-for="(label,key) in categoryNames" :key="key" :value="key">{{label}}</option></select></label>
      </div>
      <p v-if="selected?.unavailable" class="template-hint">Недоступных работ: {{selected.unavailable}}. При сохранении в шаблон войдут только отмеченные работы.</p>
      <div class="template-list-heading"><strong>Работы из библиотеки</strong><span>Выбрано: {{ids.length}}</span></div>
      <p v-if="loadingWorks" role="status">Загрузка работ…</p>
      <p v-else-if="libraryError" role="alert">{{libraryError}} <button type="button" @click="loadWorks">Повторить</button></p>
      <p v-else-if="!visibleWorks.length">В этой категории пока нет работ.</p>
      <div v-else class="template-grid" role="group" aria-label="Работы из библиотеки">
       <label v-for="w in visibleWorks" :key="w.id"><input v-model="ids" type="checkbox" :value="w.id"/><span><b>{{w.code}}</b> · {{w.name}}</span></label>
      </div>
     </fieldset>
    </form>
    <p v-if="issue" role="alert">{{issue}}</p>
   </template>
   <template #footer><div class="template-modal-actions">
    <button type="button" :disabled="pending" @click="close">Отмена</button>
    <button v-if="dialog==='delete'" type="button" class="template-delete" :disabled="pending||stale" @click="submit">Удалить</button>
    <button v-else form="odis-template-form" type="submit" class="template-save" :disabled="!canSave">Сохранить</button>
   </div></template>
  </UModal>
 </section>
</template>

<style>
.odis-template-modal{--tm-bg:#fff;--tm-text:#253647;--tm-chrome:#485a69;--tm-field:#fff;--tm-soft:#edf4fa;--tm-line:#c7d3df;--tm-muted:#506478;--tm-error:#a32626;display:flex;flex-direction:column;max-height:90dvh;background:var(--tm-bg)!important;color:var(--tm-text)}
html.dark .odis-template-modal{--tm-bg:#293b4a;--tm-text:#edf3f8;--tm-chrome:#344553;--tm-field:#20313f;--tm-soft:#344b5e;--tm-line:#61778b;--tm-muted:#c0d1dd;--tm-error:#ffc1b8;color-scheme:dark}
.odis-template-modal.template-wide{width:min(960px,calc(100vw - 32px));max-width:960px}
.odis-template-modal.template-confirm{width:min(460px,calc(100vw - 32px));max-width:460px}
.odis-template-modal .template-modal-header,.odis-template-modal .template-modal-footer{flex:none;padding:12px 20px;background:var(--tm-chrome);color:#fff;border-color:var(--tm-line)}
.odis-template-modal .template-modal-header :is(h2,p,button){color:inherit}
.odis-template-modal .template-modal-header button:hover{background:#ffffff24}
.odis-template-modal .template-modal-body{padding:16px 20px;min-height:0;overflow:auto}
.odis-template-modal form,.odis-template-modal fieldset{margin:0;min-width:0;border:0;padding:0}
.template-fields{display:grid;grid-template-columns:3fr 2fr;gap:14px}
.template-fields label{display:grid;gap:5px;font-size:14px;font-weight:600}
.template-fields :is(select,input){width:100%;min-width:0;min-height:34px;padding:5px 9px;font:inherit;font-weight:400;background:var(--tm-field);color:var(--tm-text);border:1px solid var(--tm-line);border-radius:4px}
.template-list-heading,.template-modal-actions,.template-row-actions{display:flex;align-items:center;gap:8px}
.template-list-heading{justify-content:space-between;margin:14px 0 6px;font-size:14px}.template-list-heading span,.template-hint{font-size:13px;color:var(--tm-muted)}.template-hint{padding-top:6px}
.template-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-content:start;max-height:48dvh;overflow:auto;overscroll-behavior:contain;border:1px solid var(--tm-line);border-radius:4px}
.template-grid label{display:flex;gap:8px;align-items:baseline;padding:6px 10px;font-size:13px;line-height:1.35;border-bottom:1px solid var(--tm-line);overflow-wrap:anywhere;cursor:pointer}
.template-grid label:nth-child(odd){border-right:1px solid var(--tm-line)}.template-grid label:hover,.template-grid label:has(:checked){background:var(--tm-soft)}
.template-grid input{flex:none;accent-color:#176b88}
.template-modal-actions{width:100%;justify-content:flex-end}.template-modal-actions button,.odis-template-modal [role=alert] button{border:1px solid var(--tm-line);border-radius:4px;padding:5px 12px;min-height:32px;background:var(--tm-field);color:var(--tm-text)}
.template-modal-actions .template-save{background:#176b88;color:#fff}.template-modal-actions .template-delete{background:#953d3d;color:#fff}
.odis-template-modal button:disabled{opacity:.55}.odis-template-modal :focus-visible{outline:2px solid #319ac1;outline-offset:1px}.odis-template-modal [role=alert]{color:var(--tm-error);margin-top:8px}
.odis-template-register .template-action-cell{width:1%;text-align:center;white-space:nowrap}.template-row-actions{justify-content:center;gap:4px}
.odis-template-register .template-row-actions button{display:inline-grid;place-items:center;width:29px;height:28px;padding:0;background:var(--ui-bg);color:var(--ui-text);border-color:var(--ui-border)}.template-row-actions .iconify{width:15px;height:15px}
html.dark .odis-template-register{--space-line:#506579;--space-panel:#344b5e;--space-field:#20313f;--space-text:#edf3f8}
@media (max-width:640px){.template-grid,.template-fields{grid-template-columns:1fr}.template-grid label:nth-child(odd){border-right:0}.odis-template-modal .template-modal-body{padding:12px 14px}}
</style>
