<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
defineProps<{title:string}>(); const emit=defineEmits<{close:[]}>(); const dialog=ref<HTMLDialogElement>();
let previous:HTMLElement|null=null;
onMounted(()=>{previous=document.activeElement as HTMLElement;dialog.value?.showModal();});
onBeforeUnmount(()=>{dialog.value?.close();previous?.focus();});
</script>
<template>
 <Teleport to="body"><dialog ref="dialog" class="work-root work-dialog" @close="emit('close')">
  <header class="work-modal-head"><h2>{{ title }}</h2><button type="button" class="work-icon-btn" aria-label="Закрыть" @click="emit('close')">×</button></header>
  <div class="work-modal-body"><slot /></div>
 </dialog></Teleport>
</template>
