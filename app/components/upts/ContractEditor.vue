<script setup lang="ts">
import { reactive, ref, computed, onMounted, watch } from "vue";
import { UPTS_VISIBILITY, workUserName, type WorkUser } from '~~/shared/types/work';
import ObjectFields from './ObjectFields.vue';
import WorkSetPreview from './WorkSetPreview.vue';
import { workKindsFor } from '~~/shared/utils/upts-work-kinds';
import type { UptsObjectDetails } from '~~/shared/types/upts-object';
import Modal from "../work/Modal.vue";
import type { UptsContractDTO, UptsProjectDTO } from "~~/shared/types/upts";
import {
  UPTS_CONTRACT_TYPES,
  type UptsLibrary,
  type UptsContractType,
} from "~~/shared/types/upts-library";
import { dateKey } from "~~/shared/utils/work-board";
const props = defineProps<{
  projectId?: number | null;
  projects: UptsProjectDTO[];
  contract: UptsContractDTO | null;
}>();
const emit = defineEmits<{ close: []; saved: [contract: UptsContractDTO] }>();
const { send, error, saving } = useWorkApi();
const c = props.contract;
const details = ref<UptsObjectDetails>({curatorId:null,engineerId:null,workKindKey:null,kuvdEntries:[],...structuredClone(c?.objectDetails || {})});
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
  visibility: "UPTS_DEPARTMENT" as keyof typeof UPTS_VISIBILITY,
  memberIds: [] as number[],
});
const staff=ref<WorkUser[]>([]), staffLoading=ref(false), staffError=ref(''), staffQuery=ref('');
const visibleStaff=computed(()=>staff.value.filter(u=>(workUserName(u)+' '+(u.login||'')).toLocaleLowerCase('ru-RU').includes(staffQuery.value.toLocaleLowerCase('ru-RU'))));
async function loadStaff(){staffLoading.value=true;staffError.value='';try{staff.value=await $fetch<WorkUser[]>('/api/upts/people');}catch{staffError.value='Не удалось загрузить состав УПТС. Повторите загрузку.';}finally{staffLoading.value=false;}}
watch(()=>form.visibility,v=>{if(v==='TEAM')loadStaff();else form.memberIds=[];});
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
  if (!c) load();
});
async function save() {
  const fields = {
    clientKey: form.clientKey,
    version: form.version,
    number: form.number,
    name: form.name,
    counterparty: form.counterparty,
    contractType: form.contractType,
    objectDetails:{...details.value,
      rightHolders:details.value.rightHolders?.map(v=>v.trim()).filter(Boolean),
      permittedUses:details.value.permittedUses?.map(v=>v.trim()).filter(Boolean),
      kuvdEntries:details.value.kuvdEntries?.filter(v=>v.number.trim() || v.date).map(v=>({...v,date:v.date || null})),
    },
    signedDate: form.signedDate || null,
    dueDate: form.dueDate || null,
  };
  const result = await send<UptsContractDTO>(
    c
      ? `/api/upts/projects/${c.projectId}/contracts/${c.id}`
      : "/api/upts/contracts",
    c ? "PUT" : "POST",
    c
      ? fields
      : {
          ...fields,
          projectId: null,
          visibility: form.visibility,
          memberIds: form.visibility==='TEAM'?form.memberIds:[],
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
  <Modal
    :title="c ? 'Объект ' + c.number : 'Новый объект'"
    @close="emit('close')"
    ><form class="work-form" @submit.prevent="save">
      <p v-if="error" class="work-error" role="alert">{{ error }}</p>
      <fieldset :disabled="saving">
        <label
          >Условный номер<input v-model="form.number" required maxlength="100"
        /></label>
        <label
          >Наименование<input v-model="form.name" required maxlength="250"
        /></label>
        <label
          >Тип объекта<select v-model="form.contractType" required>
            <option disabled value="">Выберите тип объекта</option>
            <option
              v-for="(name, key) in UPTS_CONTRACT_TYPES"
              :key="key"
              :value="key"
            >
              {{ name }}
            </option>
          </select></label
        >
        <label v-if="form.contractType !== 'OTHER'">Вид работ<select v-model="details.workKindKey"><option :value="null">Не выбран</option><option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.name }}</option></select></label>
        <label v-else>Описание деятельности<textarea v-model="details.otherDescription" rows="3" maxlength="2000" placeholder="Чем предстоит заниматься по этому объекту" /></label>
        <ObjectFields v-model="details" :staff="staff" :roads="roads" :stages="stages" />
        <p v-if="staffLoading" role="status">Загружаем сотрудников…</p>
        <p v-if="staffError" class="work-error" role="alert">{{ staffError }} <button type="button" @click="loadStaff">Повторить</button></p>
        <label>Срок выполнения работ<input v-model="form.dueDate" type="date" /></label>
        <details v-if="c && (form.counterparty || form.signedDate)"><summary>Ранее сохранённые реквизиты</summary><label>Контрагент<input v-model="form.counterparty" maxlength="250" /></label><label>Дата<input v-model="form.signedDate" type="date" /></label></details>
        <template v-if="!c">
          <label>Настройка видимости<select v-model="form.visibility">
            <option v-for="(label,key) in UPTS_VISIBILITY" :key="key" :value="key">{{ label }}</option>
          </select></label>
          <template v-if="form.visibility==='TEAM'">
            <label>Найти сотрудника<input v-model="staffQuery" type="search" placeholder="Имя или логин" /></label>
            <p v-if="staffLoading" role="status">Загружаем сотрудников…</p>
            <p v-if="staffError" class="work-error" role="alert">{{ staffError }} <button type="button" @click="loadStaff">Повторить</button></p>
            <div class="upts-member-choices" role="group" aria-label="Сотрудники, которым виден объект">
              <label v-for="u in visibleStaff" :key="u.id" class="work-check"><input v-model="form.memberIds" type="checkbox" :value="u.id" />{{ workUserName(u) }}</label>
            </div>
            <small>Выбрано: {{ form.memberIds.length }}</small>
          </template>
          <p class="work-muted">
            {{ form.visibility==='PRIVATE' ? 'Объект и работы видны только вам.' : form.visibility==='TEAM' ? 'Доступ получат вы и выбранные сотрудники.' : form.visibility==='UPTS_DEPARTMENT' ? 'Объект видят активные сотрудники подразделения и групп УПТС. Права редактирования задаются командой объекта.' : 'Объект видят все пользователи, допущенные к УПТС, включая администраторов. Доступ другим отделам не открывается.' }}
            Папка объекта создаётся автоматически.
          </p>
          <p v-if="loading" role="status">Загружаем библиотеку…</p>
          <p v-if="libraryError" role="alert">
            {{ libraryError }}
            <button type="button" @click="load">Повторить</button>
          </p>
          <label
            >Шаблон выбранного вида работ<select v-model="templateId">
              <option :value="null">
                {{
                  form.contractType === "OTHER"
                    ? "Заполнить вручную"
                    : "Без начального набора"
                }}
              </option>
              <option v-for="t in templates" :key="t.id" :value="t.id">
                {{ t.name }}
              </option>
            </select></label
          >
          <WorkSetPreview v-if="template" :works="template.items.map(i=>i.work)" />
          <p v-if="form.contractType!=='OTHER' && !details.workKindKey" class="work-muted">Выберите вид работ, чтобы увидеть его шаблоны. Отдельную работу можно добавить после создания объекта.</p>
          <label v-if="form.contractType === 'OTHER' && !templateId"
            >Работы — одна строка на работу<textarea
              v-model="manual"
              rows="5"
              maxlength="12550"
            />
          </label>
          <p class="work-muted">
            Работы появятся как задачи объекта без исполнителей и сроков. Их
            можно назначить после создания.
          </p>
        </template>
        <p v-else class="work-muted">
          Изменение типа объекта не заменяет существующие задачи. Примените
          подходящий набор отдельно после сохранения.
        </p>
      </fieldset>
      <div class="work-actions">
        <button
          class="work-primary"
          :disabled="saving || loading || (!c && (!!libraryError || (form.visibility==='TEAM' && (staffLoading || !!staffError || !form.memberIds.length))))"
        >
          Сохранить</button
        ><button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form></Modal
  >
</template>

<style scoped>
.upts-member-choices{max-height:200px;overflow:auto;border:1px solid var(--work-line);border-radius:7px;padding:8px}.upts-member-choices label{display:flex;flex-direction:row;gap:8px;align-items:center;padding:5px}
</style>
