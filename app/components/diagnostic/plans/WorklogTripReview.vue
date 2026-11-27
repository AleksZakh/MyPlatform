<script setup lang="ts">
import { tripInitials, tripDateLabel } from '~~/shared/utils/diagnostic-trips';
import { structureRequestError } from '~/composables/diagnostic/useStructures';
import type { VisitReview } from '~~/server/services/diagnostic/worklog-trips';
const props = defineProps<{ contractId: number }>();
const emit = defineEmits<{ close: [] }>();
const review = shallowRef<VisitReview | null>(null),
  tripId = ref(0),
  selected = ref<number[]>([]),
  search = ref(''),
  onlyMarked = ref(true),
  busy = ref(false),
  error = ref(''),
  notice = ref('');
const trip = computed(() => review.value?.trips.find((t) => t.id === tripId.value));
const participants = computed(() => new Set(trip.value?.participants.map(tripInitials) || []));
const structures = computed(() => {
  const q = search.value.trim().toLowerCase();
  return (review.value?.structures || [])
    .filter(
      (s) =>
        (!onlyMarked.value || s.crew) &&
        [s.label, s.crew, s.visits.join(' ')].join(' ').toLowerCase().includes(q),
    )
    .map((s) => {
      const people = s.crew
        .split(',')
        .map((n) => tripInitials(n.trim()))
        .filter(Boolean);
      const matching = people.filter((n) => participants.value.has(n)).length;
      return {
        ...s,
        matching,
        exact: !!matching && matching === people.length && matching === participants.value.size,
      };
    })
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.matching - a.matching);
});
watch(tripId, () => {
  selected.value = [];
});
async function load() {
  const data = await $fetch<VisitReview>('/api/diagnostic/structures/import', {
    query: { source: 'visitReview', contractId: props.contractId },
  });
  review.value = data;
  if (!data.trips.some((t) => t.id === tripId.value)) tripId.value = data.trips[0]?.id || 0;
  selected.value = [];
}
async function refresh() {
  busy.value = true;
  error.value = '';
  try {
    await load();
  } catch (e) {
    error.value = structureRequestError(e);
  } finally {
    busy.value = false;
  }
}
async function confirm() {
  if (!trip.value || busy.value || !selected.value.length) return;
  busy.value = true;
  error.value = '';
  notice.value = '';
  try {
    const result = await $fetch<{ added: number }>('/api/diagnostic/structures/import?source=visitReview', {
      method: 'POST',
      headers: { 'x-space-diagnostic': '1' },
      retry: 0,
      body: {
        contractId: props.contractId,
        tripId: trip.value.id,
        version: trip.value.version,
        structureIds: selected.value,
      },
    });
    notice.value = 'Командировка ' + trip.value.number + ' · подтверждено сооружений: ' + result.added;
    await load();
  } catch (e) {
    error.value = structureRequestError(e);
  } finally {
    busy.value = false;
  }
}
onMounted(refresh);
</script>
<template>
  <UModal
    :open="true"
    title="Сверка командировок с сооружениями"
    :description="review ? review.contract + ' от ' + tripDateLabel(review.date) : 'Ход работ'"
    :dismissible="!busy"
    :close="!busy"
    :ui="{content: 'diagnostic-contract-modal odis-work-card odis-worklog-dialog worklog-wide', header: 'ow-chrome', description: 'ow-number', body: 'ow-body', footer: 'ow-chrome ow-footer'}"
    @update:open="
      (v) => {
        if (!v && !busy) emit('close');
      }
    "
  >
    <template #body
      ><div class="review">
        <p v-if="error" role="alert">
          {{ error }} <button type="button" :disabled="busy" @click="refresh">Обновить</button>
        </p>
        <p v-if="notice" role="status">{{ notice }}</p>
        <p v-if="busy && !review">Загрузка командировок…</p>
        <template v-if="review"
          ><p>
            Поездок для сверки {{ review.trips.length }} · Сооружений с полевой отметкой без поездки
            {{ review.structures.filter((s) => s.crew && !s.visits.length).length }}
          </p>
          <template v-if="review.trips.length"
            ><label
              >Командировка<select v-model.number="tripId" :disabled="busy">
                <option v-for="t in review.trips" :key="t.id" :value="t.id">
                  {{ t.number }} · {{ tripDateLabel(t.start) }} — {{ tripDateLabel(t.finish) }} ·
                  {{ t.status === 'COMPLETED' ? 'Закрыта' : 'Запланирована' }} ·
                  {{ t.participants.join(', ') }}
                </option>
              </select></label
            >
            <template v-if="trip"
              ><p>
                <b>Участники</b> · {{ trip.participants.join(', ') || 'Не указаны' }}<br /><b
                  >Место назначения</b
                >
                · {{ trip.destination || '—' }}<br /><b>Задание</b> · {{ trip.assignment || '—' }}
              </p>
              <div class="filters">
                <input
                  v-model="search"
                  placeholder="ИССО, место, сооружение или сотрудник"
                  aria-label="Найти сооружение"
                /><label
                  ><input type="checkbox" v-model="onlyMarked" /> Только с отметкой «Полевые работы»</label
                >
              </div>
              <p>
                Сначала показаны совпадения по составу бригады. Отметьте сооружения, посещение которых
                подтвердили участники.
              </p>
              <div class="scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Выбор</th>
                      <th>Сооружение</th>
                      <th>Бригада из таблицы</th>
                      <th>Связанные поездки</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="s in structures" :key="s.id">
                      <td>
                        <input
                          v-if="!trip.structureIds.includes(s.id)"
                          type="checkbox"
                          :disabled="busy"
                          v-model="selected"
                          :value="s.id"
                          :aria-label="s.label"
                        /><span v-else>✓</span>
                      </td>
                      <td>{{ s.label }}</td>
                      <td>
                        {{ s.crew || '—'
                        }}<small v-if="s.matching">{{
                          s.exact ? 'Весь состав совпадает' : 'Совпало участников: ' + s.matching
                        }}</small>
                      </td>
                      <td>{{ s.visits.join(', ') || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
                <p v-if="!structures.length">По выбранным условиям сооружений нет.</p>
              </div></template
            >
          </template>
          <p v-else>
            В договоре нет поездок без указания сооружений или поездок, ранее привязанных при сверке.
          </p></template
        >
      </div></template
    >
    <template #footer>
      <button type="button" :disabled="busy" @click="emit('close')">Закрыть</button>
      <button type="button" class="ow-primary" :disabled="busy || !selected.length" @click="confirm">Подтвердить посещение ({{ selected.length }})</button>
    </template>
  </UModal>
</template>
<style>
@import "~/assets/css/diagnostic-worklog-dialog.css";
</style>
<style scoped>
.review {
  display: grid;
  gap: 0.7rem;
  font-size: 0.9rem;
}
.review select,
.filters input:not([type='checkbox']) {
  background: var(--contract-field);
  border: 1px solid var(--contract-line);
  border-radius: 4px;
  padding: 0.4rem;
}
.review select {
  display: block;
  width: 100%;
}
.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}
.filters input:not([type='checkbox']) {
  width: min(100%, 22rem);
}
.scroll {
  overflow: auto;
  max-height: 46vh;
}
.scroll table {
  border-collapse: collapse;
  width: 100%;
}
.scroll td,
.scroll th {
  border: 1px solid var(--contract-line);
  padding: 0.3rem;
  text-align: left;
}
.scroll th {
  position: sticky;
  top: 0;
  background: var(--contract-panel);
}
.scroll small {
  display: block;
  color: var(--ui-text-muted);
}
</style>
