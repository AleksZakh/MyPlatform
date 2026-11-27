<script setup lang="ts">
import type {StructureCatalog, StructureDetail, SavedStructure, StructureListRow} from '~~/shared/types/diagnostic-structures-api';
import {structureGroups, type StructureField} from '~~/shared/types/diagnostic-structures';
import {structureRequestError} from '~/composables/diagnostic/useStructures';
import StructureFields from './StructureFields.vue';
import StructureHistory from './StructureHistory.vue';
const props = defineProps<{structureId?:number;contractId?:number;startEditing?:boolean;roads?:string[];allowRemove?:boolean}>();
const emit = defineEmits<{ close: []; saved: [row:SavedStructure]; remove: [row:StructureListRow] }>();
const id = ref(props.structureId), record = ref<StructureDetail|null>(null), tab = ref('main');
const editing = ref(!id.value), allowed = ref(false), loading=ref(false), busy=ref(false), error=ref(''), loadError=ref('');
const choices = ref<string[]>(props.roads || []);
const fields = structureGroups.flatMap(g=>g.fields);
const form = ref<Record<string,string>>({}), initial = ref('');
const isDirty = computed(()=>editing.value && JSON.stringify(form.value)!==initial.value);
const conflict = ref(false);
const controller = new AbortController();
const uid = useId();
const title = computed(()=>!id.value?'Новое сооружение':editing.value?'Редактирование сооружения':'Карточка сооружения');
const description = computed(()=>record.value ? [record.value.issoCode ? 'ИССО '+record.value.issoCode : 'Без ИССО',record.value.location && record.value.location+' (км+м)',record.value.roadName].filter(Boolean).join(' · ') : 'Справочник сооружений ОДИС');
const date = (s:string)=>new Date(s).toLocaleDateString('ru-RU')+' · '+new Date(s).toLocaleTimeString('ru-RU',{hour12:false});
const isLegacy = (key:string)=>key==='executor' || key==='contractNumber';
function initForm() {
  const r=record.value;
  form.value=Object.fromEntries(fields.map(({key})=>[key,key==='lengthMetres' ? r?.lengthRaw || String(r?.lengthMetres ?? '') : String(r?.[key] ?? '')]));
  initial.value=JSON.stringify(form.value);
}
initForm();
async function read() {
  if (!id.value) return;
  loading.value=true;loadError.value='';
  try {
    record.value=await $fetch<StructureDetail>('/api/diagnostic/structures/'+id.value,{query:{contractId:props.contractId},signal:controller.signal});
    initForm();
  } catch (e) {record.value=null;loadError.value=structureRequestError(e);}
  finally {loading.value=false;}
}
async function loadRoads() {
  if (props.roads || choices.value.length) return;
  try { choices.value=(await $fetch<StructureCatalog>('/api/diagnostic/structures/catalog',{signal:controller.signal})).roads; }
  catch { /* Free text remains available. */ }
}
function beginEdit() {
  initForm();tab.value='main';error.value='';conflict.value=false;editing.value=true;void loadRoads();
}
onMounted(async()=>{
  const grant=$fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.structures',action:id.value?'UPDATE':'CREATE'},signal:controller.signal})
    .then(r=>r.allowed,()=>false);
  await read();allowed.value=await grant;
  if (props.startEditing && allowed.value && record.value && !record.value.decommissionedAt) beginEdit();
  if (!id.value) void loadRoads();
});
onBeforeUnmount(()=>controller.abort());
function close() {
  if (!busy.value && (!isDirty.value || window.confirm('Закрыть карточку без сохранения изменений?'))) emit('close');
}
function cancel() {
  if (!id.value) {close();return;}
  if (isDirty.value && !window.confirm('Отменить изменения в карточке?')) return;
  editing.value=false;error.value='';conflict.value=false;initForm();
}
async function save() {
  if (!allowed.value || busy.value || loading.value || !isDirty.value) return;
  const {issoCode,lengthMetres,executor,contractNumber,...data}=form.value;
  const prior = JSON.parse(initial.value) as Record<string,string>;
  error.value='';
  for (const key of ['roadName','location','structureName']) if (!data[key]?.trim()) {
    tab.value='main';error.value='Заполните поле «'+fields.find(f=>f.key===key)?.label+'».';
    await nextTick();document.getElementById(uid+key)?.focus();return;
  }
  busy.value=true;
  const creating=!id.value;
  try {
    const saved=await $fetch<{id:number;structure:SavedStructure}>('/api/diagnostic/structures',{
      method:'POST',retry:0,headers:{'x-space-diagnostic':'1'},
      body:{...data,code:issoCode || '',lengthRaw:!id.value || lengthMetres!==prior.lengthMetres ? lengthMetres : undefined,id:id.value,version:record.value?.version},
    });
    emit('saved',saved.structure);
    if (creating) { emit('close');return; }
    editing.value=false;await read();
  } catch(e) {
    const status=(e as {response?:{status:number}}).response?.status;
    error.value=status===403?'Нет права на сохранение сооружения.':structureRequestError(e);
    conflict.value=status===409 && !!id.value;
  }
  finally { busy.value=false; }
}
async function reloadRecord(){
  if (!window.confirm('Загрузить актуальные данные и сбросить изменения в форме?')) return;
  editing.value=false;conflict.value=false;error.value='';await read();
}
function fieldLabel(key:StructureField,label:string) {
  return key==='executor'?'Исполнители из старой базы':key==='contractNumber'?'Договоры из старой базы':label;
}
</script>
<template>
  <UModal open :title="title" :description="description" :close="!busy" :dismissible="!busy"
    :ui="{content:'diagnostic-contract-modal odis-work-card odis-object-card',header:'ow-chrome',description:'ow-number',body:'ow-body',footer:'ow-chrome ow-footer'}"
    @update:open="v=>{if (!v) close()}">
    <template #body>
      <p v-if="loading" role="status">Загрузка карточки…</p>
      <p v-else-if="loadError" role="alert">{{loadError}} <button type="button" @click="read">Повторить</button></p>
      <template v-else>
        <nav class="object-tabs" aria-label="Разделы карточки">
          <button v-for="g in structureGroups" :key="g.key" type="button" :aria-pressed="g.key===tab" @click="tab=g.key">{{g.label}}</button>
          <button v-if="record" type="button" :aria-pressed="tab==='history'" @click="tab='history'">История изменений</button>
        </nav>
        <div class="object-pane">
          <p v-if="record?.decommissionedAt">Выведено из эксплуатации · {{date(record.decommissionedAt)}}</p>
          <StructureHistory v-if="tab==='history' && id" :id="id" :contract-id="contractId"/>
          <form v-else-if="editing" :id="uid+'form'" @submit.prevent="save" novalidate>
            <fieldset :disabled="busy" class="object-fields">
              <label v-for="f in structureGroups.find(g=>g.key===tab)?.fields" :key="f.key"
                :class="{'object-wide':['roadName','additionalId','expertOpinion','plannedWorks','note','contractNumber','executor'].includes(f.key)}">
                <span>{{fieldLabel(f.key,f.label)}}{{ ['roadName','location','structureName'].includes(f.key) ? ' *' : '' }}</span>
                <textarea v-if="['expertOpinion','plannedWorks','note','contractNumber','executor'].includes(f.key)" v-model="form[f.key]" :readonly="isLegacy(f.key)" rows="3" maxlength="16000"/>
                <input v-else :id="uid+f.key" v-model="form[f.key]" :readonly="f.key==='issoCode' && !!record?.issoCode"
                  :required="['roadName','location','structureName'].includes(f.key)" :maxlength="f.key==='issoCode'?200:16000"
                  :list="f.key==='roadName'?uid+'roads':undefined" :placeholder="f.key==='location'?'100+350':undefined"/>
              </label>
              <datalist :id="uid+'roads'"><option v-for="v in choices" :key="v" :value="v"/></datalist>
            </fieldset>
          </form>
          <StructureFields v-else-if="record" :record="record" :contracts="record.contracts" :group="tab" legacy/>
          <div v-if="record && tab!=='history'" class="object-source">
            <p>Создал · {{record.creator}} · {{date(record.createdAt)}}</p>
            <p v-if="record.importedAt">Импорт · {{record.importers.join(', ')}} · {{date(record.importedAt)}} · {{record.sourceFile}}</p>
            <p v-if="record.legacyIds.length">ID в старой базе · {{record.legacyIds.join(', ')}}</p>
            <p>Изменено · {{record.editor}} · {{date(record.updatedAt)}}</p>
          </div>
          <p v-if="error" role="alert">{{error}} <button v-if="conflict" type="button" @click="reloadRecord">Загрузить актуальную карточку</button></p>
        </div>
      </template>
    </template>
    <template #footer>
      <button v-if="!editing && record && allowRemove && !record.decommissionedAt" type="button" @click="emit('remove',record)">Удалить</button>
      <button v-if="!editing && record && allowed && !record.decommissionedAt" type="button" class="ow-primary" @click="beginEdit">Редактировать</button>
      <button v-if="editing && !loadError" type="button" class="ow-primary" :disabled="busy || loading || !allowed || !isDirty" @click="save">Сохранить</button>
      <button type="button" :disabled="busy" @click="editing ? cancel() : close()">{{editing?'Отмена':'Закрыть'}}</button>
    </template>
  </UModal>
</template>
<style>
@import "~/assets/css/diagnostic-contracts.css";
@import "~/assets/css/diagnostic-work-card.css";
@import "~/assets/css/diagnostic-structure-card.css";
</style>
