<script setup lang="ts">
import Modal from './Modal.vue';
defineProps<{ title: string; subtitle?: string; slide: boolean; workCard?:boolean; color?: string }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
 <USlideover v-if="slide" :open="true" :title="title" :description="subtitle" side="right"
  :style="color ? {'--task-color':color} : undefined"
  :ui="{ content: 'space-task-slideover w-full sm:max-w-2xl', header: 'space-task-header', title: 'space-task-title', description: 'space-task-subtitle', close: 'space-task-close', body: 'overflow-y-auto' }"
  @update:open="(open: boolean) => { if (!open) emit('close') }">
  <template #title><slot name="title">{{ title }}</slot></template>
  <template #body><div class="work-root"><slot /></div></template>
 </USlideover>
 <Modal v-else :work-card="workCard" :full-height="workCard" :fixed-sections="workCard" :title="title" :subtitle="subtitle" @close="emit('close')"><template #title><slot name="title">{{ title }}</slot></template><slot /></Modal>
</template>
<style>
.space-task-slideover{background:var(--space-panel,#fff)!important;color:var(--space-text,#172338)!important}
.space-task-header{border-top:4px solid var(--task-color,var(--space-accent,#3b82f6))}
.space-task-slideover .space-task-title{font-size:24px;font-weight:700;line-height:1.3;color:var(--space-text,#172338);overflow-wrap:anywhere;padding-right:32px}
.space-task-slideover .space-task-subtitle{font-size:14px;color:var(--space-muted,#53627a);overflow-wrap:anywhere}
.space-task-slideover .space-task-close{color:var(--space-muted,#53627a)}
html.dark .space-task-slideover{color-scheme:dark}
html[data-space-contrast="high"] .space-task-slideover{color-scheme:light}
</style>
