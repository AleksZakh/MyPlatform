<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import {
  categoryNames,
  contractLabels,
  dateIssue,
  itemKey,
  isTravel,
  libraryRow,
  type Category,
  type PlanOptions,
  type PlanContract,
  type PlanStructure,
  type PlanRow,
  type TripDraft,
} from '~~/shared/utils/diagnostic-planning';
import { workStatusLegend } from '~~/shared/utils/diagnostic-contract-table';
import { structureLocationMetres } from '~~/shared/utils/diagnostic-structures';
import { tripDateLabel } from '~~/shared/utils/diagnostic-trips';
import WorkStatusIcon from '../contracts/WorkStatusIcon.vue';
import TripDateInput from '../trips/TripDateInput.vue';
const emit = defineEmits<{ close: []; saved: [number] }>();
const modal = ref<HTMLDialogElement>(),
  prompt = ref<HTMLDialogElement>(),
  library = ref<HTMLDialogElement>();
const options = ref<PlanOptions>(),
  contract = ref<PlanContract>(),
  employee = ref(0),
  start = ref(''),
  finish = ref('');
const category = ref<Category>('contract'),
  links = ref<PlanStructure[]>([]),
  selection = ref<number[]>([]),
  anchor = ref(0);
const kmFrom = ref(''),
  kmTo = ref(''),
  filters = ref(['unplanned']),
  records = ref<PlanRow[]>([]),
  extra = ref<PlanRow[]>([]);
const checked = ref(new Map<string, PlanRow>()),
  basket = ref(new Map<string, PlanRow>());
const libraryIds = ref<number[]>([]),
  librarySearch = ref(''),
  message = ref(''),
  loadError = ref(''),
  rowError = ref(''),
  linkError = ref('');
const pending = ref(false),
  loading = ref(false),
  loadingLinks = ref(false),
  loadingOptions = ref(false);
const handoff = useState<TripDraft | null>('odis-planning-trip', () => null);
let linkGeneration = 0,
  resolveQuestion: ((answer: boolean) => void) | undefined;
const question = ref(''),
  yesText = ref('Да'),
  noText = ref('Нет');
