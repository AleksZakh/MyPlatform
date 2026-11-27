<script setup lang="ts">
import { computed, ref } from 'vue';
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import type { WorkRecord } from '~~/shared/types/diagnostic-works';
import { reportGroup, reportParts, type ReportMembership } from '~~/shared/utils/diagnostic-report-parts';
import { workError } from '~/composables/diagnostic/useWorkLibrary';

const props = defineProps<{ works: WorkRecord[]; initialGroup: 'Полевые работы' | 'АИС Конструктив' }>();
const emit = defineEmits<{ close: []; saved: [WorkRecord[]] }>();
const group = ref(props.initialGroup);
const query = ref(''), busy = ref(false), error = ref('');
const rows = ref(props.works.map(w => ({ id: w.id, version: w.version, code: w.code, name: w.name,
  fieldWork: !!w.fieldWork, reportPart: w.reportPart || '' })));
const original = new Map(rows.value.map(w => [w.id, { ...w }]));
const changed = computed(() => rows.value.filter(w => {
  const old = original.get(w.id)!;
  return w.fieldWork !== old.fieldWork || w.reportPart !== old.reportPart;
}));
const shown = computed(() => rows.value.filter(w =>
  (w.code + ' ' + w.name).toLocaleLowerCase('ru').includes(query.value.trim().toLocaleLowerCase('ru'))));
const field = computed(() => group.value === 'Полевые работы');
const roles = computed(() => reportParts.filter(p => p.group === group.value));
function toggleField(w: ReportMembership, event: Event) {
  w.fieldWork = (event.target as HTMLInputElement).checked;
  if (!w.fieldWork && reportGroup(w.reportPart) === 'Полевые работы') w.reportPart = '';
}
function changeRole(w: ReportMembership, event: Event) {
  const control = event.target as HTMLSelectElement;
  if (w.reportPart && reportGroup(w.reportPart) !== group.value && control.value &&
      !window.confirm('Заменить составляющую «' + reportParts.find(p => p.key === w.reportPart)?.label +
        '» на «' + roles.value.find(p => p.key === control.value)?.label + '»?')) {
    control.value = '';
    return;
  }
  w.reportPart = control.value;
}
function canClose() {
  return !busy.value && (!changed.value.length || window.confirm('Закрыть без сохранения состава категорий?'));
}
onBeforeRouteLeave(canClose);
onBeforeRouteUpdate((to, from) => to.query.module === from.query.module || canClose());
async function save() {
  if (busy.value || !changed.value.length) return;
  busy.value = true; error.value = '';
  try {
    const updated = await $fetch<WorkRecord[]>('/api/diagnostic/works/report-memberships', {
      method: 'PUT', retry: 0, headers: { 'x-space-diagnostic': '1' },
      body: changed.value.map(({ id, version, fieldWork, reportPart }) => ({ id, version, fieldWork, reportPart })),
    });
    emit('saved', updated);
  } catch (e) { error.value = workError(e); }
  finally { busy.value = false; }
}
</script>
<template>
  <UModal open title="Состав категорий" description="Библиотека работ ОДИС" :close="!busy" :dismissible="!busy"
    :ui="{content:'diagnostic-contract-modal odis-work-card odis-categories', header:'ow-chrome', description:'ow-number', body:'ow-body', footer:'ow-chrome ow-footer'}"
    @update:open="v => { if (!v && canClose()) emit('close') }">
    <template #body>
      <fieldset :disabled="busy">
        <div class="category-filters">
          <label>Категория<select v-model="group"><option>Полевые работы</option><option value="АИС Конструктив">АИС конструктив</option></select></label>
          <label>Поиск<input v-model="query" type="search" placeholder="Шифр или название работы"/></label>
        </div>
        <div class="category-list">
          <table>
            <thead><tr><th v-if="field">Входит</th><th>Работа</th><th>Составная часть отчёта</th></tr></thead>
            <tbody>
              <tr v-for="w in shown" :key="w.id">
                <td v-if="field"><input type="checkbox" :aria-label="'Полевые работы · '+w.name" :checked="w.fieldWork" @change="toggleField(w,$event)"/></td>
                <td>{{ w.code }} · {{ w.name }}</td>
                <td><select :aria-label="'Составная часть · '+w.name" :disabled="field && !w.fieldWork"
                  :value="reportGroup(w.reportPart)===group ? w.reportPart : ''" @change="changeRole(w,$event)">
                  <option value="">{{ field && w.fieldWork ? 'Без составляющей' : 'Не входит' }}</option>
                  <option v-for="p in roles" :key="p.key" :value="p.key">{{ p.label }}</option>
                </select></td>
              </tr>
              <tr v-if="!shown.length"><td :colspan="field ? 3 : 2">Работы не найдены.</td></tr>
            </tbody>
          </table>
        </div>
      </fieldset>
      <p v-if="error" role="alert">{{ error }}</p>
    </template>
    <template #footer>
      <button type="button" :disabled="busy" @click="canClose() && emit('close')">Отмена</button>
      <button type="button" class="ow-primary" :disabled="busy || !changed.length" @click="save">Сохранить</button>
    </template>
  </UModal>
</template>
<style>
@import "~/assets/css/diagnostic-contracts.css";
@import "~/assets/css/diagnostic-work-card.css";
.diagnostic-contract-modal.odis-categories { width: min(95vw, 52rem); }
.odis-categories fieldset { min-width: 0; }
.odis-categories .category-filters { display:flex; flex-wrap:wrap; gap:8px 16px; margin-bottom:10px; }
.odis-categories .category-filters label { display:grid; gap:3px; flex:1; font-size:13px; }
.odis-categories :is(select,input:not([type=checkbox])) { width:100%; border:1px solid var(--contract-line); border-radius:4px; background:var(--contract-field); color:inherit; padding:5px; }
.odis-categories .category-list { max-height:54dvh; overflow:auto; border:1px solid var(--contract-line); }
.odis-categories table { border-collapse:separate; border-spacing:0; width:100%; font-size:13px; }
.odis-categories :is(td,th) { padding:4px 8px; text-align:left; border-bottom:1px solid var(--contract-line); }
.odis-categories th { position:sticky; top:0; background:var(--contract-panel); }
.odis-categories td:last-child { width:38%; }
</style>
