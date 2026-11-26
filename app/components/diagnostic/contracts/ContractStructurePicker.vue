<script setup lang="ts">
import {computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue';
import type {StructureCatalog, StructureListResponse, StructureListRow} from '~~/shared/types/diagnostic-structures-api';
import type {ContractSelection, WorkTemplate} from '~~/shared/types/diagnostic-templates';
import {structureRangeError} from '~~/shared/utils/diagnostic-structures';

const props = defineProps<{
  manual:boolean;
  number:string;
  stageLimit:number|null;
  existing:ReadonlyMap<number,number>;
  assigned:ReadonlyMap<number,number>;
  applied:ContractSelection[];
}>();
const emit = defineEmits<{close:[]; apply:[groups:ContractSelection[]]}>();

const catalog = ref<StructureCatalog>();
const templates = ref<WorkTemplate[]>([]);
const choice = ref<number|null>(null);
const template = computed(() => templates.value.find(item => item.id === choice.value));
const optionsError = ref('');
async function loadOptions() {
  optionsError.value = '';
  try {
    const [options, available] = await Promise.all([
      $fetch<StructureCatalog>('/api/diagnostic/structures/catalog'),
      props.manual ? [] : $fetch<WorkTemplate[]>('/api/diagnostic/templates')
    ]);
    catalog.value = options;
    templates.value = available.filter(item => item.category === 'structure');
  } catch {
    optionsError.value = 'Не удалось загрузить справочники.';
  }
}
onMounted(loadOptions);

const emptyFilters = () => ({road:'', locationFrom:'', locationTo:'', kind:'', code:'', management:'', regions:''});
const filters = reactive(emptyFilters());
const query = computed(() => {
  const end = filters.locationTo.trim();
  return {...filters, locationTo:/^\d{1,7}$/.test(end) ? end + '+999' : end};
});
const rangeError = computed(() => structureRangeError(query.value));
const hasFilters = computed(() => Object.values(filters).some(Boolean));
const page = ref(1);
const retry = ref(0);
const result = ref<StructureListResponse>();
const loadError = ref('');
const selected = ref(new Map<string,StructureListRow>());
const groups = ref<ContractSelection[]>([]);
const stage = ref<string|number>(props.assigned.size ? '' : 1);
const stageInput = ref<HTMLInputElement|HTMLSelectElement|null>(null);
const stageError = ref('');
const bulkError = ref('');
const selectingAll = ref(false);
let bulkRequest:AbortController|undefined;
function resetSelection() {
  bulkRequest?.abort();
  selected.value.clear();
  bulkError.value = '';
  stageError.value = '';
}
watch([query, choice], () => {
  page.value = 1;
  resetSelection();
}, {flush:'sync'});
const enabled = computed(() => !!catalog.value && (props.manual || !!template.value));
watch([query, page, retry, enabled], ([params, currentPage, , show], _, cleanup) => {
  result.value = undefined;
  loadError.value = '';
  if (!show || rangeError.value) return;
  const request = new AbortController();
  const timer = setTimeout(async () => {
    try {
      const response = await fetchPage(params, currentPage, request.signal);
      if (request.signal.aborted) return;
      if (response.page !== currentPage) page.value = response.page;
      else result.value = response;
    } catch {
      if (!request.signal.aborted) loadError.value = 'Не удалось загрузить сооружения.';
    }
  }, 150);
  cleanup(() => {clearTimeout(timer); request.abort();});
}, {immediate:true});
function fetchPage(params:ReturnType<typeof emptyFilters>, currentPage:number, signal:AbortSignal) {
  return $fetch<StructureListResponse>('/api/diagnostic/structures', {
    query:{...params, page:currentPage, pageSize:100, sortKey:'location'}, signal
  });
}

const known = computed(() => {
  const stages = new Map(props.assigned);
  for (const group of groups.value) {
    for (const row of group.structures) {
      const id = Number(row.id);
      if (!stages.has(id)) stages.set(id, group.structureStages?.[id] ?? 1);
    }
  }
  return stages;
});
const blocked = computed(() => {
  if (props.manual) return new Set(known.value.keys());
  const ids = new Set<number>();
  for (const group of [...props.applied, ...groups.value]) {
    if (group.template?.id === choice.value) group.structures.forEach(row => ids.add(Number(row.id)));
  }
  return ids;
});
const selectable = computed(() => result.value?.items.filter(row => !blocked.value.has(Number(row.id))) ?? []);
const markedOnPage = computed(() => selectable.value.filter(row => selected.value.has(row.id)).length);
function mark(rows:StructureListRow[], checked:boolean) {
  for (const row of rows) {
    if (checked) selected.value.set(row.id, row);
    else selected.value.delete(row.id);
  }
  stageError.value = '';
}
async function selectAllMatches() {
  const first = result.value;
  if (!first || selectingAll.value) return;
  const request = new AbortController();
  bulkRequest = request;
  selectingAll.value = true;
  bulkError.value = '';
  const params = query.value;
  try {
    const rows = new Map<string,StructureListRow>();
    for (let p = 1; p <= first.pageCount; p++) {
      const data = p === first.page ? first : await fetchPage(params, p, request.signal);
      if (request.signal.aborted) return;
      if (data.matched !== first.matched || data.page !== p) throw Error();
      for (const row of data.items) rows.set(row.id, row);
    }
    if (rows.size !== first.matched) throw Error();
    mark([...rows.values()].filter(row => !blocked.value.has(Number(row.id))), true);
  } catch {
    if (!request.signal.aborted) bulkError.value = 'Не удалось выбрать все найденные сооружения. Обновите список и повторите выбор.';
  } finally {
    selectingAll.value = false;
  }
}
onBeforeUnmount(() => bulkRequest?.abort());

const needsStage = computed(() => [...selected.value.keys()].some(id => !known.value.has(Number(id))));
const maxStage = computed(() => props.stageLimit ?? 2147483647);
function addGroup() {
  if (!enabled.value || !selected.value.size || selectingAll.value) return false;
  const value = Number(stage.value);
  if (needsStage.value && (!Number.isInteger(value) || value < 1 || value > maxStage.value)) {
    stageError.value = stage.value === '' ? 'К какому этапу отнести эти сооружения?'
      : 'Укажите целый номер этапа от 1 до ' + maxStage.value + '.';
    nextTick(() => stageInput.value?.focus());
    return false;
  }
  const structures = [...selected.value.values()];
  const structureStages:Record<number,number> = {};
  for (const row of structures) {
    const id = Number(row.id);
    if (!props.existing.has(id)) structureStages[id] = known.value.get(id) ?? value;
  }
  const t = template.value;
  groups.value.push({structures, structureStages, works:t?.items ?? [],
    template:t ? {id:t.id, version:t.version, name:t.name} : undefined});
  selected.value.clear();
  stage.value = '';
  stageError.value = '';
  return true;
}
function apply() {
  if (selectingAll.value || (selected.value.size && !addGroup())) return;
  if (groups.value.length) emit('apply', groups.value);
}
function groupStages(group:ContractSelection) {
  const stages = new Set(group.structures.map(row => props.assigned.get(Number(row.id)) ?? group.structureStages?.[Number(row.id)]));
  return [...stages].sort((a,b) => (a ?? 0) - (b ?? 0)).join(', ');
}
</script>

<template>
  <UModal open :title="manual ? 'Добавить сооружения' : 'Применить шаблон к сооружениям'" :description="number || 'Новый договор'"
    :ui="{content:'diagnostic-contract-modal odis-picker structure-picker sm:max-w-none',header:'contract-modal-header',body:'structure-picker-body',footer:'contract-modal-footer'}"
    @update:open="v => {if (!v) emit('close')}">
    <template #body>
      <p v-if="optionsError" role="alert">{{ optionsError }} <button type="button" @click="loadOptions">Повторить</button></p>
      <p v-else-if="!catalog" role="status">Загрузка справочников…</p>
      <template v-else>
        <label v-if="!manual" class="sp-field">Шаблон работ
          <select v-model="choice"><option :value="null">Выберите шаблон</option>
            <option v-for="item in templates" :key="item.id" :value="item.id" :disabled="!!item.unavailable">
              {{ item.name }}{{ item.unavailable ? ' (изменён состав библиотеки)' : '' }}
            </option>
          </select>
        </label>
        <p v-if="!manual && !templates.length" role="status">Для сооружений пока нет шаблонов.</p>
        <details v-if="template" class="sp-preview"><summary>Работы шаблона ({{ template.items.length }})</summary>
          <ul><li v-for="work in template.items" :key="work.id">{{ work.code }} · {{ work.name }}</li></ul>
        </details>
        <template v-if="enabled">
          <div class="sp-filters" role="group" aria-label="Фильтр сооружений">
            <label class="sp-field">Название А/Д<select v-model="filters.road"><option value="">Все дороги</option><option v-for="road in catalog.roads" :key="road">{{ road }}</option></select></label>
            <fieldset class="sp-range"><legend>Место, км</legend>
              <input v-model="filters.locationFrom" aria-label="От километра" placeholder="От" maxlength="30"/>
              <span>–</span><input v-model="filters.locationTo" aria-label="До километра" placeholder="До" maxlength="30" title="199 — по 199+999 включительно. Для точной границы укажите км+м."/>
            </fieldset>
            <label class="sp-field">Сооружение<select v-model="filters.kind"><option value="">Все виды</option><option v-for="kind in catalog.kinds" :key="kind">{{ kind }}</option></select></label>
            <label class="sp-field">Код ИССО<input v-model="filters.code" type="search" maxlength="200" placeholder="Код или его часть"/></label>
            <label class="sp-field">Управление<select v-model="filters.management"><option value="">Все управления</option><option v-for="name in catalog.management" :key="name">{{ name }}</option></select></label>
            <label class="sp-field">Регион расположения<select v-model="filters.regions"><option value="">Все регионы</option><option v-for="region in catalog.regions" :key="region">{{ region }}</option></select></label>
          </div>
          <div class="sp-toolbar">
            <span role="status">Найдено: {{ result?.matched ?? '…' }} · Выбрано: {{ selected.size }}</span>
            <button type="button" :disabled="!hasFilters" @click="Object.assign(filters, emptyFilters())">Очистить фильтры</button>
            <button v-if="result && result.pageCount > 1" type="button" :disabled="selectingAll" @click="selectAllMatches">{{ selectingAll ? 'Идёт выбор…' : 'Выбрать все найденные' }}</button>
          </div>
          <p v-if="rangeError" role="alert">{{ rangeError }}</p>
          <p v-else-if="loadError" role="alert">{{ loadError }} <button type="button" @click="retry++">Повторить</button></p>
          <p v-else-if="!result" role="status">Загрузка сооружений…</p>
          <template v-else>
            <div class="sp-table"><table aria-label="Доступные сооружения">
              <thead><tr>
                <th><input type="checkbox" aria-label="Выбрать все доступные на странице" :checked="!!selectable.length && markedOnPage === selectable.length"
                  :indeterminate="markedOnPage > 0 && markedOnPage < selectable.length" :disabled="!selectable.length || selectingAll"
                  @change="mark(selectable, ($event.target as HTMLInputElement).checked)"/></th>
                <th>Код ИССО</th><th>Название А/Д</th><th>Место, км</th><th>Сооружение</th><th>Управление</th><th>Регион расположения</th><th>Этап</th>
              </tr></thead>
              <tbody>
                <tr v-for="row in result.items" :key="row.id" :class="{'sp-marked':selected.has(row.id)}">
                  <td><input type="checkbox" :aria-label="'Выбрать сооружение '+row.issoCode" :checked="selected.has(row.id)" :disabled="selectingAll || blocked.has(Number(row.id))"
                    @change="mark([row], ($event.target as HTMLInputElement).checked)"/></td>
                  <td>{{ row.issoCode }}</td><td>{{ row.roadName }}</td><td>{{ row.location }}</td><td>{{ row.structureName }}</td>
                  <td>{{ row.management || '—' }}</td><td>{{ row.region || '—' }}</td><td>{{ known.get(Number(row.id)) ?? '—' }}</td>
                </tr>
                <tr v-if="!result.items.length"><td colspan="8">По заданным фильтрам сооружения не найдены.</td></tr>
              </tbody>
            </table></div>
            <div v-if="result.pageCount > 1" class="sp-pages">
              <button type="button" :disabled="page===1 || selectingAll" @click="page--">Назад</button>
              <span>{{ page }} / {{ result.pageCount }}</span>
              <button type="button" :disabled="page>=result.pageCount || selectingAll" @click="page++">Далее</button>
            </div>
          </template>
          <p v-if="bulkError" role="alert">{{ bulkError }} <button type="button" @click="retry++; bulkError=''">Обновить</button></p>
        </template>
      </template>
      <ul v-if="groups.length" class="sp-groups" aria-label="Группы к добавлению">
        <li v-for="(group,i) in groups" :key="i">Этап: {{ groupStages(group) }} · Сооружений: {{ group.structures.length }}<span v-if="group.template"> · {{ group.template.name }}</span>
          <button type="button" @click="groups.splice(i,1)">Убрать</button>
        </li>
      </ul>
    </template>
    <template #footer>
      <div class="sp-footer">
        <p v-if="!manual && [...selected.keys()].some(id => known.has(Number(id)))" class="sp-note">У сооружений, уже добавленных в договор, сохранятся их этапы.</p>
        <p v-if="stageError" role="alert">{{ stageError }}</p>
        <label v-if="enabled" class="sp-stage">Этап
          <select v-if="stageLimit !== null && stageLimit >= 1 && stageLimit <= 100" ref="stageInput" v-model="stage"
            aria-label="Этап группы" :disabled="selected.size>0 && !needsStage" @change="stageError=''">
            <option value="">Выберите этап</option><option v-for="n in Math.floor(stageLimit)" :key="n" :value="n">{{ n }}</option>
          </select>
          <input v-else ref="stageInput" v-model="stage" type="number" min="1" :max="maxStage" step="1" aria-label="Этап группы"
            placeholder="Номер этапа" :disabled="selected.size>0 && !needsStage" @input="stageError=''"/>
        </label>
        <button v-if="enabled" type="button" :disabled="!selected.size || selectingAll" @click="addGroup">Добавить в договор</button>
        <div class="sp-finish"><button type="button" @click="emit('close')">Отмена</button>
          <button class="primary" type="button" :disabled="(!groups.length && !selected.size) || selectingAll" @click="apply">Применить</button>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style>
.diagnostic-contract-modal.structure-picker{width:min(96vw,90rem);max-height:92dvh}
.structure-picker .structure-picker-body{display:flex;flex-direction:column;gap:10px;padding:14px 18px!important;overflow:auto;min-height:0}
.structure-picker .sp-filters{display:grid;grid-template-columns:2fr minmax(10rem,1fr) 1.4fr;gap:8px 16px}
.structure-picker .sp-field{display:grid;gap:3px;min-width:0}
.structure-picker .sp-range{min-width:0;display:flex;align-items:center;gap:5px;margin:0;padding:0;border:0}
.structure-picker .sp-range legend{padding:0;margin-bottom:3px}
.structure-picker :is(.sp-field,.sp-range,.sp-stage){font-size:.85rem;font-weight:500}
.structure-picker :is(.sp-field,.sp-range,.sp-stage) :is(input,select){min-width:0;width:100%;border:1px solid var(--contract-line);border-radius:4px;padding:5px 8px;background:var(--contract-field);color:var(--contract-text);font-weight:400;height:2.1rem}
.structure-picker :is(.sp-toolbar,.sp-finish,.sp-footer,.sp-stage,.sp-pages){display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.structure-picker .sp-toolbar{font-size:.85rem}.structure-picker .sp-toolbar>span{margin-right:auto}
.structure-picker :is(.sp-toolbar,.sp-footer,.sp-pages,.sp-groups) button,.structure-picker [role=alert] button{border:1px solid var(--contract-line);background:var(--contract-field);color:var(--contract-text);border-radius:4px;padding:5px 10px}
.structure-picker .sp-table{min-height:7rem;max-height:47dvh;overflow:auto;border:1px solid var(--contract-line);border-radius:4px}
.structure-picker table{border-collapse:separate;border-spacing:0;width:100%;font-size:.82rem;text-align:left;background:var(--contract-field)}
.structure-picker :is(td,th){padding:5px 8px;border-bottom:1px solid var(--contract-line);vertical-align:middle}
.structure-picker th{position:sticky;top:0;z-index:1;background:var(--contract-panel);white-space:nowrap}
.structure-picker td:nth-child(4){white-space:nowrap}
.structure-picker input[type=checkbox]{accent-color:#187594}.structure-picker .sp-marked{background:var(--contract-panel)}
.structure-picker .sp-pages,.structure-picker .sp-finish{justify-content:flex-end}
.structure-picker .sp-preview ul,.structure-picker .sp-groups{max-height:12dvh;overflow:auto}
.structure-picker .sp-groups{flex-shrink:0;font-size:.85rem}.structure-picker .sp-groups li{padding:3px 0}.structure-picker .sp-groups button{margin-left:8px;padding:2px 8px}
.structure-picker .sp-footer{width:100%}.structure-picker .sp-stage :is(input,select){width:9rem}
.structure-picker .sp-footer>p{width:100%}.structure-picker [role=alert]{color:var(--ui-error)}
.structure-picker .sp-finish{margin-left:auto}.structure-picker .sp-finish .primary{color:#fff;background:#176b88;border-color:#176b88}
@media(max-width:820px){.structure-picker .sp-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.structure-picker .sp-table{flex:none}}
@media(max-width:500px){.structure-picker .sp-filters{grid-template-columns:minmax(0,1fr)}.structure-picker .sp-finish{width:100%}}
</style>
