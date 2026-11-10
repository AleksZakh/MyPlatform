<script setup lang="ts">
import WorkName from './WorkName.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { workKindsFor } from '~~/shared/utils/upts-work-kinds';
import WorkStagesTable from './WorkStagesTable.vue';
import type {UptsStageWork} from '~~/shared/types/upts-object';
import Modal from '../work/Modal.vue';
import type { UptsContractDTO } from '~~/shared/types/upts';
import { UPTS_CONTRACT_TYPES, type UptsLibrary } from '~~/shared/types/upts-library';
const props = defineProps<{ contract: UptsContractDTO }>();
const emit = defineEmits<{ close: []; saved: [] }>();
const { send, saving, error } = useWorkApi();
const lib = ref<UptsLibrary | null>(null), templateId = ref<number | null>(null);
const mode = ref<'library' | 'template' | 'manual'>(props.contract.contractType==='OTHER'?'manual':'library');
const workKindKey=ref<string|null>(props.contract.objectDetails?.workKindKey || null);
const kinds=computed(()=>workKindsFor(props.contract.contractType));
const selectedIds = ref<number[]>([]), query = ref(''), manual = ref('');
const loading = ref(true), loadError = ref('');
const works = computed(() => lib.value?.works.filter(w => w.active && w.contractType === props.contract.contractType) || []);
const filteredWorks = computed(() => works.value.filter(w => w.name.toLocaleLowerCase('ru-RU').includes(query.value.trim().toLocaleLowerCase('ru-RU'))));
const selected = computed(() => selectedIds.value.map(id => works.value.find(w => w.id === id)).filter((w): w is NonNullable<typeof w> => !!w));
const templates = computed(() => lib.value?.templates.filter(t => (!workKindKey.value || t.workKindKey===workKindKey.value) && t.active && t.contractType === props.contract.contractType && t.items.every(i => i.work.active)) || []);
const chosen = computed(() => templates.value.find(t => t.id === templateId.value));
const count = computed(() => mode.value === 'library' ? selected.value.length : mode.value === 'template' ? chosen.value?.items.length || 0 : manual.value.trim() ? 1 : 0);
const canApply = computed(() => !!props.contract.contractType && !saving.value && !loading.value && !loadError.value && count.value > 0 && count.value <= 50);
const stageCount=computed(()=>props.contract.objectDetails?.stageCount ?? 1);
const workStages=ref<Record<string,number|''>>({});
const workRows=computed<UptsStageWork[]>(()=>mode.value==='manual'
 ? (manual.value.trim()?[{key:'manual',name:manual.value.trim()}]:[])
 : (mode.value==='template'?chosen.value?.items.map(i=>i.work) || []:selected.value).map(w=>({key:'definition:'+w.id,...w,workKindKey:mode.value==='template'?chosen.value?.workKindKey:workKindKey.value})));
