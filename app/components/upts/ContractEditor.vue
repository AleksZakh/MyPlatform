<script setup lang="ts">
import WorkName from './WorkName.vue';
import { reactive, ref, computed, onMounted, watch, toRaw, nextTick } from "vue";
import { workUserName, type WorkTaskDTO, type WorkUser } from '~~/shared/types/work';
import ObjectFields from './ObjectFields.vue';
import WorkStagesTable from './WorkStagesTable.vue';
import WorkSelectionTable from './WorkSelectionTable.vue';
import {uptsWorkCandidates} from '~~/shared/utils/upts-work-selection';
import { workKindsFor } from '~~/shared/utils/upts-work-kinds';
import type { UptsObjectDetails, UptsTaskStageRow, UptsStageWork } from '~~/shared/types/upts-object';
import Modal from "../work/Modal.vue";
import type { UptsContractDTO, UptsProjectDTO } from "~~/shared/types/upts";
import {
  UPTS_CONTRACT_TYPES,
  type UptsLibrary,
  type UptsContractType,
} from "~~/shared/types/upts-library";
import { dateKey } from "~~/shared/utils/work-board";
const props = defineProps<{
  returnToOverview?:boolean;
  tasks?: WorkTaskDTO[];
  projectId?: number | null;
  projects: UptsProjectDTO[];
  contract: UptsContractDTO | null;
}>();
const emit = defineEmits<{ close: []; saved: [contract: UptsContractDTO] }>();
const { send, error, saving } = useWorkApi();
const c = props.contract;
const details = ref<UptsObjectDetails>({curatorId:null,engineerId:null,workKindKey:null,kuvdEntries:[],...structuredClone(toRaw(c?.objectDetails || {}))});
if(!details.value.rightHolders?.length)details.value.rightHolders=[''];
if(!details.value.permittedUses?.length)details.value.permittedUses=[''];
if(!details.value.kuvdEntries?.length)details.value.kuvdEntries=[{number:'',date:null}];
const activeTab=ref<'characteristics'|'works'>('characteristics');
const defaultsWarning=ref(''),defaultsLoading=ref(!c);
async function loadDefaults(){if(c)return;defaultsLoading.value=true;try{const d=await $fetch<{curatorId:number;engineerId:number|null;warning:string}>('/api/upts/defaults');if(details.value.curatorId==null)details.value.curatorId=d.curatorId;if(details.value.engineerId==null)details.value.engineerId=d.engineerId;defaultsWarning.value=d.warning;}catch{defaultsWarning.value='Не удалось загрузить назначения по умолчанию. Выберите куратора и кадастрового инженера вручную.';}finally{defaultsLoading.value=false;}}
const staff=ref<WorkUser[]>([]), staffLoading=ref(false), staffError=ref(''), validationError=ref('');
const stageCount=ref<number|''>(details.value.stageCount ?? 1);
const objectRoles=[{key:'curatorId',label:'Куратор'},{key:'engineerId',label:'Кадастровый инженер'}] as const;
function retainedPerson(id:number){
  const people=props.projects.flatMap(p=>[p.owner,...p.members.map(m=>m.user)]);
  return workUserName(people.find(p=>p.id===id) || {id,fullName:null,login:null});
}
async function loadStaff(){
  staffLoading.value=true;staffError.value='';
  try{staff.value=await $fetch<WorkUser[]>('/api/upts/people');}
  catch{staffError.value='Не удалось загрузить сотрудников УПТС. Сохранённые назначения сохраняются.';}
  finally{staffLoading.value=false;}
}
const tabs=[{key:'characteristics',label:'Характеристика объекта',icon:'lucide:map-pinned'},{key:'works',label:'Работы с объектом',icon:'lucide:list-checks'}] as const;
const existingWorks=ref<UptsTaskStageRow[]>([]), worksLoading=ref(!!c), worksError=ref('');
const workStages=ref<Record<string,number|''>>({});
const effectiveStageCount=computed(()=>Number.isInteger(stageCount.value) && Number(stageCount.value)>0 ? Number(stageCount.value) : 1);
async function loadStageWorks(){
 if(!c)return;worksLoading.value=true;worksError.value='';
 try{
  const data=await $fetch<{contractVersion:number;tasks:UptsTaskStageRow[]}>(`/api/upts/contracts/${c.id}/works`);
  if(data.contractVersion!==c.version)throw new Error('Объект изменился. Закройте карточку и откройте её заново.');
  existingWorks.value=data.tasks;
  workStages.value=Object.fromEntries(data.tasks.map(t=>['task:'+t.id,t.uptsWorkMeta?.stageNumber ?? 1]));
 }catch(e){worksError.value=e instanceof Error && e.message.startsWith('Объект изменился.')?e.message:'Не удалось загрузить работы объекта. Повторите загрузку перед сохранением.';}
 finally{worksLoading.value=false;}
}

