<script setup lang="ts">
import Modal from './Modal.vue';
defineProps<{ title: string; slide: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
 <USlideover v-if="slide" :open="true" :title="title" side="right" :ui="{ content: 'space-task-slideover w-full sm:max-w-2xl', title: '!text-slate-900', close: '!text-slate-600', body: 'overflow-y-auto' }" @update:open="open => { if (!open) emit('close') }">
  <template #body><div class="work-root"><slot /></div></template>
 </USlideover>
 <Modal v-else :title="title" @close="emit('close')"><slot /></Modal>
</template>

<style>
/* This task drawer deliberately keeps a light surface in either application theme. */
.space-task-slideover{background:#f1f3f5!important;color:#172338!important;--space-bg:#f1f3f5;--space-panel:#ffffff;--space-raised:#e2e8f0;--space-field:#ffffff;--space-text:#172338;--space-muted:#53627a;--space-line:#cbd5e1;--space-field-border:#cbd5e1;--space-accent:#1d4ed8;--space-danger:#b91c1c;--space-danger-bg:#fef2f2;--ui-text-highlighted:#172338;--ui-text-muted:#53627a;--ui-text-dimmed:#53627a;--ui-bg:#ffffff;--ui-text:#172338;--ui-border:#cbd5e1}
.space-task-slideover .work-root{--work-bg:#f1f3f5!important;--work-panel:#ffffff!important;--work-line:#cbd5e1!important;--work-text:#172338!important;--work-muted:#53627a!important;--work-accent:#1d4ed8!important;color:#172338}
.space-task-slideover .work-root input:not([type=checkbox]):not([type=color]),.space-task-slideover .work-root select,.space-task-slideover .work-root textarea{background:#ffffff!important;color:#172338!important;border-color:#cbd5e1!important;color-scheme:light}
.space-task-slideover .work-root .work-danger{color:#b91c1c}
.space-task-slideover .work-root input::placeholder,.space-task-slideover .work-root textarea::placeholder{color:#64748b;opacity:1}
</style>