function ask(text: string, yes = 'Да', no = 'Нет') {
  question.value = text;
  yesText.value = yes;
  noText.value = no;
  prompt.value?.showModal();
  return new Promise<boolean>((resolve) => {
    resolveQuestion = resolve;
  });
}
function answer(value: boolean) {
  prompt.value?.close();
  resolveQuestion?.(value);
  resolveQuestion = undefined;
}
async function close() {
  if (pending.value) return;
  if (
    !(basket.value.size || checked.value.size || extra.value.length) ||
    (await ask('Закрыть форму и отменить выбор работ?'))
  )
    emit('close');
}
async function loadOptions() {
  loadingOptions.value = true;
  loadError.value = '';
  try {
    options.value = await $fetch<PlanOptions>('/api/diagnostic/planning/options');
    employee.value = options.value.employees.some((e) => e.id === options.value!.currentUserId)
      ? options.value.currentUserId
      : 0;
  } catch (e: any) {
    loadError.value = e?.data?.message || 'Не удалось загрузить параметры планирования.';
  } finally {
    loadingOptions.value = false;
  }
}
onMounted(() => {
  modal.value?.showModal();
  void loadOptions();
});
onBeforeUnmount(() => {
  linkGeneration++;
  resolveQuestion?.(false);
});
const boundsError = computed(() =>
  contract.value ? dateIssue(contract.value, start.value, finish.value) : '',
);
const ready = computed(
  () => !!(contract.value && employee.value && start.value && finish.value && !boundsError.value),
);
async function loadLinks() {
  const g = ++linkGeneration;
  if (!contract.value) return;
  loadingLinks.value = true;
  linkError.value = '';
  try {
    const result = await $fetch<PlanStructure[]>('/api/diagnostic/planning/structures', {
      query: { contractId: contract.value.id },
    });
    if (g === linkGeneration) links.value = result;
  } catch (e: any) {
    if (g === linkGeneration) linkError.value = e?.data?.message || 'Не удалось загрузить сооружения.';
  } finally {
    if (g === linkGeneration) loadingLinks.value = false;
  }
}
async function chooseContract(e: Event) {
  const select = e.target as HTMLSelectElement,
    c = options.value?.contracts.find((c) => c.id === Number(select.value));
  select.value = String(contract.value?.id || 0);
  if (!c || contract.value?.id === c.id) return;
  if (
    c.status !== 'ACTIVE' &&
    !(await ask(
      'Вы уверены, что хотите выбрать ' + (c.status === 'PLANNED' ? 'планируемый' : 'закрытый') + ' договор?',
    ))
  )
    return;
  if (
    (basket.value.size || checked.value.size || extra.value.length) &&
    !(await ask('При смене договора выбранные работы будут удалены из этой формы. Продолжить?'))
  )
    return;
  contract.value = c;
  select.value = String(c.id);
  selection.value = [];
  anchor.value = 0;
  links.value = [];
  extra.value = [];
  checked.value.clear();
  basket.value.clear();
  start.value = '';
  finish.value = '';
  kmFrom.value = '';
  kmTo.value = '';
  message.value = '';
  void loadLinks();
}
const kmError = computed(() => {
  if (category.value !== 'structure') return '';
  const a = structureLocationMetres(kmFrom.value),
    b = structureLocationMetres(kmTo.value);
  if ((kmFrom.value && a === null) || (kmTo.value && b === null)) return 'Введите километры или км+м.';
  return a !== null && b !== null && a > b ? 'Начало участка позже его конца.' : '';
});
const visibleLinks = computed(() => {
  if (kmError.value) return [];
  const a = structureLocationMetres(kmFrom.value),
    b = structureLocationMetres(kmTo.value);
  return links.value.filter(
    (s) =>
      (a === null || (s.locationMetres !== null && s.locationMetres >= a)) &&
      (b === null || (s.locationMetres !== null && s.locationMetres <= b)),
  );
});
const selectedLinks = computed(() => new Set(selection.value));
const visibleSelectedLinks = computed(() => visibleLinks.value.filter((s) => selectedLinks.value.has(s.linkId)).length);
function toggleVisibleLinks(event: Event) {
  const select = (event.target as HTMLInputElement).checked;
  const next = new Set(selection.value);
  for (const { linkId } of visibleLinks.value) {
    if (select) next.add(linkId);
    else next.delete(linkId);
  }
  selection.value = [...next];
  anchor.value = 0;
}
function roadParts(name: string) {
  const text = name.trim();
  const match = /^(?:а\/д\s+)?(?:[А-ЯA-Z]{1,3}|\d{1,2}[А-ЯA-Z]{1,2})\s*[-‐‑–—]\s*\d+[А-ЯA-Z]?(?=$|[\s,.:;(«"–—-])/iu.exec(text);
  return { code: match?.[0] ?? '', description: text.slice(match?.[0].length ?? 0).trimStart() };
}
const structureRows = computed(() => visibleLinks.value.map((s) => ({ ...s, road: roadParts(s.roadName) })));
function selectLink(id: number, e: MouseEvent | KeyboardEvent, toggle = false) {
  const next = new Set(selection.value),
    ids = visibleLinks.value.map((s) => s.linkId);
  if (e.shiftKey && ids.includes(anchor.value)) {
    if (!e.ctrlKey && !e.metaKey) next.clear();
    const a = ids.indexOf(anchor.value),
      b = ids.indexOf(id);
    ids.slice(Math.min(a, b), Math.max(a, b) + 1).forEach((i) => next.add(i));
  } else {
    if (toggle || e.ctrlKey || e.metaKey) {
      if (next.has(id)) next.delete(id);
      else next.add(id);
    } else {
      next.clear();
      next.add(id);
    }
    anchor.value = id;
  }
  selection.value = [...next];
}
const rowRevision = ref(0);
watch(
  [() => contract.value?.id, category, selection, rowRevision],
  async ([id, cat, selected], _, cleanup) => {
    records.value = [];
    rowError.value = '';
    loading.value = false;
    if (!id || (cat === 'structure' && !selected.length)) return;
    const controller = new AbortController();
    cleanup(() => controller.abort());
    loading.value = true;
    try {
      const result: PlanRow[] = [];
      const batches = cat === 'structure' ? selected : [0];
      for (let i = 0; i < batches.length; i += 100) {
        let after: number | null = null;
        do {
          const part: { rows: PlanRow[]; next: number | null } = await $fetch(
            '/api/diagnostic/planning/rows',
            {
              query: {
                contractId: id,
                category: cat,
                links: cat === 'structure' ? batches.slice(i, i + 100).join(',') : '',
                ...(after ? { after } : {}),
              },
              signal: controller.signal,
            },
          );
          result.push(...part.rows);
          after = part.next;
        } while (after !== null);
      }
      if (!controller.signal.aborted) records.value = result;
    } catch (e: any) {
      if (!controller.signal.aborted) rowError.value = e?.data?.message || 'Ошибка загрузки работ.';
    } finally {
      if (!controller.signal.aborted) loading.value = false;
    }
  },
  { immediate: true },
);
const visible = computed(() =>
  [...records.value, ...extra.value].filter(
    (r) =>
      r.category === category.value &&
      (!r.linkId || selectedLinks.value.has(r.linkId)) &&
      filters.value.includes(r.status) &&
      !basket.value.has(itemKey(r)),
  ),
);
const canSelect = (r: PlanRow) => r.available && r.status === 'unplanned';
const selectableRows = computed(() => visible.value.filter(canSelect));
const visibleCheckedRows = computed(() => selectableRows.value.filter((r) => checked.value.has(itemKey(r))).length);
function toggleVisibleRows(event: Event) {
  const select = (event.target as HTMLInputElement).checked;
  for (const r of selectableRows.value) {
    const k = itemKey(r);
    if (select) checked.value.set(k, r);
    else checked.value.delete(k);
  }
}
function toggleRow(r: PlanRow) {
  if (!canSelect(r)) return;
  const k = itemKey(r);
  if (checked.value.has(k)) checked.value.delete(k);
  else checked.value.set(k, r);
}
const applicable = computed(() => [...checked.value.values()].filter(canSelect));
function apply() {
  for (const r of applicable.value) {
    const k = itemKey(r);
    basket.value.set(k, r);
    checked.value.delete(k);
  }
  message.value = '';
}
const targets = computed(() => links.value.filter((s) => selectedLinks.value.has(s.linkId)));
const libraryWorks = computed(() =>
  (options.value?.library || []).filter(
    (w) =>
      w.category === category.value &&
      [w.code, w.name, w.group]
        .join(' ')
        .toLocaleLowerCase('ru')
        .includes(librarySearch.value.trim().toLocaleLowerCase('ru')),
  ),
);
function openLibrary() {
  libraryIds.value = [];
  librarySearch.value = '';
  library.value?.showModal();
}
function addLibrary() {
  const exists = new Set(extra.value.map(itemKey));
  for (const w of options.value?.library || []) {
    if (w.category !== category.value || !libraryIds.value.includes(w.id)) continue;
    for (const s of category.value === 'structure' ? targets.value : [undefined]) {
      const r = libraryRow(w, s),
        key = itemKey(r);
      if (!exists.has(key)) {
        extra.value.push(r);
        exists.add(key);
      }
      if (!basket.value.has(key)) checked.value.set(key, r);
    }
  }
  library.value?.close();
}
const items = computed(() => [...basket.value.values()]);
const duration = computed(() =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(
    items.value.reduce((n, r) => n + Math.round(Number(r.hours || 0) * 10000), 0) / 10000,
  ),
);
let signature = '',
  requestId = '';
async function save() {
  if (!ready.value || !contract.value || !items.value.length || pending.value) return;
  const travel = items.value.filter(isTravel),
    regular = items.value.filter((r) => !isTravel(r));
  let transfer = false;
  message.value = '';
  if (travel.length) {
    transfer = await ask(
      'Командировки планируются в разделе «Командировки». Перейти туда с выбранными данными?' +
        (regular.length ? ' Остальные работы будут сохранены в плане.' : ''),
      'Перейти',
      'Остаться',
    );
    if (
      !transfer &&
      !(await ask(
        'Выбранные командировки будут пропущены. Их можно запланировать заново в разделе «Командировки». Продолжить?',
      ))
    )
      return;
  }
  pending.value = true;
  try {
    const person = options.value!.employees.find((p) => p.id === employee.value)!;
    const body = {
      contractId: contract.value.id,
      employeeId: person.id,
      start: start.value,
      finish: finish.value,
      confirmedStatus: contract.value.status,
      items: regular.map(({ id, origin, category, linkId, version }) => ({
        id,
        origin,
        category,
        linkId,
        version,
      })),
    };
    if (regular.length) {
      const next = JSON.stringify(body);
      if (next !== signature) {
        requestId = globalThis.crypto.randomUUID();
        signature = next;
      }
      await $fetch('/api/diagnostic/planning', {
        method: 'POST',
        headers: { 'x-space-diagnostic': '1' },
        body: { ...body, requestId },
        retry: 0,
      });
    }
    if (transfer) {
      const tripLinks = new Map(links.value.map((s) => [s.linkId, s]));
      handoff.value = {
        sources: travel
          .filter((r) => r.origin === 'existing')
          .map((r) => ({
            id: r.id,
            version: r.version,
            structureId: tripLinks.get(r.linkId!)!.id,
            name: r.name,
          })),
        contractId: body.contractId,
        start: body.start,
        finish: body.finish,
        participant: person,
        structures: links.value.filter((s) => travel.some((r) => r.linkId === s.linkId)),
        assignment: [...new Set(travel.map((r) => r.name))].join(', '),
      };
      await navigateTo('/departments/diagnostic?module=trips');
    } else if (regular.length) emit('saved', person.id);
    else {
      for (const r of travel) basket.value.delete(itemKey(r));
      message.value = 'Командировки пропущены. Их можно создать в разделе «Командировки».';
    }
  } catch (e: any) {
    message.value = e?.data?.message || e?.message || 'Не удалось сохранить план.';
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <dialog ref="modal" class="odp" aria-labelledby="odp-title" @cancel.prevent="close">
    <header>
      <strong id="odp-title">Добавление работ в план</strong
      ><button class="odp-close" aria-label="Закрыть" @click="close">×</button>
    </header>
    <main>
      <h2>Параметры планируемой работы</h2>
      <p v-if="loadingOptions" role="status">Загрузка договоров и библиотеки работ…</p>
      <p v-if="loadError" role="alert">{{ loadError }} <button @click="loadOptions">Повторить</button></p>
      <fieldset :disabled="pending" class="odp-controls">
        <div class="odp-line">
          <label
            >Договор *
            <select :value="contract?.id || 0" @change="chooseContract">
              <option disabled :value="0">Выберите договор</option>
              <optgroup v-for="(label, status) in contractLabels" :key="status" :label="label">
                <option
                  v-for="c in options?.contracts.filter((c) => c.status === status)"
                  :key="c.id"
                  :value="c.id"
                >
                  {{ c.number }}
                </option>
              </optgroup>
            </select></label
          >
          <div class="odp-dates">
            <label
              >Начало *
              <TripDateInput v-model="start" :disabled="!contract" label="Начало планируемой работы" /></label
            ><label
              >Окончание *
              <TripDateInput v-model="finish" :disabled="!contract" label="Окончание планируемой работы"
            /></label>
          </div>
        </div>
        <p v-if="boundsError" role="alert">{{ boundsError }}</p>
        <div class="odp-line">
          <label
            >Сотрудник *
            <select v-model.number="employee" :disabled="!contract">
              <option disabled :value="0">Выберите сотрудника ОДИС</option>
              <option v-for="p in options?.employees" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select></label
          >
          <div class="odp-tabs" aria-label="Категория">
            <button
              v-for="(label, cat) in categoryNames"
              :key="cat"
              :aria-pressed="category === cat"
              @click="category = cat"
            >
              {{ label }}<span v-if="cat === 'structure' && contract && !loadingLinks && !linkError"> ({{ links.length }})</span>
            </button>
          </div>
        </div>
      </fieldset>
      <div class="odp-upper" :inert="pending">
        <section>
          <div class="odp-tools">
            <label
              >Интервал (км)
              <input
                v-model="kmFrom"
                aria-label="С километра"
                :disabled="category !== 'structure' || !contract" /></label
            ><input
              v-model="kmTo"
              aria-label="По километр"
              :disabled="category !== 'structure' || !contract"
            />
          </div>
          <p v-if="kmError" role="alert">{{ kmError }}</p>
          <h3>
            Сооружения <small>({{ visibleSelectedLinks }} / {{ visibleLinks.length }})</small>
          </h3>
          <div class="odp-scroll">
            <table>
              <thead>
                <tr>
                  <th class="odp-pick-cell" scope="col">
                    <input type="checkbox" title="Выбрать все видимые сооружения" aria-label="Выбрать все видимые сооружения"
                      :disabled="category !== 'structure' || loadingLinks || !!linkError || !visibleLinks.length"
                      :checked="category === 'structure' && visibleLinks.length > 0 && visibleSelectedLinks === visibleLinks.length"
                      :indeterminate="category === 'structure' && visibleSelectedLinks > 0 && visibleSelectedLinks < visibleLinks.length"
                      @change="toggleVisibleLinks" />
                  </th>
                  <th>км+м</th>
                  <th>ИССО</th>
                  <th>А/д</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="category !== 'structure'">
                  <td colspan="4">Доступно для работ по сооружению</td>
                </tr>
                <tr v-else-if="linkError">
                  <td colspan="4">{{ linkError }} <button @click="loadLinks">Повторить</button></td>
                </tr>
                <tr v-else-if="loadingLinks">
                  <td colspan="4">Загрузка сооружений…</td>
                </tr>
                <tr v-else-if="!visibleLinks.length">
                  <td colspan="4">Сооружения не найдены</td>
                </tr>
                <template v-else
                  ><tr
                    v-for="s in structureRows"
                    :key="s.linkId"
                    :class="{ chosen: selectedLinks.has(s.linkId) }"
                    @click="selectLink(s.linkId, $event)"
                  >
                    <td class="odp-pick-cell">
                      <input
                        type="checkbox"
                        :aria-label="'Выбрать ИССО ' + s.code"
                        :checked="selectedLinks.has(s.linkId)"
                        @click.stop="selectLink(s.linkId, $event, true)"
                      />
                    </td>
                    <td>{{ s.location }}</td>
                    <td class="odp-isso">{{ s.code }}</td>
                    <td class="odp-road" :title="s.roadName">
                      <strong v-if="s.road.code">{{ s.road.code }}</strong>
                      <small>{{ s.road.description }}</small>
                    </td>
                  </tr></template
                >
              </tbody>
            </table>
          </div>
        </section>
        <section>
          <div class="odp-tools odp-status">
            <label v-for="s in workStatusLegend" :key="s.key"
              ><input
                v-model="filters"
                type="checkbox"
                :value="s.key"
                :disabled="s.key === 'unplanned'"
              /><WorkStatusIcon :status="s.key" />{{ s.key === 'unplanned' ? 'Пустые' : s.label }}</label
            >
          </div>
          <h3>
            Работы <small>({{ visible.length }})</small>
          </h3>
          <div class="odp-scroll">
            <table>
              <thead>
                <tr>
                  <th class="odp-pick-cell" scope="col">
                    <input type="checkbox" title="Выбрать все нераспределённые работы" aria-label="Выбрать все нераспределённые работы"
                      :disabled="loading || !!rowError || !selectableRows.length"
                      :checked="selectableRows.length > 0 && visibleCheckedRows === selectableRows.length"
                      :indeterminate="visibleCheckedRows > 0 && visibleCheckedRows < selectableRows.length"
                      @change="toggleVisibleRows" />
                  </th>
                  <th>Код ИССО</th>
                  <th>Название работы</th>
                  <th>Группа</th>
                  <th>Исполнитель</th>
                  <th>чел·ч</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="rowError">
                  <td colspan="6">{{ rowError }} <button @click="rowRevision++">Повторить</button></td>
                </tr>
                <tr v-else-if="loading">
                  <td colspan="6">Загрузка работ…</td>
                </tr>
                <tr v-else-if="!visible.length">
                  <td colspan="6">
                    {{
                      category === 'structure' && !selection.length
                        ? 'Выберите сооружения'
                        : 'Нет работ по выбранным условиям'
                    }}
                  </td>
                </tr>
                <tr
                  v-for="r in visible"
                  :key="itemKey(r)"
                  :class="{ chosen: checked.has(itemKey(r)), travel: isTravel(r) }"
                  @click="toggleRow(r)"
                >
                  <td class="odp-pick-cell">
                    <input
                      v-if="canSelect(r)"
                      type="checkbox"
                      :aria-label="r.name"
                      :checked="checked.has(itemKey(r))"
                      @click.stop="toggleRow(r)"
                    /><WorkStatusIcon v-else :status="r.status" />
                  </td>
                  <td>{{ r.isso || '—' }}</td>
                  <td>{{ r.name }}</td>
                  <td>{{ r.group }}</td>
                  <td>{{ r.executor || '—' }}</td>
                  <td>{{ r.hours ?? '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <aside>
          <button
            :disabled="!contract || (category === 'structure' && !selection.length) || pending"
            @click="openLibrary"
          >
            <Icon name="streamline-freehand-color:add-sign-bold" size="16" aria-hidden="true" />Добавить
          </button>
          <button :disabled="!ready || !applicable.length || pending" @click="apply">
            <Icon name="streamline-freehand-color:form-validation-check-double" size="16" aria-hidden="true" />Применить
          </button>
        </aside>
      </div>
      <section class="odp-basket">
        <h3>Перечень запланированных работ</h3>
        <div class="odp-scroll">
          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Наименование работы</th>
                <th>ИССО</th>
                <th>Начало</th>
                <th>Окончание</th>
                <th>чел·ч</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in items" :key="itemKey(r)" :class="{ travel: isTravel(r) }">
                <td>{{ i + 1 }}</td>
                <td>{{ r.name }}</td>
                <td>{{ r.isso || '—' }}</td>
                <td>{{ tripDateLabel(start) }}</td>
                <td>{{ tripDateLabel(finish) }}</td>
                <td>{{ r.hours ?? '—' }}</td>
                <td>
                  <button
                    :disabled="pending"
                    :aria-label="'Убрать ' + r.name"
                    @click="basket.delete(itemKey(r))"
                  >
                    Убрать
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="odp-total">Работ: {{ items.length }} · Всего: {{ duration }} чел·ч</div>
      </section>
      <p v-if="message" role="alert">{{ message }}</p>
    </main>
    <footer>
      <button class="primary" :disabled="!ready || !items.length || pending" @click="save">
        {{ pending ? 'Сохранение…' : 'Сохранить' }}</button
      ><button :disabled="pending" @click="close">Отмена</button>
    </footer>
    <dialog ref="library" class="odp-child" aria-labelledby="odp-lib-title">
      <header>
        <strong id="odp-lib-title">Добавление работ · {{ categoryNames[category] }}</strong
        ><button class="odp-close" aria-label="Закрыть библиотеку" @click="library?.close()">×</button>
      </header>
      <label class="odp-search"
        >Поиск <input v-model="librarySearch" type="search" placeholder="Шифр, название, группа"
      /></label>
      <div class="odp-scroll">
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Шифр</th>
              <th>Наименование</th>
              <th>Группа работ</th>
              <th>чел·ч</th>
              <th>Примечание</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="w in libraryWorks" :key="w.id">
              <td><input v-model="libraryIds" type="checkbox" :value="w.id" :aria-label="w.name" /></td>
              <td>{{ w.code }}</td>
              <td>{{ w.name }}</td>
              <td>{{ w.group }}</td>
              <td>{{ w.hours }}</td>
              <td>{{ w.note }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <footer>
        <button class="primary" :disabled="!libraryIds.length" @click="addLibrary">Добавить</button
        ><button @click="library?.close()">Отмена</button>
      </footer>
    </dialog>
    <dialog ref="prompt" class="odp-confirm" aria-label="Подтверждение" @cancel.prevent="answer(false)">
      <p>{{ question }}</p>
      <footer>
        <button class="primary" @click="answer(true)">{{ yesText }}</button
        ><button @click="answer(false)">{{ noText }}</button>
      </footer>
    </dialog>
  </dialog>
</template>
<style src="~/assets/css/diagnostic-plan-editor.css"></style>