async function tabKey(event:KeyboardEvent,index:number){
  const next=event.key==='Home'?0:event.key==='End'?1:['ArrowRight','ArrowLeft'].includes(event.key)?1-index:null;
  if(next===null)return;event.preventDefault();const list=(event.currentTarget as HTMLElement).parentElement;activeTab.value=tabs[next]!.key;await nextTick();list?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
}
function revealInvalid(event:Event){
 const target=event.target as HTMLElement;
 const tab=target.closest('#upts-characteristics')?'characteristics':target.closest('#upts-object-works')?'works':null;
 if(tab && activeTab.value!==tab){event.preventDefault();activeTab.value=tab;nextTick(()=>target.focus());}

}
const kinds = computed(()=>workKindsFor(form.contractType));
const roads = computed(()=>[...new Set(props.projects.flatMap(p=>p.upts.contracts.map(c=>c.objectDetails?.road).filter((v):v is string=>!!v)))]);
const library = ref<UptsLibrary | null>(null),
  loading = ref(false),
  libraryError = ref("");
const form = reactive({
  clientKey: crypto.randomUUID(),
  version: c?.version,
  number: c?.number || "",
  name: c?.name || "",
  counterparty: c?.counterparty || "",
  signedDate: dateKey(c?.signedDate) || "",
  dueDate: dateKey(c?.dueDate) || "",
  contractType: (c?.contractType || (c ? "" : "LAND")) as UptsContractType | "",
  projectId: c?.projectId ?? null,

});
const manual=ref('');
const selectedKinds=ref<string[]>(details.value.workKindKeys ?? (details.value.workKindKey?[details.value.workKindKey]:[]));
const selectedKind=computed({get:()=>selectedKinds.value.length===1?selectedKinds.value[0]:selectedKinds.value.length>1?'__legacy__':'',set:(key:string)=>{selectedKinds.value=key&&key!=='__legacy__'?[key]:key==='__legacy__'?selectedKinds.value:[];}});
const enabledWorks=ref<string[]>([]);
const selectedKindKeys=computed(()=>kinds.value.filter(k=>selectedKinds.value.includes(k.key)).map(k=>k.key));
const candidates=computed(()=>uptsWorkCandidates(library.value,form.contractType,selectedKindKeys.value));
const manualNames=computed(()=>manual.value.split('\n').map(s=>s.trim()).filter(Boolean));
const workRows=computed<UptsStageWork[]>(()=>c
 ? existingWorks.value.map(t=>({key:'task:'+t.id,name:t.title,...t.uptsWorkMeta,status:t.status}))
 : form.contractType==='OTHER' ? manualNames.value.map((name,i)=>({key:'manual:'+i+':'+name,name}))
 : candidates.value.map(({work,kindKeys})=>({key:'definition:'+work.id,...work,workKindKeys:kindKeys})));
