<script setup lang="ts">
import { computed, ref } from 'vue';
import { progressHeaders, type ProgressReport, type ProgressRow } from '~~/shared/utils/diagnostic-progress';
const props = defineProps<{ row: ProgressRow; col: number; report: ProgressReport }>();
const emit = defineEmits<{ close: []; saved: []; trip: [number]; review: [] }>();
const r = props.row,
  s = r.structure,
  col = props.col;
const workCol = col >= 8 && col <= 14,
  entries = r.works[col - 8] ?? [];
const choices = props.report.catalog.filter(
  (w) => w.columns.includes(col - 8) && !entries.some((e) => e.workId === w.id),
);
const entryKey = (e: (typeof entries)[number]) => e.kind + '-' + e.id;
const choice = ref(entries[0] ? entryKey(entries[0]) : choices.length ? 'add' : col === 8 ? 'crew' : '');
const entry = computed(() => entries.find((e) => entryKey(e) === choice.value));
const mode = computed(() => entry.value?.kind || choice.value);
const field = ({ 0: 'sheetOrdinal', 1: 'specNumber', 2: 'stage', 5: 'picket' } as Record<number, string>)[
  col
];
const structureField = (
  { 3: 'structureName', 4: 'location', 6: 'code', 7: 'lengthRaw', 15: 'note' } as Record<number, string>
)[col];
const initial = col === 3 ? s.structureName : (r.values[col] ?? '');
const value = ref(initial),
  additional = ref(s.additionalId);
const note = ref(''),
  plan = ref('keep'),
  fact = ref('keep'),
  catalogId = ref(choices[0]?.id ?? 0);
const originalPlan = computed(() => entry.value?.plan || '');
function reset() {
  note.value = mode.value === 'crew' ? r.worklogCrew : (entry.value?.note ?? '');
  plan.value = 'keep';
  fact.value = 'keep';
  error.value = '';
}
const busy = ref(false),
  error = ref('');
