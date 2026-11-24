<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { ContractWorkRecord } from '~~/shared/types/diagnostic-contract-works';
import { diagnosticWorkStatus } from '~~/shared/utils/diagnostic-contract-table';
import { tripDateLabel } from '~~/shared/utils/diagnostic-trips';
import { publishWorkChange } from '~/composables/diagnostic/workChanges';
import WorkStatusIcon from './WorkStatusIcon.vue';
import TripDateInput from '../trips/TripDateInput.vue';

const props = defineProps<{
  row: ContractWorkRecord & { hours?: string | null; warning?: string };
  kind: 'contract' | 'structure';
  contractId: number;
  contractNumber: string;
  linkId?: number | null;
  isso?: string;
  canEdit: boolean;
  startEditing?: boolean;
  employees: { id: number; name: string }[];
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const { user } = useUserSession();
const editing = ref(!!props.startEditing && props.canEdit && !props.row.tripManaged),
  pending = ref(false),
  error = ref('');
const groups = [
  {
    title: 'Запланировано',
    executor: 'planExecutor',
    start: 'planStart',
    finish: 'planFinish',
    hours: 'planHours',
  },
  {
    title: 'Фактически',
    executor: 'factExecutor',
    start: 'factStart',
    finish: 'factFinish',
    hours: 'factHours',
  },
] as const;
function initial() {
  const r = props.row;
  return {
    planStart: r.planStart ?? '',
    planFinish: r.planFinish ?? '',
    factStart: r.factStart ?? '',
    factFinish: r.factFinish ?? '',
    planHours: r.planHours ?? '',
    factHours: r.factHours ?? '',
    planExecutor: 'original',
    factExecutor: 'original',
    note: r.note,
    autoComplete: r.autoComplete,
  };
}
const draft = reactive(initial());
const changes = computed(() => {
  const result: Record<string, unknown> = {};
  for (const group of groups) {
    for (const key of [group.start, group.finish, group.hours]) {
      if (draft[key] !== (props.row[key] ?? '')) result[key] = draft[key] || null;
    }
    const key = group.executor;
    if (draft[key] !== 'original') result[key] = draft[key] ? Number(draft[key]) : null;
  }
  if (draft.note !== props.row.note) result.note = draft.note;
  if (draft.autoComplete !== props.row.autoComplete) result.autoComplete = draft.autoComplete;
  return result;
});
const missingExecutor = computed(() => !!(draft.factStart || draft.factFinish) &&
  !(draft.factExecutor === 'original' ? props.row.factExecutor.trim() : draft.factExecutor));
const currentPerson = computed(() => props.employees.find(person => person.id === user.value?.id));
const dirty = computed(() => Object.keys(changes.value).length > 0);
function dismiss(close: boolean) {
  if (pending.value || (editing.value && dirty.value && !window.confirm('Отменить изменения работы?')))
    return;
  if (close) emit('close');
  else {
    Object.assign(draft, initial());
    editing.value = false;
    error.value = '';
  }
}
async function save() {
  if (!dirty.value || pending.value || missingExecutor.value) return;
  pending.value = true;
  error.value = '';
  try {
    await $fetch(`/api/diagnostic/contracts/${props.contractId}/assignments/${props.kind}/${props.row.id}`, {
      method: 'PUT',
      headers: { 'x-space-diagnostic': '1' },
      retry: 0,
      body: { version: props.row.version, linkId: props.linkId, changes: changes.value },
    });
    publishWorkChange();
    emit('saved');
  } catch (e: any) {
    error.value = e?.data?.message || 'Не удалось сохранить работу.';
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <UModal
    open
    :title="kind === 'structure' ? 'Работа по сооружению' : 'Работа с договором'"
    :description="contractNumber"
    :ui="{
      content: 'diagnostic-contract-modal odis-work-card',
      header: 'ow-chrome',
      description: 'ow-number',
      body: 'ow-body',
      footer: 'ow-chrome ow-footer',
    }"
    @update:open="
      (v) => {
        if (!v) dismiss(true);
      }
    "
  >
    <template #body>
      <div class="ow-title">
        <WorkStatusIcon :status="row.status" />
        <h3>{{ row.name }}</h3>
      </div>
      <p class="ow-meta">
        {{ diagnosticWorkStatus(row.status).title }} · Шифр: {{ row.code
        }}<template v-if="isso"> · Код ИССО: {{ isso }}</template>
      </p>
      <p v-if="row.planHours === null && row.hours != null">Трудоёмкость назначения: {{ row.hours }} чел·ч</p>
      <fieldset v-for="group in groups" :key="group.start" :disabled="pending" class="ow-section">
        <legend>{{ group.title }}</legend>
        <label v-if="editing"
          >Исполнитель
          <select v-model="draft[group.executor]">
            <option value="original">{{ row[group.executor] || 'Не назначен' }}</option>
            <option v-if="row[group.executor]" value="">Снять назначение</option>
            <option v-for="person in employees" :key="person.id" :value="String(person.id)">
              {{ person.name }}
            </option>
          </select>
        </label>
        <p v-else>
          Исполнитель: <strong>{{ row[group.executor] || 'Не назначен' }}</strong>
        </p>
        <p v-if="editing && group.executor === 'factExecutor' && missingExecutor" role="alert">
          Для фактических дат выберите исполнителя.
          <button v-if="currentPerson" type="button" class="underline" @click="draft.factExecutor = String(currentPerson.id)">Указать меня ({{ currentPerson.name }})</button>
        </p>
        <div class="ow-fields">
          <div v-for="key in [group.start, group.finish] as const" :key="key">
            <span>{{ key === group.start ? 'Начало' : 'Окончание' }}</span>
            <TripDateInput
              v-if="editing"
              v-model="draft[key]"
              :disabled="pending"
              :label="group.title + ' — ' + (key === group.start ? 'начало' : 'окончание')"
            />
            <div v-else class="ow-value">{{ row[key] ? tripDateLabel(row[key]) : '—' }}</div>
          </div>
          <label
            >Трудоёмкость, чел·ч
            <input
              v-if="editing"
              v-model="draft[group.hours]"
              inputmode="decimal"
              :aria-label="group.title + ' — трудоёмкость'"
            />
            <span v-else class="ow-value">{{ row[group.hours] ?? '—' }}</span>
          </label>
        </div>
      </fieldset>
      <label v-if="editing" class="ow-auto"
        ><input v-model="draft.autoComplete" type="checkbox" :disabled="pending" /> Автозавершение</label
      >
      <p v-else-if="row.autoComplete">Автозавершение включено</p>
      <h4>Критерий приёмки</h4>
      <p class="ow-text">{{ row.criteria || 'Не указан в библиотеке работ' }}</p>
      <h4><label for="odis-work-note">Примечание</label></h4>
      <textarea v-if="editing" id="odis-work-note" v-model="draft.note" rows="3" :disabled="pending" />
      <p v-else class="ow-text">{{ row.note || '—' }}</p>
      <p v-if="row.warning">{{ row.warning }}</p>
      <p v-if="row.tripManaged">Данные этой работы ведутся в разделе «Командировки».</p>
      <p v-if="error" role="alert">{{ error }}</p>
    </template>
    <template #footer>
      <template v-if="editing">
        <button class="ow-primary" :disabled="pending || !dirty || missingExecutor" @click="save">
          {{ pending ? 'Сохранение…' : 'Сохранить' }}
        </button>
        <button :disabled="pending" @click="dismiss(false)">Отмена</button>
      </template>
      <template v-else>
        <button v-if="canEdit && !row.tripManaged" class="ow-primary" @click="editing = true">
          Редактировать
        </button>
        <button @click="dismiss(true)">Закрыть</button>
      </template>
    </template>
  </UModal>
</template>
<style>
.diagnostic-contract-modal.odis-work-card {
  width: min(95vw, 690px);
  max-height: 92dvh;
  --ow-chrome: #e8e8ea;
}
html.dark .odis-work-card {
  --ow-chrome: #465765;
}
.odis-work-card > .ow-chrome {
  padding: 12px 18px;
  background: var(--ow-chrome);
  color: var(--contract-text);
}
.ow-chrome .ow-number {
  font-size: 12px;
  margin-top: 2px;
}
.odis-work-card > .ow-body {
  display: block;
  overflow-y: auto;
  padding: 14px 18px;
}
.ow-title,
.ow-auto,
.ow-footer {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ow-title h3 {
  font-size: 18px;
  font-weight: 600;
}
.ow-meta {
  font-size: 12px;
  margin: 3px 0 10px;
}
.ow-section {
  border: 0;
  border-top: 1px solid var(--contract-line);
  padding: 6px 0;
  min-width: 0;
}
.ow-section legend,
.ow-body h4 {
  font-weight: 600;
  padding-right: 8px;
}
.ow-body h4 {
  margin-top: 10px;
}
.ow-fields {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 6px;
}
.ow-fields > *,
.ow-section label {
  min-width: 0;
  font-size: 13px;
}
.ow-value,
.ow-section input:not([type='date']),
.ow-section select,
.ow-body textarea {
  display: block;
  width: 100%;
  border: 1px solid var(--contract-line);
  background: var(--contract-field);
  border-radius: 3px;
  padding: 4px 7px;
  color: inherit;
}
.ow-section .trip-date-control {
  position: relative;
  display: block;
  width: 100%;
}
.ow-section .trip-date-control .trip-date-text {
  padding-right: 34px;
}
.ow-section .trip-date-calendar {
  position: absolute;
  inset: 1px 1px 1px auto;
  width: 29px;
  display: grid;
  place-items: center;
  background: var(--contract-panel);
}
.ow-section .trip-date-calendar input[type='date'] {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.ow-text {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.ow-footer {
  justify-content: flex-end;
}
.ow-footer button {
  padding: 5px 12px;
  border: 1px solid var(--contract-line);
  border-radius: 4px;
  background: var(--contract-field);
}
.ow-footer .ow-primary {
  color: #fff;
  background: #176b88;
}
.ow-footer button:disabled {
  opacity: 0.55;
}
.ow-body [role='alert'] {
  color: var(--ui-error);
  margin-top: 8px;
}
@media (max-width: 520px) {
  .ow-fields {
    grid-template-columns: 1fr;
  }
  .ow-title h3 {
    font-size: 16px;
  }
}
</style>
