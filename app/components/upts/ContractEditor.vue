<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch, toRaw, nextTick } from "vue";
import { workUserName, type WorkTaskDTO, type WorkUser } from '~~/shared/types/work';
import ObjectFields from './ObjectFields.vue';
import WorkStagesTable from './WorkStagesTable.vue';
import { workKindsFor } from '~~/shared/utils/upts-work-kinds';
import type { UptsObjectDetails, UptsTaskStageRow, UptsStageWork } from '~~/shared/types/upts-object';
import Modal from "../work/Modal.vue";
import type { UptsContractDTO, UptsProjectDTO } from "~~/shared/types/upts";
import {
  type UptsLibrary,
  type UptsContractType,
} from "~~/shared/types/upts-library";
import { dateKey } from "~~/shared/utils/work-board";
const props = defineProps<{
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
const staff=ref<WorkUser[]>([]), staffLoading=ref(false), staffError=ref(''), validationError=ref('');
const stageCount=ref<number|''>(details.value.stageCount ?? '');
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
const stages = computed(()=>[...new Set(props.projects.flatMap(p=>p.upts.contracts.map(c=>c.objectDetails?.stage).filter((v):v is string=>!!v)))]);
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
const templateId = ref<number | null>(null),
  manual = ref("");
const templates = computed(
  () =>
    library.value?.templates.filter(
      (t) =>
        t.contractType === form.contractType &&
        t.active &&
        t.workKindKey === details.value.workKindKey &&
        t.items.every((i) => i.work.active),
    ) || [],
);
const template = computed(() =>
  templates.value.find((t) => t.id === templateId.value),
);
const manualNames=computed(()=>manual.value.split('\n').map(s=>s.trim()).filter(Boolean));
const workRows=computed<UptsStageWork[]>(()=>c
 ? existingWorks.value.map(t=>({key:'task:'+t.id,name:t.title,...t.uptsWorkMeta,status:t.status}))
 : template.value ? template.value.items.map(i=>({key:'definition:'+i.work.id,...i.work}))
 : manualNames.value.map((name,i)=>({key:'manual:'+i+':'+name,name})));
let attempt:{source:string;key:string}|null=null;
watch(
  () => form.contractType,
  () => {
    details.value.workKindKey=null;
    templateId.value = null;
    manual.value = "";
  },
);
watch(()=>details.value.workKindKey,()=>{templateId.value=templates.value[0]?.id ?? null;});
async function load() {
  loading.value = true;
  libraryError.value = "";
  try {
    library.value = await $fetch<UptsLibrary>("/api/upts/library");
    templateId.value = templates.value[0]?.id ?? null;
  } catch {
    libraryError.value = "Не удалось загрузить библиотеку работ.";
  } finally {
    loading.value = false;
  }
}
onMounted(() => {
  loadStaff();
  if (c) loadStageWorks(); else load();
});
async function save() {
  validationError.value='';
  if(worksLoading.value || worksError.value)return;
  if(details.value.workStartDate && form.dueDate && details.value.workStartDate>form.dueDate){
    validationError.value='Дата окончания работ не может быть раньше даты начала.';return;
  }
  if(stageCount.value!=='' && (!Number.isInteger(stageCount.value) || stageCount.value<1 || stageCount.value>2147483647)){
    validationError.value='Количество этапов должно быть целым положительным числом.';return;
  }
  const stageNumbers=workRows.value.map(w=>workStages.value[w.key] ?? 1);
  if(stageNumbers.some(n=>typeof n!=='number' || !Number.isInteger(n) || n<1 || n>effectiveStageCount.value)){
    validationError.value='Укажите каждой работе этап в пределах количества этапов объекта.';activeTab.value='works';return;
  }
  const fields = {
    clientKey: form.clientKey,
    version: form.version,
    ...(c?{taskStages:existingWorks.value.filter(t=>(workStages.value['task:'+t.id] ?? 1)!==(t.uptsWorkMeta?.stageNumber ?? 1)).map(t=>({id:t.id,version:t.version,stageNumber:workStages.value['task:'+t.id] ?? 1}))}:{}),
    number: form.number,
    name: c ? form.name : (details.value.sourceCadastralNumber?.trim() || form.number.trim()),
    counterparty: form.counterparty,
    contractType: form.contractType,
    objectDetails:{...details.value,
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
  const source=JSON.stringify({fields,templateId:templateId.value,manual:manualNames.value,stageNumbers});
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
          templateId: templateId.value,
          templateVersion: template.value?.version ?? null,
          manualWorks: templateId.value
            ? []
            : manual.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
        },
  );
  if (result) emit("saved", result);
}
</script>
<template>
  <Modal full-height :title="c ? 'Объект ' + (details.sourceCadastralNumber || c.number) : 'Новый объект'" @close="emit('close')">
    <form class="work-form upts-object-form" @submit.prevent="save" @invalid.capture="revealInvalid">
      <fieldset class="upts-object-general" :disabled="saving" aria-label="Общая информация по объекту">
        <legend>Общая информация по объекту</legend>
        <div class="upts-object-general-grid">
          <label>Номер договора<input v-model="details.basisContractNumber" maxlength="250" /></label>
          <label>Дата начала работ<input v-model="details.workStartDate" type="date" min="1900-01-01" max="2200-12-31" /></label>
          <label>Дата окончания работ<input v-model="form.dueDate" type="date" :min="details.workStartDate || '1900-01-01'" max="2200-12-31" /></label>
          <label v-for="role in objectRoles" :key="role.key">{{ role.label }}<select v-model="details[role.key]" :disabled="staffLoading || !!staffError"><option :value="null">Не назначен</option><option v-if="details[role.key] && !staff.some(p=>p.id===details[role.key])" :value="details[role.key]">{{ retainedPerson(details[role.key]!) }} (сохранённое назначение)</option><option v-for="p in staff" :key="p.id" :value="p.id">{{ workUserName(p) }}</option></select></label>
          <label>Количество этапов<input v-model.number="stageCount" type="number" min="1" max="2147483647" step="1" inputmode="numeric" /></label>
        </div>
        <p v-if="staffLoading" class="work-muted" role="status">Загружаем сотрудников УПТС…</p>
        <p v-if="staffError" class="work-error" role="alert">{{ staffError }} <button type="button" @click="loadStaff">Повторить</button></p>
      </fieldset>
      <div class="upts-form-tabs" role="tablist" aria-label="Карточка объекта">
        <button v-for="(tab,i) in tabs" :id="'upts-tab-'+tab.key" :key="tab.key" type="button" role="tab" :aria-selected="activeTab===tab.key" :aria-controls="tab.key==='characteristics'?'upts-characteristics':'upts-object-works'" :tabindex="activeTab===tab.key?0:-1" @click="activeTab=tab.key" @keydown="tabKey($event,i)"><Icon :name="tab.icon" /><span>{{ tab.label }}</span></button>
      </div>
      <p v-if="validationError || error" class="work-error" role="alert">{{ validationError || error }}</p>
      <fieldset :disabled="saving">
        <div id="upts-characteristics" v-show="activeTab==='characteristics'" role="tabpanel" aria-labelledby="upts-tab-characteristics">
          <ObjectFields v-model="details" v-model:object-type="form.contractType" v-model:number="form.number" :roads="roads" :stages="stages" />
        </div>
        <div id="upts-object-works" v-show="activeTab==='works'" role="tabpanel" aria-labelledby="upts-tab-works" class="upts-works-fields">
          <label v-if="form.contractType!=='OTHER'">Вид работ<select v-model="details.workKindKey"><option :value="null">Не выбран</option><option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.name }}</option></select></label>
          <label v-else>Описание деятельности<textarea v-model="details.otherDescription" rows="3" maxlength="2000" /></label>
          <template v-if="!c">
            <p v-if="loading" role="status">Загружаем библиотеку…</p>
            <p v-if="libraryError" class="work-error" role="alert">{{ libraryError }} <button type="button" @click="load">Повторить</button></p>
            <label v-if="form.contractType!=='OTHER'">Шаблон работ<select v-model="templateId"><option :value="null">Без начального набора</option><option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option></select></label>

            <label v-if="form.contractType==='OTHER'">Работы — одна строка на работу<textarea v-model="manual" rows="4" maxlength="12550" /></label>
            <p v-if="form.contractType!=='OTHER' && !details.workKindKey" class="work-muted">Выберите вид работ, чтобы увидеть его шаблоны.</p>
          </template>
          <template v-else>
            <p v-if="worksLoading" role="status">Загружаем работы объекта…</p>
            <p v-if="worksError" class="work-error" role="alert">{{ worksError }} <button type="button" @click="loadStageWorks">Повторить</button></p>
            <p v-if="!worksLoading && !worksError && !existingWorks.length" class="work-muted">Работ пока нет.</p>
            <p class="work-muted">Изменение вида работ не заменяет существующие работы. Добавление доступно кнопкой «+ Работа» в карточке объекта.</p>
          </template>
          <WorkStagesTable v-if="workRows.length" v-model="workStages" :works="workRows" :stage-count="effectiveStageCount" />
        </div>
      </fieldset>
      <div class="work-actions upts-object-form-actions"><button class="work-primary" :disabled="saving || loading || worksLoading || !!worksError || (!c && !!libraryError)">{{ saving?'Сохранение…':'Сохранить' }}</button><button type="button" @click="emit('close')">Отмена</button></div>
    </form>
  </Modal>