watch(choice, reset, { immediate: true });
const dirty = computed(() =>
  !workCol
    ? value.value !== initial || additional.value !== s.additionalId
    : mode.value === 'add'
      ? !!catalogId.value
      : mode.value === 'crew'
        ? note.value !== r.worklogCrew
        : mode.value === 'work' &&
          !entry.value?.managed &&
          (note.value !== entry.value?.note || plan.value !== 'keep' || fact.value !== 'keep'),
);
async function save() {
  if (!dirty.value || busy.value) return;
  busy.value = true;
  error.value = '';
  const headers = { 'x-space-diagnostic': '1' },
    scope = { contractId: r.contractId, linkId: r.linkId, version: r.contractVersion };
  try {
    if (!workCol && structureField) {
      const body = {
        id: s.id,
        version: s.version,
        roadName: s.roadName,
        code: s.code,
        structureName: s.structureName,
        location: s.location,
        additionalId: additional.value,
        note: s.note,
        [structureField]: value.value,
      };
      await $fetch('/api/diagnostic/structures', { method: 'POST', headers, body });
    } else if (field || mode.value === 'crew') {
      await $fetch('/api/diagnostic/progress/filters', {
        query: { action: 'cell' },
        method: 'POST',
        headers,
        body: {
          ...scope,
          op: 'link',
          field: field || 'worklogCrew',
          value: field ? value.value : note.value,
        },
      });
    } else if (mode.value === 'add') {
      await $fetch('/api/diagnostic/progress/filters', {
        query: { action: 'cell' },
        method: 'POST',
        headers,
        body: {
          ...scope,
          op: 'add',
          column: col - 8,
          workId: catalogId.value,
          employeeId: plan.value === 'keep' ? null : Number(plan.value) || null,
          note: note.value,
        },
      });
    } else if (entry.value?.kind === 'work') {
      const a = entry.value,
        changes: Record<string, unknown> = {};
      if (note.value !== a.note) changes.note = note.value;
      if (plan.value !== 'keep') changes.planExecutor = Number(plan.value) || null;
      if (fact.value !== 'keep') changes.factExecutor = Number(fact.value) || null;
      await $fetch('/api/diagnostic/contracts/' + r.contractId + '/assignments/structure/' + a.id, {
        method: 'PUT',
        headers,
        body: { linkId: r.linkId, version: a.version, changes },
      });
    }
    emit('saved');
  } catch (e: any) {
    error.value = e?.data?.message || 'Не удалось сохранить ячейку.';
  } finally {
    busy.value = false;
  }
}
</script>
<template>
  <form
    class="cell-editor"
    :aria-label="progressHeaders[col]"
    @submit.prevent="save"
    @keydown.esc.stop.prevent="!busy && $emit('close')"
  >
    <fieldset :disabled="busy">
      <legend>{{ progressHeaders[col] }}</legend>
      <template v-if="!workCol">
        <select v-if="col === 2" v-model="value" aria-label="Этап">
          <option v-for="n in row.stages" :key="n" :value="String(n)">{{ n }}</option>
        </select>
        <textarea v-else-if="col === 15" v-model="value" :aria-label="progressHeaders[col]" rows="4" />
        <input
          v-else
          v-model="value"
          :aria-label="progressHeaders[col]"
          :maxlength="col === 6 ? 200 : 16000"
        />
        <label v-if="col === 3">Доп. информация<input v-model="additional" /></label>
      </template>
      <template v-else>
        <label
          >Запись<select v-model="choice">
            <option v-for="e in entries" :key="entryKey(e)" :value="entryKey(e)">
              {{ e.name }} {{ e.kind === 'work' ? '· № ' + e.id : '' }}
            </option>
            <option v-if="choices.length" value="add">Добавить работу</option>
            <option
              v-if="col === 8 && !entries.some((e) => e.kind === 'crew' || e.kind === 'trip')"
              value="crew"
            >
              Бригада по листу
            </option>
          </select></label
        >
        <button
          v-if="mode === 'trip' && entry"
          class="opr-button"
          type="button"
          @click="$emit('trip', entry.id)"
        >
          Открыть командировку
        </button>
        <template v-else-if="mode === 'crew'"
          ><label>Бригада по исходному листу<textarea v-model="note" rows="3" /></label>
          <button type="button" class="opr-button" @click="$emit('review')">
            Сверить командировки
          </button></template
        >
        <template v-else-if="mode === 'add' || (mode === 'work' && !entry?.managed)">
          <label v-if="mode === 'add'"
            >Работа библиотеки<select v-model="catalogId">
              <option v-for="w in choices" :key="w.id" :value="w.id">{{ w.name }}</option>
            </select></label
          >
          <label
            >Плановый исполнитель<select v-model="plan">
              <option value="keep">
                {{
                  originalPlan || (col === 11 && mode === 'add' ? 'Из «АИС конструктив»' : 'Без исполнителя')
                }}
              </option>
              <option v-if="originalPlan" value="">Снять назначение</option>
              <option v-for="p in report.employees" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
            </select></label
          >
          <label v-if="mode === 'work'"
            >Фактический исполнитель<select v-model="fact">
              <option value="keep">{{ entry?.fact || 'Без исполнителя' }}</option>
              <option v-if="entry?.fact" value="">Снять назначение</option>
              <option v-for="p in report.employees" :key="p.id" :value="String(p.id)">{{ p.name }}</option>
            </select></label
          >
          <label
            >{{ col === 11 ? 'Результат чертежа' : 'Примечание к работе'
            }}<textarea v-model="note" rows="3" />
          </label>
        </template>
        <p v-else>
          {{
            entry?.managed
              ? 'Работа управляется в командировке.'
              : 'В библиотеке нет работы для этого столбца.'
          }}
        </p>
      </template>
      <p v-if="error" role="alert">{{ error }}</p>
      <div class="cell-actions">
        <button class="opr-button" type="submit" :disabled="!dirty">Сохранить</button>
        <button class="opr-button" type="button" @click="$emit('close')">Отмена</button>
      </div>
    </fieldset>
  </form>
</template>
<style scoped>
.cell-editor {
  min-width: 15rem;
  max-width: 26rem;
  padding: 0.4rem;
  color: var(--opr-text);
  background: var(--opr-panel);
  font-size: 13px;
}
.cell-editor fieldset,
.cell-editor label {
  display: grid;
  gap: 4px;
  min-width: 0;
}
.cell-editor fieldset {
  gap: 8px;
}
.cell-editor legend {
  font-weight: 600;
}
.cell-editor input,
.cell-editor select,
.cell-editor textarea {
  width: 100%;
  padding: 5px;
  border: 1px solid var(--opr-line);
  border-radius: 4px;
  background: var(--opr-bg, var(--opr-panel));
  color: inherit;
}
.cell-actions {
  display: flex;
  gap: 5px;
}
.cell-editor [role='alert'] {
  color: var(--ui-error, #b43242);
}
</style>
