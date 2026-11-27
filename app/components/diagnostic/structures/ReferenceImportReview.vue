<script setup lang="ts">
import type { StructureRecord } from '~~/shared/types/diagnostic-structures';
import { structureGroups } from '~~/shared/types/diagnostic-structures';
import { structureRequestError } from '~/composables/diagnostic/useStructures';
interface Difference {
  field: string;
  before: string;
  after: string;
}
interface Decision {
  row: number;
  confirm: boolean;
  candidates: { id: number; label: string }[];
  code: string;
  state: string;
  id: number;
  version: number;
  changes: Difference[];
}
const props = defineProps<{
  records: StructureRecord[];
  present: string[];
  fileName: string;
  readonly?: boolean;
}>();
const emit = defineEmits<{ imported: []; busy: [value: boolean] }>();
const review = ref<Decision[]>([]),
  choices = ref<Record<number, string[]>>({}),
  included = ref<number[]>([]);
const busy = ref(false),
  error = ref(''),
  notice = ref(''),
  page = ref(1),
  finished = ref(false),
  cursor = ref(0);
const visible = computed(() => review.value.slice((page.value - 1) * 50, page.value * 50));
const eligible = computed(() =>
  review.value.filter((r) => r.state === 'new' || r.confirm || r.changes.length),
);
const labels = new Map<string, string>(
  structureGroups.flatMap((g) => g.fields.map((f) => [f.key, f.label] as const)),
);
labels.set('code', 'Код ИССО');
labels.set('lengthRaw', 'Длина, м');
const targets = ref<Record<number, number>>({});
const statuses: Record<string, string> = {
  possible: 'Сверьте объекты по месту',
  new: 'Создать',
  match: 'Найдено',
  archived: 'В архиве',
  conflict: 'Неоднозначное совпадение',
};
function all(on: boolean) {
  included.value = on ? eligible.value.map((r) => r.row) : [];
  for (const r of review.value) choices.value[r.row] = on ? r.changes.map((c) => c.field) : [];
}
function rowChoice(r: Decision, on: boolean) {
  included.value = included.value.filter((v) => v !== r.row);
  if (on) included.value.push(r.row);
  choices.value[r.row] = on ? r.changes.map((c) => c.field) : [];
}
async function setTarget(r: Decision, target: number) {
  const record = props.records.find((v) => v.sourceRow === r.row);
  if (!record) return;
  busy.value = true;
  emit('busy', true);
  error.value = '';
  try {
    const list = await $fetch<Decision[]>('/api/diagnostic/structures/import', {
      method: 'POST',
      body: {
        preview: true,
        fileName: props.fileName,
        records: [{ ...record, target, present: props.present }],
      },
    });
    const next = list[0]!;
    targets.value[r.row] = target;
    review.value = review.value.map((v) => (v.row === r.row ? next : v));
    rowChoice(next, next.state === 'new' || next.confirm || !!next.changes.length);
  } catch (e) {
    error.value = structureRequestError(e);
  } finally {
    busy.value = false;
    emit('busy', false);
  }
}
function fieldChoice(r: Decision, field: string, on: boolean) {
  const next = (choices.value[r.row] || []).filter((f) => f !== field);
  if (on) next.push(field);
  choices.value[r.row] = next;
  included.value = included.value.filter((v) => v !== r.row);
  if (next.length) included.value.push(r.row);
}
let generation = 0;
watch(
  () => props.records,
  async (records, onOld, cleanup) => {
    const current = ++generation;
    const ctrl = new AbortController();
    cleanup(() => ctrl.abort());
    review.value = [];
    error.value = '';
    notice.value = '';
    finished.value = false;
    cursor.value = 0;
    page.value = 1;
    choices.value = {};
    targets.value = {};
    busy.value = true;
    emit('busy', true);
    try {
      const result: Decision[] = [];
      for (let i = 0; i < records.length; i += 25) {
        result.push(
          ...(await $fetch<Decision[]>('/api/diagnostic/structures/import', {
            method: 'POST',
            signal: ctrl.signal,
            body: {
              preview: true,
              fileName: props.fileName,
              records: records.slice(i, i + 25).map((r) => ({ ...r, present: props.present })),
            },
          })),
        );
      }
      if (current === generation) {
        review.value = result;
        for (const r of result) {
          choices.value[r.row] = r.changes.filter((c) => c.after !== '').map((c) => c.field);
        }
        included.value = result
          .filter((r) => r.state === 'new' || r.confirm || choices.value[r.row]?.length)
          .map((r) => r.row);
      }
    } catch (e) {
      if (!ctrl.signal.aborted) error.value = structureRequestError(e);
    } finally {
      if (current === generation) {
        busy.value = false;
        emit('busy', false);
      }
    }
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  generation++;
  emit('busy', false);
});
const approved = computed(() => {
  const lookup = new Map(review.value.map((r) => [r.row, r]));
  return props.records
    .filter((r) => included.value.includes(r.sourceRow))
    .map((r) => {
      const p = lookup.get(r.sourceRow)!;
      return {
        ...r,
        present: props.present,
        target: targets.value[p.row],
        choice: {
          confirm: p.confirm,
          id: p.id,
          state: p.state,
          version: p.version,
          fields: choices.value[p.row] || [],
        },
      };
    });
});
async function save() {
  if (busy.value || props.readonly || finished.value) return;
  busy.value = true;
  emit('busy', true);
  error.value = '';
  try {
    while (cursor.value < approved.value.length) {
      const records = approved.value.slice(cursor.value, cursor.value + 25);
      await $fetch('/api/diagnostic/structures/import', {
        method: 'POST',
        headers: { 'x-space-diagnostic': '1' },
        body: { fileName: props.fileName, records },
        retry: 0,
      });
      cursor.value += records.length;
    }
    finished.value = true;
    notice.value = 'Импорт завершён. Обработано строк: ' + cursor.value;
  } catch (e) {
    error.value = structureRequestError(e);
  } finally {
    busy.value = false;
    emit('busy', false);
    emit('imported');
  }
}
</script>
<template>
  <div class="st-reference">
    <p v-if="error" role="alert">{{ error }}</p>
    <p v-if="notice" role="status">{{ notice }}</p>
    <p v-if="busy" role="status">{{ review.length ? 'Сохранение…' : 'Сверка с базой…' }}</p>
    <template v-if="review.length">
      <div class="flex flex-wrap items-center gap-2">
        <strong>Сверка с базой</strong
        ><span
          >Новых {{ review.filter((r) => r.state === 'new').length }} · С изменениями
          {{ review.filter((r) => r.changes.length).length }}</span
        >
        <button :disabled="busy || finished || cursor > 0" @click="all(true)">Выбрать все</button
        ><button :disabled="busy || finished || cursor > 0" @click="all(false)">Снять все</button>
      </div>
      <div class="st-import-table">
        <table>
          <thead>
            <tr>
              <th>Выбор</th>
              <th>Строка</th>
              <th>ИССО</th>
              <th>Результат</th>
              <th>Изменения</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in visible" :key="r.row" :class="{ changed: r.changes.length }">
              <td>
                <input
                  type="checkbox"
                  :aria-label="'Строка ' + r.row"
                  :disabled="busy || finished || cursor > 0 || !eligible.includes(r)"
                  :checked="included.includes(r.row)"
                  @change="rowChoice(r, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td>{{ r.row }}</td>
              <td>{{ r.code }}</td>
              <td>
                {{ r.confirm ? 'Подтвердить эталонные данные' : statuses[r.state]
                }}<select
                  v-if="r.candidates.length"
                  :disabled="busy || finished || cursor > 0"
                  :value="targets[r.row] ?? ''"
                  @change="setTarget(r, Number(($event.target as HTMLSelectElement).value))"
                >
                  <option value="" disabled>Выберите сооружение</option>
                  <option :value="0">Отдельное сооружение</option>
                  <option v-for="c in r.candidates" :key="c.id" :value="c.id">{{ c.label }}</option>
                </select>
              </td>
              <td>
                <label v-for="c in r.changes" :key="c.field" class="block"
                  ><input
                    type="checkbox"
                    :disabled="busy || finished || cursor > 0"
                    :checked="choices[r.row]?.includes(c.field)"
                    @change="fieldChoice(r, c.field, ($event.target as HTMLInputElement).checked)"
                  />
                  {{ labels.get(c.field) || c.field }} · {{ c.before || '—' }} →
                  <b>{{ c.after || 'Очистить поле' }}</b></label
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center gap-2">
        <button :disabled="page <= 1" @click="page--">Назад</button>{{ page }} /
        {{ Math.ceil(review.length / 50)
        }}<button :disabled="page * 50 >= review.length" @click="page++">Далее</button>
        <button
          v-if="!readonly"
          class="st-primary"
          :disabled="busy || !approved.length || finished"
          @click="save"
        >
          {{ cursor && !finished ? 'Продолжить' : 'Импортировать' }} ({{ approved.length }})
        </button>
      </div>
    </template>
  </div>
</template>
<style scoped>
.changed {
  background: color-mix(in srgb, #dfaa35 16%, transparent);
}
.changed b {
  color: var(--ui-text-highlighted);
  background: color-mix(in srgb, #dfaa35 28%, transparent);
}
</style>