const stagesValid=computed(()=>workRows.value.every(w=>{const n=workStages.value[w.key] ?? 1;return typeof n==='number' && Number.isInteger(n) && n>=1 && n<=stageCount.value;}));
let attempt: { source: string; key: string } | null = null;
async function load() {
  loading.value = true; loadError.value = '';
  try {
    lib.value = await $fetch<UptsLibrary>('/api/upts/library');
    templateId.value = templates.value[0]?.id ?? null;
    selectedIds.value = [];
  } catch { loadError.value = 'Не удалось загрузить библиотеку работ.'; }
  finally { loading.value = false; }
}
watch(workKindKey,()=>{templateId.value=templates.value[0]?.id ?? null;});
onMounted(load);
async function apply() {
  if (!canApply.value || !stagesValid.value) return;
  const body = {
    contractVersion: props.contract.version,
    workStages:workRows.value.map(w=>workStages.value[w.key] ?? 1),
    workKindKey:workKindKey.value,
    templateId: mode.value === 'template' ? templateId.value : null,
    templateVersion: mode.value === 'template' ? chosen.value?.version ?? null : null,
    manualWorks: mode.value === 'manual' ? [manual.value.trim()] : [],
    ...(mode.value === 'library' ? { selectedWorks: selected.value.map(w => ({ id: w.id, version: w.version })) } : {}),
  };
  const source = JSON.stringify(body);
  if (!attempt || attempt.source !== source) attempt = { source, key: crypto.randomUUID() };
  if (await send(`/api/upts/contracts/${props.contract.id}/works`, 'POST', { ...body, clientKey: attempt.key })) emit('saved');
}
</script>
<template>
  <Modal title="Добавить работы в объект" @close="emit('close')">
    <form class="work-form" @submit.prevent="apply">
      <strong>{{ contract.number }} · {{ contract.name }}</strong>
      <p>{{ contract.contractType ? UPTS_CONTRACT_TYPES[contract.contractType] : 'Сначала укажите тип объекта в карточке.' }}</p>
      <p v-if="error || loadError" role="alert" class="work-error">
        {{ error || loadError }}
        <button v-if="loadError" type="button" :disabled="loading" @click="load">Повторить</button>
      </p>
      <p v-if="loading" role="status">Загружаем библиотеку…</p>
      <fieldset :disabled="saving || loading || !contract.contractType">
        <label v-if="contract.contractType!=='OTHER'">Вид работ<select v-model="workKindKey"><option :value="null">Все виды работ</option><option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.name }}</option></select></label>
        <div v-if="contract.contractType!=='OTHER'" class="work-view-switch" role="group" aria-label="Способ добавления работ">
          <button type="button" :aria-pressed="mode === 'library'" @click="mode = 'library'">Из библиотеки</button>
          <button type="button" :aria-pressed="mode === 'template'" @click="mode = 'template'">По шаблону</button>
          <button type="button" :aria-pressed="mode === 'manual'" @click="mode = 'manual'">Своя работа</button>
        </div>
        <template v-if="mode === 'library'">
          <label>Поиск работы<input v-model="query" type="search" placeholder="Название работы" /></label>
          <div v-if="filteredWorks.length" class="upts-work-choices" role="group" aria-label="Работы из библиотеки">
            <label v-for="w in filteredWorks" :key="w.id" class="work-check">
              <input v-model="selectedIds" type="checkbox" :value="w.id" :disabled="selectedIds.length >= 50 && !selectedIds.includes(w.id)" />
              <WorkName :meta="{workKindKey}" emphasize>{{ w.name }}</WorkName>
            </label>
          </div>
          <p v-else class="work-muted">{{ works.length ? 'По вашему запросу ничего не найдено.' : 'Для этого типа объекта пока нет активных работ. Можно добавить свою работу или создать запись в библиотеке.' }}</p>
          <p class="work-muted">Можно выбрать одну или несколько работ своего типа объекта, независимо от шаблонов.</p>
          <div v-if="selected.length">
            <strong>Выбрано: {{ selected.length }}</strong>
            <ul class="upts-work-selected"><li v-for="w in selected" :key="w.id"><WorkName :meta="{workKindKey}" emphasize>{{ w.name }}</WorkName> <button type="button" :aria-label="'Убрать из выбора: ' + w.name" @click="selectedIds = selectedIds.filter(id => id !== w.id)">×</button></li></ul>

          </div>
        </template>
        <template v-else-if="mode === 'template'">
          <label>Шаблон<select v-model="templateId"><option :value="null">Выберите шаблон</option><option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }}</option></select></label>

          <p v-if="!templates.length" class="work-muted">Для этого типа объекта нет активных шаблонов.</p>
        </template>
        <template v-else>
          <label>Название работы<input v-model="manual" required maxlength="250" placeholder="Введите название отдельной работы" /></label>
          <p class="work-muted">Работа будет добавлена только в этот объект. Библиотека и шаблоны не изменятся.</p>
        </template>
        <WorkStagesTable v-if="workRows.length" v-model="workStages" :works="workRows" :stage-count="stageCount" />
        <p class="work-muted">Будут созданы новые работы без исполнителей и сроков. Существующие работы сохранятся. Повторное добавление из нового окна создаст новые записи.</p>
      </fieldset>
      <div class="work-actions">
        <button class="work-primary" :disabled="!canApply || !stagesValid">{{ saving ? 'Добавление…' : count === 1 ? 'Добавить работу' : count ? `Добавить работы (${count})` : 'Добавить работы' }}</button>
        <button type="button" @click="emit('close')">Отмена</button>
      </div>
    </form>
  </Modal>
</template>
<style scoped>
.upts-work-choices {max-height:240px;overflow:auto;border:1px solid var(--work-line);border-radius:8px;padding:8px;display:grid;gap:4px}
.upts-work-choices label {padding:7px;align-items:flex-start;overflow-wrap:anywhere}
.upts-work-choices input {margin-top:3px;flex-shrink:0}
.upts-work-selected {max-height:160px;overflow:auto;margin:8px 0;padding-left:20px}
.upts-work-selected li {overflow-wrap:anywhere;padding:3px 0}
.upts-work-selected button {margin-left:6px;padding:0 7px}
</style>
