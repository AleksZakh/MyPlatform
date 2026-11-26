<script setup lang="ts">
import {computed,onMounted,ref} from 'vue';
import type {ContractSelection,DraftWork,WorkTemplate} from '~~/shared/types/diagnostic-templates';
import {categoryNames} from '~~/shared/utils/diagnostic-planning';
const props=defineProps<{manual:boolean;number:string}>();
const emit=defineEmits<{close:[];apply:[ContractSelection]}>();
const templates=ref<WorkTemplate[]>([]),library=ref<DraftWork[]>([]);
const choice=ref<number|null>(null),workIds=ref<number[]>([]),search=ref('');
const error=ref(''),busy=ref(true);
const active=computed(()=>templates.value.find(t=>t.id===choice.value));
const title=computed(()=>props.manual?'Добавить работы':'Применить шаблон работ');
const visibleWorks=computed(()=>library.value.filter(w=>(w.code+' '+w.name).toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))));
const ready=computed(()=>!busy.value&&!error.value&&(props.manual||!!active.value&&!active.value.unavailable)&&(!props.manual||workIds.value.length>0));
async function loadOptions(){
 busy.value=true;error.value='';
 try{
  if(!props.manual)templates.value=(await $fetch<WorkTemplate[]>('/api/diagnostic/templates')).filter(t=>t.category!=='structure');
  else library.value=await $fetch<DraftWork[]>('/api/diagnostic/contracts/library');
 }catch(e:any){error.value=e?.data?.message||'Не удалось загрузить список.';}
 finally{busy.value=false;}
}
onMounted(loadOptions);
function apply(){
 if(!ready.value)return;
 emit('apply',{
  template:active.value?{id:active.value.id,version:active.value.version,name:active.value.name}:undefined,
  works:active.value?.items??library.value.filter(w=>workIds.value.includes(w.id)),
  structures:[]
 });
}
</script>
<template>
 <UModal open :title="title" :description="number||'Новый договор'" :ui="{content:'diagnostic-contract-modal odis-picker sm:max-w-2xl',header:'contract-modal-header',body:'picker-body',footer:'contract-modal-footer'}" @update:open="v=>{if(!v)emit('close')}">
  <template #body>
   <p v-if="busy" role="status">Загрузка…</p>
   <p v-else-if="error" role="alert">{{error}} <button @click="loadOptions">Повторить</button></p>
   <template v-else>
    <template v-if="!manual">
     <label class="picker-field">Шаблон работ
      <select v-model="choice" :disabled="!templates.some(t=>!t.unavailable)"><option :value="null">Выберите шаблон</option><option v-for="t in templates" :key="t.id" :value="t.id" :disabled="!!t.unavailable">{{t.name}} · {{categoryNames[t.category]}}{{t.unavailable?' (изменён состав библиотеки)':''}}</option></select>
     </label>
     <p v-if="!templates.length" class="picker-empty" role="status">Для этого раздела пока нет шаблонов.</p>
     <ul v-if="active" class="picker-preview"><li v-for="w in active.items" :key="w.id">{{w.code}} · {{w.name}}</li></ul>
    </template>
    <template v-if="manual">
     <label class="picker-field">Найти работу <input v-model="search" type="search" placeholder="Шифр или название работы"/></label>
     <div class="picker-list"><label v-for="w in visibleWorks" :key="w.id"><input v-model="workIds" type="checkbox" :value="w.id"/><span>{{w.code}} · {{w.name}}</span></label><p v-if="!visibleWorks.length" class="picker-empty">Работы не найдены.</p></div>
    </template>
   </template>
  </template>
  <template #footer><div class="picker-actions"><button type="button" @click="emit('close')">Отмена</button><button class="primary" type="button" :disabled="!ready" @click="apply">{{manual?'Добавить':'Применить'}}</button></div></template>
 </UModal>
</template>
<style>
.odis-picker{background:var(--contract-bg,var(--ui-bg));color:var(--contract-text,var(--ui-text));width:min(96vw,42rem);max-height:86dvh}
.odis-picker>.contract-modal-header,.odis-picker>.contract-modal-footer{background:#e8e8ea;padding:12px 16px!important}
html.dark .odis-picker>.contract-modal-header,html.dark .odis-picker>.contract-modal-footer{background:#465765}
.odis-picker .picker-body{padding:16px!important;display:grid;gap:12px;overflow:auto;min-height:0}
.picker-field{display:grid;gap:5px;font-weight:600}.odis-picker :is(select,input[type=search],.picker-actions button,.picker-pages button,[role=alert] button){border:1px solid var(--contract-line,var(--ui-border));background:var(--contract-bg,var(--ui-bg));color:inherit;border-radius:4px;padding:6px 10px}
.picker-field :is(select,input){width:100%;min-width:0;font-weight:400}.picker-empty{padding:10px;color:var(--ui-text-muted);background:var(--ui-bg-muted)}
.picker-preview,.picker-list{max-height:30dvh;overflow:auto;border:1px solid var(--ui-border);border-radius:4px}.picker-list label,.picker-preview li{display:flex;align-items:center;gap:8px;padding:5px 10px;border-bottom:1px solid var(--ui-border)}
.picker-actions,.picker-pages{display:flex;align-items:center;gap:8px;justify-content:flex-end;width:100%}.picker-pages>span:first-child{margin-right:auto}
.odis-picker .picker-actions button.primary{background:#176b88;color:white;border-color:#176b88}.odis-picker button:disabled{opacity:.5;cursor:default}
</style>
