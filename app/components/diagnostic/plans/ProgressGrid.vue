<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import ProgressCell from './ProgressCell.vue';
import TripFromList from '../trips/TripFromList.vue';
import { progressHeaders, type ProgressReport, type ProgressRow } from '~~/shared/utils/diagnostic-progress';
const props = defineProps<{
  report: ProgressReport;
  inactive: boolean;
  contractEdit: boolean;
  structureEdit: boolean;
}>();
const emit = defineEmits<{ editing: [boolean]; saved: [number]; review: [number] }>();
const editing = ref<{ link: number; col: number } | null>(null),
  trip = ref<{ id: number; contractId: number } | null>(null);
const page = ref(1),
  size = 40,
  pages = computed(() => Math.max(1, Math.ceil(props.report.rows.length / size)));
const visible = computed(() => props.report.rows.slice((page.value - 1) * size, page.value * size));
watch(
  () => props.report,
  () => {
    page.value = Math.min(page.value, pages.value);
  },
);
function editable(r: ProgressRow, i: number) {
  return (
    !props.inactive &&
    !r.structure.retired &&
    ([3, 4, 6, 7, 15].includes(i)
      ? props.structureEdit && !(i === 6 && !!r.structure.code)
      : props.contractEdit)
  );
}
function start(r: ProgressRow, col: number) {
  if (!editing.value && editable(r, col)) {
    editing.value = { link: r.linkId, col };
    emit('editing', true);
  }
}
function close() {
  editing.value = null;
  emit('editing', false);
}
function saved(id: number) {
  close();
  emit('saved', id);
}
</script>
<template>
  <div class="grid-box">
    <div class="grid-scroll">
      <table v-if="visible.length" aria-label="Ход работ">
        <thead>
          <tr>
            <th v-for="h in progressHeaders" :key="h" scope="col">{{ h }}</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="(r, j) in visible" :key="r.linkId">
            <tr v-if="!j || visible[j - 1]?.contractId !== r.contractId" class="contract-band">
              <th :colspan="progressHeaders.length" scope="rowgroup">{{ r.contractNumber }}</th>
            </tr>
            <tr :class="{ started: r.active }">
              <td v-for="(h, i) in progressHeaders" :key="h">
                <ProgressCell
                  v-if="editing?.link === r.linkId && editing.col === i"
                  :row="r"
                  :col="i"
                  :report="report"
                  @close="close"
                  @saved="saved(r.structure.id)"
                  @review="
                    close();
                    emit('review', r.contractId);
                  "
                  @trip="
                    (id) => {
                      close();
                      trip = { id, contractId: r.contractId };
                    }
                  "
                />
                <button
                  v-else-if="editable(r, i)"
                  class="value"
                  :disabled="!!editing"
                  type="button"
                  :aria-label="h + ' · ' + (r.values[i] || 'Заполнить')"
                  @click="start(r, i)"
                >
                  {{ r.values[i] || '—' }}
                </button>
                <span v-else class="value">{{ r.values[i] || '—' }}</span>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <p v-else>По выбранным условиям сооружений нет.</p>
    </div>
    <footer>
      <span>Сооружений {{ report.rows.length }}</span
      ><small><i aria-hidden="true" /> Работы ведутся или завершены</small
      ><template v-if="pages > 1"
        ><button class="opr-button" :disabled="page === 1 || !!editing" @click="page--">Назад</button
        >{{ page }} / {{ pages
        }}<button class="opr-button" :disabled="page === pages || !!editing" @click="page++">
          Далее
        </button></template
      >
    </footer>
    <TripFromList
      v-if="trip"
      :id="trip.id"
      :contract-id="trip.contractId"
      :edit="contractEdit"
      @close="trip = null"
    />
  </div>
</template>
<style scoped>
.grid-box {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.grid-scroll {
  overflow: auto;
  min-height: 0;
  flex: 1;
}
.grid-scroll p {
  padding: 1rem;
}
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 13px;
  color: var(--opr-text);
  text-align: left;
}
th,
td {
  border-right: 1px solid var(--opr-line);
  border-bottom: 1px solid var(--opr-line);
  vertical-align: top;
}
thead th {
  position: sticky;
  top: 0;
  background: var(--opr-panel);
  z-index: 1;
  padding: 6px;
  font-weight: 600;
}
.contract-band th {
  background: var(--opr-panel);
  padding: 4px 7px;
}
.value {
  display: block;
  text-align: left;
  white-space: pre-line;
  overflow-wrap: anywhere;
  min-width: 4rem;
  max-width: 25rem;
  padding: 4px 6px;
  font: inherit;
  color: inherit;
}
thead th:nth-child(7),
td:nth-child(7) .value {
  white-space: nowrap;
  overflow-wrap: normal;
  word-break: normal;
}
td:nth-child(7) .value {
  min-width: max-content;
  max-width: none;
}
td:nth-child(4) .value,
td:nth-child(n + 9) .value {
  min-width: 10rem;
}
button.value {
  width: 100%;
  height: 100%;
  cursor: pointer;
}
button.value:hover,
button.value:focus-visible {
  outline: 1px solid var(--ui-primary);
  outline-offset: -1px;
}
.started td {
  background: color-mix(in srgb, #68b889 18%, var(--opr-panel));
}
footer {
  padding: 5px 10px;
  border-top: 1px solid var(--opr-line);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
footer span {
  margin-right: auto;
}
footer small {
  color: var(--opr-muted);
}
footer i {
  display: inline-block;
  width: 12px;
  height: 12px;
  background: color-mix(in srgb, #68b889 18%, var(--opr-panel));
  border: 1px solid var(--opr-line);
  vertical-align: middle;
}
</style>
