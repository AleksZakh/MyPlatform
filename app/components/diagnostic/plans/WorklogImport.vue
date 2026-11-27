<script setup lang="ts">
import {
  workColumns,
  workHints,
  readWorklogSheet,
  isM4Worklog,
  suggestedNumber,
  type WorklogRow,
} from '~~/shared/utils/diagnostic-worklog';
import { tripDateLabel, tripLookup } from '~~/shared/utils/diagnostic-trips';
import { structureRequestError } from '~/composables/diagnostic/useStructures';
const emit = defineEmits<{ close: []; imported: []; reconcile: [id: number] }>();
interface ContractOption {
  id: number;
  number: string;
  date: string;
  party: string;
}
interface Work {
  id: number;
  name: string;
  code: string;
  fieldWork: boolean;
}
interface PreviewRow {
  row: number;
  candidates: { id: number; label: string }[];
  state: string;
  warnings: string[];
  source: string;
  differences: { field: string; before: string; after: string }[];
  assignments: {
    label: string;
    people: string[];
    note: string;
    existing: number[];
    update: boolean;
    visit: boolean;
  }[];
}
interface Review {
  alreadyImported: boolean;
  signature: string;
  contract: string;
  rows: PreviewRow[];
  errors: string[];
}
const mode = ref<'existing' | 'new'>('existing'),
  target = ref(0),
  savedContract = ref(0);
const props = defineProps<{ initialContract?: number }>();
function suggestContract() {
  if (isM4Worklog(fileName.value)) {
    const hits = options.value.contracts.filter(
      (c) => tripLookup(c.number) === tripLookup('ДСиР-2025-478') && c.date === '2025-05-13',
    );
    target.value = hits.length === 1 ? hits[0]!.id : 0;
  } else if (props.initialContract && options.value.contracts.some((c) => c.id === props.initialContract))
    target.value = props.initialContract;
}
const ready = computed(() =>
  mode.value === 'existing' ? !!target.value : !!number.value && !!date.value && !!counterparty.value,
);
const busy = ref(false),
  error = ref(''),
  result = ref(''),
  fileName = ref(''),
  sheetIndex = ref(0),
  number = ref(''),
  road = ref(''),
  date = ref(''),
  counterparty = ref(0);
const sheets = shallowRef<{ name: string; rows: WorklogRow[] }[]>([]),
  options = ref<{
    works: Work[];
    contracts: ContractOption[];
    roads: string[];
    parties: { id: number; name: string }[];
  }>({
    works: [],
    contracts: [],
    roads: [],
    parties: [],
  });
const allowMissing = ref(false),
  matches = ref<Record<string, number>>({}),
  candidates = ref<Record<number, { id: number; label: string }[]>>({});
const mapping = ref<number[]>([]),
  review = shallowRef<Review | null>(null),
  page = ref(1);
const sheet = computed(() => sheets.value[sheetIndex.value]),
  rows = computed(() => sheet.value?.rows || []),
  shown = computed(() => rows.value.slice((page.value - 1) * 30, page.value * 30));