const activeRows=computed(()=>c?workRows.value:workRows.value.filter(w=>enabledWorks.value.includes(w.key)));
watch(()=>workRows.value.map(w=>w.key),keys=>{
 if(c)return;
 enabledWorks.value=enabledWorks.value.filter(key=>keys.includes(key));
 workStages.value=Object.fromEntries(Object.entries(workStages.value).filter(([key])=>keys.includes(key)));
});
watch(()=>form.contractType,()=>{selectedKinds.value=[];manual.value='';if(!c){enabledWorks.value=[];workStages.value={};}});
let attempt:{source:string;key:string}|null=null;
async function load() {
  loading.value = true;
  libraryError.value = "";
  try {
    library.value = await $fetch<UptsLibrary>("/api/upts/library");

  } catch {
    libraryError.value = "Не удалось загрузить библиотеку работ.";
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  loadStaff();loadDefaults();
  if (c) loadStageWorks();
  load();
});
async function save() {
  validationError.value='';
  if(defaultsLoading.value)return;
  if(!c && !details.value.engineerId){validationError.value='Выберите кадастрового инженера: ему будут назначены все работы объекта.';return;}
  if(worksLoading.value || worksError.value || loading.value || libraryError.value)return;
  if(details.value.workStartDate && form.dueDate && details.value.workStartDate>form.dueDate){
    validationError.value='Дата окончания работ не может быть раньше даты начала.';return;
  }
  if(stageCount.value!=='' && (!Number.isInteger(stageCount.value) || stageCount.value<1 || stageCount.value>2147483647)){
    validationError.value='Количество этапов должно быть целым положительным числом.';return;
  }
  if(!c && !activeRows.value.length){
    validationError.value='Нет включённых работ. Отметьте хотя бы одну работу флажком слева перед сохранением объекта.';activeTab.value='works';return;
  }
  const stageNumbers=activeRows.value.map(w=>workStages.value[w.key] ?? 1);
  if(stageNumbers.some(n=>typeof n!=='number' || !Number.isInteger(n) || n<1 || n>effectiveStageCount.value)){
    validationError.value='Укажите каждой работе этап в пределах количества этапов объекта.';activeTab.value='works';return;
  }
  if(activeRows.value.length>50 && !c){validationError.value='За один раз можно включить не более 50 работ.';activeTab.value='works';return;}
  const fields = {
    clientKey: form.clientKey,
    version: form.version,
    ...(c?{taskStages:existingWorks.value.filter(t=>(workStages.value['task:'+t.id] ?? 1)!==(t.uptsWorkMeta?.stageNumber ?? 1)).map(t=>({id:t.id,version:t.version,stageNumber:workStages.value['task:'+t.id] ?? 1}))}:{}),
    number: form.number,
    name: c ? form.name : (details.value.sourceCadastralNumber?.trim() || form.number.trim()),
    counterparty: form.counterparty,
    contractType: form.contractType,
    objectDetails:{...details.value,
      workKindKeys:selectedKindKeys.value,
      workKindKey:selectedKindKeys.value[0] || null,
      workStartDate:details.value.workStartDate || null,
      stageCount:stageCount.value===''?null:stageCount.value,
      basisContractDate:details.value.basisContractDate || null,
      rightHolders:details.value.rightHolders?.map(v=>v.trim()).filter(Boolean),
      permittedUses:details.value.permittedUses?.map(v=>v.trim()).filter(Boolean),
      kuvdEntries:details.value.kuvdEntries?.filter(v=>v.number.trim() || v.date).map(v=>({...v,date:v.date || null})),
    },
    signedDate: form.signedDate || null,
    dueDate: form.dueDate || null,
  };
  const chosenWorks=candidates.value.filter(({work})=>enabledWorks.value.includes('definition:'+work.id)).map(({work})=>({id:work.id,version:work.version}));
  const source=JSON.stringify({fields,chosenWorks,manual:activeRows.value.map(w=>w.name),stageNumbers});
  if(!attempt || attempt.source!==source)attempt={source,key:crypto.randomUUID()};
  const result = await send<UptsContractDTO>(
    c
      ? `/api/upts/projects/${c.projectId}/contracts/${c.id}`
      : "/api/upts/contracts",
    c ? "PUT" : "POST",
    c
      ? fields
      : {
          ...fields,
          clientKey:attempt.key,
          workStages:stageNumbers,
          projectId: null,
          visibility: 'UPTS_DEPARTMENT',
          memberIds: [],
          templateId:null,
          templateVersion:null,
          ...(form.contractType==='OTHER'?{}:{selectedWorks:chosenWorks}),
          manualWorks:form.contractType==='OTHER'?activeRows.value.map(w=>w.name):[],
        },
  );
  if (result) emit("saved", result);
}
</script>
<template>
  <Modal :content-height="900" full-height compact-height wide fixed-sections grey-header icon="streamline-kameleon-color:map-pin" :title="c ? 'Редактирование объекта ' + (details.sourceCadastralNumber || c.number) : 'Новый объект'" @close="emit('close')">
    <form class="work-form upts-object-form" @submit.prevent="save" @invalid.capture="revealInvalid">
      <fieldset class="upts-static upts-object-general" :disabled="saving" aria-label="Общая информация по объекту">
        <legend>Общая информация по объекту</legend>
        <div class="upts-object-general-grid">
          <label v-if="form.contractType!=='OTHER'">Вид работ<select v-model="selectedKind" :disabled="saving || loading || !!libraryError"><option value="">Выберите вид работ</option><option v-if="c && selectedKinds.length>1" value="__legacy__">Ранее выбрано несколько видов (сохранено)</option><option v-for="kind in kinds" :key="kind.key" :value="kind.key">{{ kind.name }}</option></select></label>
          <label>Условный номер (название)<input v-model="form.number" required maxlength="100" /></label>
          <label>Кадастровый номер<input v-model="details.sourceCadastralNumber" maxlength="100" /></label>
          <label>Объект<input v-model="details.road" list="upts-object-roads" maxlength="500" placeholder="Автомобильная дорога" /><datalist id="upts-object-roads"><option v-for="road in roads" :key="road" :value="road" /></datalist></label>
          <label>Местоположение (область, район)<input v-model="details.address" maxlength="500" /></label>
          <label>Площадь, кв. м<input v-model="details.sourceArea" inputmode="decimal" maxlength="30" pattern="[0-9]+([.,][0-9]+)?" /></label>
          <label>Тип<select v-model="form.contractType" required><option value="" disabled>Не выбрано</option><option v-for="(label,key) in UPTS_CONTRACT_TYPES" :key="key" :value="key">{{ label }}</option></select></label>
          <label>Номер заявки<input v-model="details.requestNumber" maxlength="100" /></label>
          <div class="upts-contract-requisites"><label>Номер договора<input v-model="details.basisContractNumber" maxlength="250" /></label><label>От<input v-model="details.basisContractDate" type="date" aria-label="Дата договора" min="1900-01-01" max="2200-12-31" /></label></div>
        </div>
      </fieldset>
      <div class="upts-form-tabs" role="tablist" aria-label="Карточка объекта">
        <button v-for="(tab,i) in tabs" :id="'upts-tab-'+tab.key" :key="tab.key" type="button" role="tab" :aria-selected="activeTab===tab.key" :aria-controls="tab.key==='characteristics'?'upts-characteristics':'upts-object-works'" :tabindex="activeTab===tab.key?0:-1" @click="activeTab=tab.key" @keydown="tabKey($event,i)"><Icon :name="tab.icon" /><span>{{ tab.label }}</span></button>
      </div>
      <p v-if="validationError || error" class="work-error upts-save-error" role="alert">{{ validationError || error }}</p>
      <fieldset class="upts-tab-content" :disabled="saving">
        <div id="upts-characteristics" v-show="activeTab==='characteristics'" role="tabpanel" aria-labelledby="upts-tab-characteristics">
          <ObjectFields v-model="details" />
        </div>
        <div id="upts-object-works" v-show="activeTab==='works'" role="tabpanel" aria-labelledby="upts-tab-works" class="upts-works-fields">
          <label class="upts-stage-count">Количество этапов<input v-model.number="stageCount" type="number" min="1" max="2147483647" step="1" inputmode="numeric" /></label>
          <label v-if="form.contractType==='OTHER'">Описание деятельности<textarea v-model="details.otherDescription" rows="2" maxlength="2000" /></label>
          <p v-if="loading" role="status">Загружаем библиотеку…</p>
          <p v-if="libraryError" class="work-error" role="alert">{{ libraryError }} <button type="button" @click="load">Повторить</button></p>
          <template v-if="!c">
            <label v-if="form.contractType==='OTHER'">Работы — одна строка на работу<textarea v-model="manual" rows="3" maxlength="12550" /></label>
            <p v-if="!workRows.length && !loading && !libraryError" class="work-muted">{{ form.contractType==='OTHER' ? 'Введите названия работ, затем включите нужные строки.' : selectedKindKeys.length ? 'В библиотеке нет активных работ для выбранного вида.' : 'Выберите вид работ в общей информации, чтобы сформировать список.' }}</p>
            <WorkSelectionTable v-if="workRows.length" v-model="workStages" v-model:enabled="enabledWorks" :works="workRows" :stage-count="effectiveStageCount" :disabled="saving || loading || !!libraryError" />
          </template>
          <template v-else>
            <p v-if="worksLoading" role="status">Загружаем работы объекта…</p>
            <p v-if="worksError" class="work-error" role="alert">{{ worksError }} <button type="button" @click="loadStageWorks">Повторить</button></p>
            <p v-if="!worksLoading && !worksError && !existingWorks.length" class="work-muted">Работ пока нет.</p>
            <p class="work-muted">Существующие работы сохраняются. Добавление доступно кнопкой «+ Работа» в карточке объекта.</p>
            <WorkStagesTable v-if="workRows.length" v-model="workStages" :works="workRows" :stage-count="effectiveStageCount" />
          </template>
        </div>
      </fieldset>
      <fieldset class="upts-static upts-object-execution" :disabled="saving" aria-label="Параметры выполнения работ">
        <legend>Параметры выполнения работ</legend>
        <p v-if="defaultsWarning" class="work-muted" role="status">{{ defaultsWarning }}</p>
        <div class="upts-object-execution-grid">
          <label>Дата начала работ<input v-model="details.workStartDate" type="date" min="1900-01-01" max="2200-12-31" /></label>
          <label>Дата окончания работ<input v-model="form.dueDate" type="date" :min="details.workStartDate || '1900-01-01'" max="2200-12-31" /></label>
          <label v-for="role in objectRoles" :key="role.key">{{ role.label }}<select v-model="details[role.key]" :disabled="defaultsLoading || staffLoading || !!staffError"><option :value="null">Не назначен</option><option v-if="details[role.key] && !staff.some(p=>p.id===details[role.key])" :value="details[role.key]">{{ retainedPerson(details[role.key]!) }} (сохранённое назначение)</option><option v-for="p in staff" :key="p.id" :value="p.id">{{ workUserName(p) }}</option></select></label>
        </div>
        <p v-if="staffLoading" class="work-muted" role="status">Загружаем сотрудников УПТС…</p>
        <p v-if="staffError" class="work-error" role="alert">{{ staffError }} <button type="button" @click="loadStaff">Повторить</button></p>
      </fieldset>
      <div class="work-actions upts-object-form-actions"><button class="work-primary" :disabled="saving || defaultsLoading || loading || worksLoading || !!worksError || !!libraryError">{{ saving?'Сохранение…':'Сохранить' }}</button><button type="button" @click="emit('close')">{{ returnToOverview ? 'Назад к карточке' : 'Отмена' }}</button></div>
    </form>
  </Modal>
