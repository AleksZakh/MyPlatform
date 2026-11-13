<script setup lang="ts">
import WorkStatusIcon from './WorkStatusIcon.vue';
import {workStatusLegend} from '~~/shared/utils/diagnostic-contract-table';
defineProps<{unknown?:boolean}>();
</script>
<template>
 <div class="odis-work-legend" aria-label="Расшифровка статусов работ">
  <span v-for="status in workStatusLegend" :key="status.key"><WorkStatusIcon :status="status.key"/>{{ status.label }}</span>
  <span v-if="unknown"><WorkStatusIcon/>Неизвестный / не указан</span>
 </div>
</template>
<style>
.odis-work-legend{display:flex;flex-wrap:wrap;gap:4px 14px;flex-shrink:0;margin:0 0 6px;font-size:12px;line-height:20px;color:var(--contract-text,#253647)}
.odis-work-legend>span{display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
</style>
