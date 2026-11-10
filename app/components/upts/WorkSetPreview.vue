<script setup lang="ts">
import WorkName from './WorkName.vue';
import type { UptsWorkDefinition } from '~~/shared/types/upts-library';
import { UPTS_WORK_ROLES } from '~~/shared/utils/upts-work-kinds';
defineProps<{works:UptsWorkDefinition[];workKindKey?:string|null}>();
</script>
<template><div class="work-table-wrap"><table class="upts-work-preview"><thead><tr><th>Работа</th><th>Ответственная роль</th><th>Ожидаемый результат</th></tr></thead><tbody><tr v-for="w in works" :key="w.id"><td><WorkName :meta="{workKindKey}" emphasize>{{ w.name }}</WorkName></td><td>{{ w.responsibleRole ? UPTS_WORK_ROLES[w.responsibleRole] : 'Не указана' }}</td><td>{{ w.expectedResult || 'Не указан' }}</td></tr></tbody></table></div></template>
<style scoped>.upts-work-preview{width:100%;font-size:13px;border-collapse:collapse}.upts-work-preview th,.upts-work-preview td{padding:8px;text-align:left;vertical-align:top;border-bottom:1px solid var(--work-line);overflow-wrap:anywhere}.upts-work-preview th{font-weight:600}</style>