</template>
<style scoped>
.upts-object-form{--upts-static-bg:#edf2f7;height:100%;min-height:0;display:flex;flex-direction:column;gap:10px;overflow:hidden}
.upts-object-form .upts-static{flex:0 1 auto;overflow:auto;border:1px solid var(--work-line);border-radius:8px;padding:8px 12px;margin:0;min-height:0;background:var(--upts-static-bg);gap:6px}
.upts-static legend{background:var(--upts-static-bg);border-radius:4px}
.upts-static legend,.upts-work-kinds legend{padding:0 6px;font-size:12px;font-weight:600;color:var(--work-text)}
.upts-object-general-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 12px}.upts-object-execution-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px 12px}
.upts-contract-requisites{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0}.upts-stage-count{max-width:170px}
.upts-static label{min-width:0;font-size:12px;color:var(--work-muted)}
.upts-object-form :deep(input:not([type=checkbox])),.upts-object-form :deep(select){box-sizing:border-box;height:32px;padding:5px 8px;min-width:0;color:var(--work-text)}
.upts-object-form :deep(textarea){padding:5px 8px;line-height:1.35}
.upts-object-form :deep(.upts-selection-table .upts-selection-stage input),.upts-object-form :deep(.upts-selection-table .upts-selection-stage select),.upts-object-form :deep(.upts-stage-table .upts-stage-number input){height:32px;padding:5px 8px;line-height:20px}
.upts-object-form .upts-tab-content{flex:1 1 0;min-height:60px;overflow:auto;display:block;padding:2px 2px 8px;overscroll-behavior:contain}
.upts-form-tabs{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:4px;background:var(--space-bg,#f1f5f9);border-radius:8px}
.upts-form-tabs button{display:flex;align-items:center;justify-content:center;gap:8px;padding:8px;min-width:0;font-size:15px;font-weight:400;background:transparent;color:var(--work-muted);border:1px solid var(--work-line);border-radius:6px;line-height:1.3}
.upts-form-tabs button[aria-selected=true]{background:#ffedd5;color:#172338;border-color:#fed7aa;box-shadow:0 1px 3px #0000000d}.upts-form-tabs button .iconify{flex-shrink:0;font-size:20px}
.upts-works-fields{display:grid;gap:8px}.upts-object-form .upts-work-kinds{padding:6px 10px 10px;border:1px solid var(--work-line);border-radius:8px}.upts-kind-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px 14px}.upts-kind-grid label{align-items:flex-start;font-size:12px;line-height:1.35}.upts-kind-grid input{margin-top:2px;flex-shrink:0}
.upts-object-form-actions{flex:none;background:#e8e8ea;border-top:1px solid var(--work-line);box-sizing:border-box;min-height:58px;padding:10px 12px;margin:0;align-items:center}.upts-object-form .upts-save-error{flex:none;max-height:70px;overflow:auto;margin:0!important;padding:6px 10px}
:global(html.dark .upts-object-form){--upts-static-bg:color-mix(in srgb,var(--work-panel) 86%,white)}
:global(html.dark .upts-form-tabs){background:var(--space-graphite-panel,#344757)}:global(html.dark .upts-form-tabs button[aria-selected=true]){background:var(--space-graphite-selected,#36526c);color:#e9f2ff;border-color:#587aa6;box-shadow:inset 0 -2px 0 var(--space-graphite-accent,#93c5fd)}
:global(html.dark .upts-object-form-actions){background:#465765}
@media(max-width:760px){.upts-object-general-grid,.upts-object-execution-grid,.upts-kind-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.upts-form-tabs{gap:6px}.upts-form-tabs button{font-size:13px;padding:7px 5px}}
</style>
