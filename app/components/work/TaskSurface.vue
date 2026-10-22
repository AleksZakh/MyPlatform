<script setup lang="ts">
import Modal from './Modal.vue';
defineProps<{ title: string; slide: boolean }>();
const emit = defineEmits<{ close: [] }>();
</script>
<template>
 <USlideover v-if="slide" :open="true" :title="title" side="right" :ui="{ content: 'w-full sm:max-w-2xl', body: 'overflow-y-auto' }" @update:open="open => { if (!open) emit('close') }">
  <template #body><div class="work-root"><slot /></div></template>
 </USlideover>
 <Modal v-else :title="title" @close="emit('close')"><slot /></Modal>
</template>