</template>
<style scoped>
.upts-object-form{min-height:100%;display:flex;flex-direction:column}.upts-object-form .upts-object-form-actions{margin-top:auto}
.upts-object-form .upts-object-general{border:1px solid var(--work-line);border-radius:8px;padding:12px;margin:0 0 16px;min-width:0;background:var(--work-panel)}.upts-object-general legend{padding:0 6px;font-size:13px;font-weight:600;color:var(--work-text)}.upts-object-general-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.upts-object-general-grid label{min-width:0;font-size:12px;color:var(--work-muted)}.upts-object-general-grid :is(input,select){min-width:0;width:100%;color:var(--work-text)}.upts-object-general p{margin:8px 0 0}
@media(max-width:600px){.upts-object-general-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:400px){.upts-object-general-grid{grid-template-columns:1fr}}
.upts-form-tabs{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:4px;background:var(--space-bg,#f1f5f9);border-radius:8px;margin-bottom:12px}.upts-form-tabs button{display:flex;align-items:center;justify-content:center;gap:8px;padding:11px 8px;min-width:0;font-size:16px;font-weight:400;background:transparent;color:var(--work-muted);border:1px solid var(--work-line);border-radius:6px;line-height:1.3}.upts-form-tabs button[aria-selected=true]{background:#ffedd5;color:#172338;border-color:#fed7aa;box-shadow:0 1px 3px #0000000d}.upts-form-tabs button .iconify{flex-shrink:0;font-size:20px}.upts-works-fields{display:grid;gap:12px}.upts-existing-works{list-style:none;margin:0;padding:0}.upts-existing-works li{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--work-line)}.upts-existing-works small{color:var(--work-muted)}.upts-object-form-actions{position:sticky;bottom:-20px;background:var(--work-panel);border-top:1px solid var(--work-line);padding:12px 0;margin-top:12px;z-index:1}
:global(html.dark) .upts-form-tabs{background:var(--space-graphite-panel,#344757)}:global(html.dark) .upts-form-tabs button[aria-selected=true]{background:var(--space-graphite-selected,#36526c);color:#e9f2ff;border-color:#587aa6;box-shadow:inset 0 -2px 0 var(--space-graphite-accent,#93c5fd)}
@media(max-width:520px){.upts-form-tabs{gap:6px}.upts-form-tabs button{font-size:13px;padding:9px 5px}.upts-object-form-actions{bottom:-16px}}
</style>