const byRow = computed(() => new Map(review.value?.rows.map((r) => [r.row, r])));
const hasWork = (i: number) => rows.value.some((r) => r.cells[i] && !/^[-–—]+$/.test(r.cells[i]!));
const headers = { 'x-space-diagnostic': '1' };
const names: Record<string, string> = {
  roadName: 'А/Д',
  location: 'Место',
  structureName: 'Сооружение',
  additionalId: 'Доп. информация',
  code: 'ИССО',
};
const states: Record<string, string> = {
  new: 'Создать',
  match: 'Связать',
  archived: 'В архиве',
  conflict: 'Проверить совпадение',
};
async function init() {
  try {
    options.value = await $fetch('/api/diagnostic/structures/import');
    suggestContract();
    mapping.value = workColumns.map(
      (col, i) =>
        options.value.works.find((w) =>
          i === 0
            ? w.fieldWork && w.name.trim().toLowerCase() === 'командировка'
            : w.code === workHints[i] || w.name.toLowerCase() === col.toLowerCase(),
        )?.id || 0,
    );
  } catch (e) {
    error.value = structureRequestError(e);
  }
}
onMounted(init);
watch([sheetIndex, road, target, mode], () => {
  candidates.value = {};
  matches.value = {};
});
watch(
  [sheetIndex, mode, target, number, road, date, counterparty, mapping, allowMissing, matches],
  () => {
    review.value = null;
    page.value = 1;
  },
  { deep: true, flush: 'sync' },
);
async function picked(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  error.value = '';
  result.value = '';
  review.value = null;
  sheets.value = [];
  candidates.value = {};
  matches.value = {};
  allowMissing.value = false;
  busy.value = true;
  try {
    if (file.size > 4 * 1024 * 1024 || !file.name.toLowerCase().endsWith('.xlsx'))
      throw new Error('Выберите файл .xlsx размером до 4 МБ.');
    const { default: Excel } = await import('exceljs'),
      book = new Excel.Workbook();
    await book.xlsx.load((await file.arrayBuffer()) as Parameters<typeof book.xlsx.load>[0]);
    const candidates = book.worksheets.filter((s) =>
      s.getRow(1).values.toString().toLowerCase().includes('сооружение'),
    );
    if (!candidates.length) throw new Error('В книге нет листов формы «Ход работ».');
    sheets.value = candidates.map((s) => ({ name: s.name, rows: readWorklogSheet(s) }));
    sheetIndex.value = 0;
    fileName.value = file.name;
    mode.value = 'existing';
    target.value = 0;
    suggestContract();
    number.value = suggestedNumber(file.name);
    page.value = 1;
    const prefix = file.name.match(/[марaмmpr]-\d+/i)?.[0];
    const hits = prefix
      ? options.value.roads.filter((r) => r.toUpperCase().startsWith(prefix.toUpperCase() + ' '))
      : [];
    road.value = hits.length === 1 ? hits[0]! : '';
  } catch (e) {
    error.value = structureRequestError(e);
  } finally {
    busy.value = false;
  }
}
async function run(apply: boolean) {
  if (!sheet.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const body = {
    fileName: fileName.value,
    sheet: sheet.value.name,
    rows: rows.value,
    contractId: mode.value === 'existing' ? target.value : undefined,
    number: mode.value === 'new' ? number.value : undefined,
    road: road.value,
    date: mode.value === 'new' ? date.value : undefined,
    counterparty: mode.value === 'new' ? counterparty.value : undefined,
    mapping: mapping.value,
    allowMissing: allowMissing.value,
    matches: matches.value,
    signature: review.value?.signature,
    apply,
  };
  try {
    if (!apply) {
      review.value = await $fetch<Review>('/api/diagnostic/structures/import?source=worklog', {
        method: 'POST',
        headers,
        body,
        retry: 0,
      });
      candidates.value = Object.fromEntries(
        review.value.rows.filter((r) => r.candidates.length).map((r) => [r.row, r.candidates]),
      );
    } else {
      const saved = await $fetch<{
        number: string;
        id: number;
        deferredVisits: number;
        created: number;
        attached: number;
        assignments: number;
        changed: number;
        updatedWorks: number;
      }>('/api/diagnostic/structures/import?source=worklog', { method: 'POST', headers, body, retry: 0 });
      result.value =
        'Договор ' +
        saved.number +
        ' · Добавлено в справочник: ' +
        saved.created +
        ' · Включено в договор: ' +
        saved.attached +
        ' · Создано работ: ' +
        saved.assignments +
        ' · Обновлено работ: ' +
        saved.updatedWorks +
        ' · Обновлено карточек: ' +
        saved.changed;
      savedContract.value = saved.id;
      if (saved.deferredVisits) result.value += ' · Полевых отметок для сверки: ' + saved.deferredVisits;
      emit('imported');
    }
  } catch (e) {
    error.value = structureRequestError(e);
    review.value = null;
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <UModal
    :open="true"
    title="Импорт «Хода работ»"
    description="Перенос сооружений и работ в доходный договор"
    :dismissible="!busy"
    :ui="{ content: 'max-w-[1400px] w-[96vw]', body: 'min-h-0 overflow-auto' }"
    @update:open="
      (v) => {
        if (!v && !busy) emit('close');
      }
    "
  >
    <template #body>
      <p v-if="result" role="status">
        {{ result }}
        <UButton v-if="savedContract" variant="outline" @click="emit('reconcile', savedContract)"
          >Сверка командировок</UButton
        >
      </p>
      <fieldset v-else class="wl-import" :disabled="busy">
        <label>Файл Excel<input type="file" accept=".xlsx" @change="picked" /></label>
        <template v-if="sheet">
          <div class="params">
            <label v-if="sheets.length > 1"
              >Лист<select v-model="sheetIndex">
                <option v-for="(s, i) in sheets" :key="s.name" :value="i">{{ s.name }}</option>
              </select></label
            >
            <label
              >Куда импортировать<select v-model="mode">
                <option value="existing">В существующий договор</option>
                <option value="new">Создать доходный договор</option>
              </select></label
            >
            <label v-if="mode === 'existing'"
              >Договор<select v-model.number="target">
                <option :value="0">Выберите договор</option>
                <option v-for="c in options.contracts" :key="c.id" :value="c.id">
                  {{ c.number }} от {{ tripDateLabel(c.date) }} · {{ c.party }}
                </option>
              </select></label
            >
            <template v-else>
              <label>Временный номер договора<input v-model.trim="number" maxlength="15" /></label
              ><label>Дата договора<input v-model="date" type="date" /></label>
              <label
                >Контрагент<select v-model.number="counterparty">
                  <option :value="0">Выберите контрагента</option>
                  <option v-for="c in options.parties" :key="c.id" :value="c.id">{{ c.name }}</option>
                </select></label
              >
            </template>
            <label
              >Автодорога<input v-model.trim="road" list="worklog-roads" /><datalist id="worklog-roads">
                <option v-for="r in options.roads" :key="r" :value="r" /></datalist
            ></label>
          </div>
          <details>
            <summary>Соответствие столбцов библиотеке работ</summary>
            <div class="params">
              <label v-for="(col, i) in workColumns" v-show="hasWork(i)" :key="col"
                >{{ col
                }}<select v-model="mapping[i]">
                  <option :value="0">Выберите работу</option>
                  <option
                    v-for="w in options.works.filter((w) => (i === 0) === ['301', '302'].includes(w.code))"
                    :key="w.id"
                    :value="w.id"
                  >
                    {{ w.code }} · {{ w.name }}
                  </option>
                </select></label
              >
            </div>
          </details>
          <p>
            Сооружений {{ rows.length }} · Цветных {{ rows.filter((r) => r.colored).length }} · Без ИССО
            {{ rows.filter((r) => !r.code).length }}
          </p>
          <label v-if="rows.some((r) => r.colored && !r.code)"
            ><span
              ><input v-model="allowMissing" type="checkbox" /> Включить проверенные цветные строки без
              ИССО</span
            ></label
          >
          <p v-if="review?.alreadyImported">Эта версия листа уже импортирована.</p>
          <p v-if="review?.contract">Договор импорта · {{ review.contract }}</p>
          <p v-for="msg in review?.errors" :key="msg" role="alert">{{ msg }}</p>
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th>Строка</th>
                  <th>Этап</th>
                  <th>ИССО</th>
                  <th>Место</th>
                  <th>Сооружение</th>
                  <th>Примечание</th>
                  <th>Сверка и работы</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="r in shown" :key="r.row" :class="{ marked: r.colored }">
                  <td>{{ r.row }}</td>
                  <td>{{ r.stage }}</td>
                  <td>{{ r.code || (r.colored ? 'Требуется ИССО' : '—') }}</td>
                  <td>{{ r.location }}</td>
                  <td>{{ r.name }} {{ r.additional }}</td>
                  <td>{{ r.note }}</td>
                  <td>
                    <label v-if="candidates[r.row]?.length"
                      >Возможное совпадение<select v-model="matches[String(r.row)]">
                        <option :value="undefined">Выберите совпадение</option>
                        <option :value="0">Отдельное сооружение</option>
                        <option v-for="c in candidates[r.row]" :key="c.id" :value="c.id">
                          {{ c.label }}
                        </option>
                      </select></label
                    ><template v-if="byRow.get(r.row)"
                      ><strong>{{ states[byRow.get(r.row)!.state] }}</strong>
                      <p v-for="d in byRow.get(r.row)!.differences" :key="d.field">
                        {{ names[d.field] }} · В справочнике «{{ d.before }}», в файле «{{ d.after }}»
                      </p>
                      <p v-for="w in byRow.get(r.row)!.warnings" :key="w">{{ w }}</p>
                      <p v-for="a in byRow.get(r.row)!.assignments" :key="a.label">
                        {{ a.label }} ·
                        {{ [a.people.join(', '), a.note].filter(Boolean).join(' · ') || 'Без исполнителя'
                        }}{{
                          a.visit
                            ? ' · Сверка командировок'
                            : a.update
                              ? ' · Обновить'
                              : a.existing.length
                                ? ' · Уже в договоре'
                                : ''
                        }}
                      </p></template
                    >
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="pager">
            <button :disabled="page === 1" @click="page--">Назад</button>{{ page }} /
            {{ Math.ceil(rows.length / 30)
            }}<button :disabled="page * 30 >= rows.length" @click="page++">Далее</button>
          </div>
        </template>
      </fieldset>
      <p v-if="error" role="alert">{{ error }}</p>
    </template>
    <template #footer
      ><UButton variant="outline" :disabled="busy" @click="emit('close')">Закрыть</UButton>
      <UButton v-if="!result" :disabled="busy || !sheet || !road || !ready" @click="run(false)"
        >Проверить</UButton
      >
      <UButton
        v-if="review && !review.alreadyImported && !result"
        :disabled="busy || !!review.errors.length"
        @click="run(true)"
        >Импортировать</UButton
      ></template
    ></UModal
  >
</template>
<style scoped>
.wl-import {
  display: grid;
  gap: 0.7rem;
  min-width: 0;
}
.params,
.pager {
  display: flex;
  align-items: end;
  gap: 0.65rem;
  flex-wrap: wrap;
}
.wl-import label {
  display: grid;
  gap: 0.2rem;
  font-size: 0.86rem;
}
.wl-import input,
.wl-import select,
.pager button {
  border: 1px solid var(--ui-border);
  background: var(--ui-bg);
  padding: 0.32rem 0.45rem;
  border-radius: 4px;
}
.scroll {
  overflow: auto;
  max-height: 48vh;
}
.scroll table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.scroll td,
.scroll th {
  padding: 0.32rem;
  text-align: left;
  border: 1px solid var(--ui-border);
}
.scroll th {
  position: sticky;
  top: 0;
  background: var(--ui-bg-elevated);
}
.marked {
  background: color-mix(in srgb, #469ca6 17%, transparent);
}
[role='alert'] {
  color: var(--ui-error);
}
</style>
