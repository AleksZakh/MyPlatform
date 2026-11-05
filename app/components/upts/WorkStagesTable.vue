<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import type {UptsStageWork} from '~~/shared/types/upts-object';
import {UPTS_WORK_ROLES} from '~~/shared/utils/upts-work-kinds';
import {WORK_STATUSES} from '~~/shared/types/work';
const props=defineProps<{works:UptsStageWork[];stageCount:number}>();
const stages=defineModel<Record<string,number|''>>({required:true});
const selected=ref<string[]>([]),bulkStage=ref<number|''>(1);
watch(()=>props.works.map(w=>w.key),keys=>{selected.value=selected.value.filter(k=>keys.includes(k));});
const allSelected=computed(()=>!!props.works.length && selected.value.length===props.works.length);
const valid=(v:unknown)=>typeof v==='number' && Number.isInteger(v) && v>=1 && v<=props.stageCount;
const hasInvalid=computed(()=>props.works.some(w=>!valid(stages.value[w.key] ?? 1)));
function setStage(key:string,value:number|''){stages.value={...stages.value,[key]:value};}
function bulkApply(){if(!valid(bulkStage.value))return;stages.value={...stages.value,...Object.fromEntries(selected.value.map(k=>[k,bulkStage.value]))};}
</script>
<template>
  <section class="upts-stages" aria-label="Распределение работ по этапам">
    <div class="upts-stage-toolbar">
      <span role="status">Выбрано: {{ selected.length }} из {{ works.length }}</span>
      <label>Этап для выбранных<input v-model.number="bulkStage" type="number" step="any" /></label>
      <button type="button" :disabled="!selected.length || !valid(bulkStage)" @click="bulkApply">Назначить этап</button>
      <button type="button" :disabled="!selected.length" @click="selected=[]">Снять выделение</button>
    </div>
    <p class="work-muted">Этапы работ: от 1 до {{ stageCount }}. Флажки выделяют строки для массового назначения.</p>
    <p v-if="hasInvalid" class="work-error" role="alert">Укажите каждой работе этап от 1 до {{ stageCount }}. При уменьшении количества этапов переназначьте работы с прежних этапов.</p>
    <div class="work-table-wrap">
      <table class="upts-stage-table">
        <caption class="upts-sr-only">Работы и этапы их выполнения</caption>
        <thead><tr><th class="upts-stage-check"><input type="checkbox" aria-label="Выделить все работы" :checked="allSelected" :indeterminate="!!selected.length && !allSelected" @change="selected=allSelected?[]:works.map(w=>w.key)" /></th><th>Работа</th><th>Этап</th><th>Ответственная роль</th><th>Ожидаемый результат</th><th v-if="works.some(w=>w.status)">Состояние</th></tr></thead>
        <tbody><tr v-for="w in works" :key="w.key" :class="{'is-selected':selected.includes(w.key)}">
          <td><input v-model="selected" type="checkbox" :value="w.key" :aria-label="'Выделить: '+w.name" /></td>
          <td>{{ w.name }}</td>
          <td class="upts-stage-number"><input :value="stages[w.key] ?? 1" type="number" min="1" :max="stageCount" step="1" required :aria-label="'Этап работы: '+w.name" :aria-invalid="!valid(stages[w.key] ?? 1)" @input="setStage(w.key,($event.target as HTMLInputElement).value===''?'':Number(($event.target as HTMLInputElement).value))" /></td>
          <td>{{ w.responsibleRole ? UPTS_WORK_ROLES[w.responsibleRole] : 'Не указана' }}</td>
          <td>{{ w.expectedResult || 'Не указан' }}</td>
          <td v-if="works.some(w=>w.status)">{{ WORK_STATUSES[w.status as keyof typeof WORK_STATUSES] || w.status || '—' }}</td>
        </tr></tbody>
      </table>
    </div>
  </section>
</template>
<style scoped>
.upts-stages{min-width:0}.upts-stage-toolbar{display:flex;flex-wrap:wrap;gap:8px;align-items:end;padding:10px;border:1px solid var(--work-line);border-radius:6px;background:var(--space-bg,var(--work-panel))}.upts-stage-toolbar>span{align-self:center;margin-right:auto}.upts-stage-toolbar label{max-width:145px}.upts-stage-table{width:100%;min-width:610px;font-size:13px;border-collapse:collapse;border:1px solid var(--work-line)}.upts-stage-table th,.upts-stage-table td{padding:9px 8px;text-align:left;vertical-align:top;border:1px solid var(--work-line);overflow-wrap:anywhere}.upts-stage-table th{background:var(--space-bg,var(--work-panel));font-weight:600}.upts-stage-table .is-selected{background:var(--space-selection-bg,#dbeafe33)}.upts-stage-number{width:80px;min-width:80px}.upts-stage-check{width:32px}.upts-stage-number input[aria-invalid=true]{border-color:#ef4444}.upts-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
</style>
