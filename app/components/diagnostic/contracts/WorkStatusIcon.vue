<script setup lang="ts">
import {computed} from 'vue';
import {diagnosticWorkStatus} from '~~/shared/utils/diagnostic-contract-table';
const props=defineProps<{status?:string|null}>();
const state=computed(()=>diagnosticWorkStatus(props.status));
</script>
<template>
 <span :class="['odis-work-status','odis-work-status--'+state.key]" role="img" :aria-label="state.title" :title="state.title">
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
   <path v-if="state.key==='unplanned'" d="M14 3H6v18h12V7l-4-4Zm0 0v5h4"/>
   <g v-else-if="state.key==='planned'"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18M7 14h2m4 0h2m-8 4h2m4 0h2"/></g>
   <g v-else-if="state.key==='in_progress'"><path d="M6 3h12M6 21h12M7 3v4l10 10v4M17 3v4L7 17v4M9 18h6"/></g>
   <g v-else-if="state.key==='completed'"><circle cx="12" cy="12" r="9"/><path d="m7 12 3 3 7-7"/></g>
   <g v-else-if="state.key==='overdue'"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M12 7v6m0 4h.01"/></g>
   <g v-else><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 5m0 3h.01"/></g>
  </svg>
 </span>
</template>
<style>
.odis-work-status{display:inline-flex;align-items:center;justify-content:center;vertical-align:middle;width:20px;height:20px;flex:0 0 20px;color:#667589}
.odis-work-status--planned{color:#2563eb}.odis-work-status--in_progress{color:#b76a06}.odis-work-status--completed{color:#16803c}.odis-work-status--overdue{color:#dc2626}
.dark .odis-work-status{color:#bfccd7}.dark .odis-work-status--planned{color:#8ab4ff}.dark .odis-work-status--in_progress{color:#ffc36d}.dark .odis-work-status--completed{color:#75dd94}.dark .odis-work-status--overdue{color:#ff9292}
.contract-compact-table .odis-status-cell{text-align:center;width:44px;min-width:44px}
</style>
