<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
defineProps<{title:string;subtitle?:string;icon?:string;fullHeight?:boolean;wide?:boolean;fixedSections?:boolean}>(); const emit=defineEmits<{close:[]}>(); const dialog=ref<HTMLDialogElement>();
let previous:HTMLElement|null=null;
onMounted(()=>{previous=document.activeElement as HTMLElement;dialog.value?.showModal();});
onBeforeUnmount(()=>{dialog.value?.close();previous?.focus();});
</script>
<template>
 <Teleport to="body"><dialog ref="dialog" class="work-root work-dialog" :class="{'work-dialog-full-height':fullHeight,'work-dialog-wide':wide,'work-dialog-fixed-sections':fixedSections}" @close="emit('close')">
  <header class="work-modal-head"><div><h2 :class="{'work-modal-title-with-icon':icon}"><Icon v-if="icon" :name="icon" aria-hidden="true" /><slot name="title">{{ title }}</slot></h2><p v-if="subtitle" class="work-muted">{{ subtitle }}</p></div><button type="button" class="work-icon-btn" aria-label="Закрыть" @click="emit('close')">×</button></header>
  <div class="work-modal-body"><slot /></div>
 </dialog></Teleport>
</template>
<style scoped>
.work-modal-title-with-icon{display:flex;align-items:center;gap:10px}.work-modal-title-with-icon :deep(.iconify){width:26px;height:26px;flex-shrink:0}
.work-dialog-fixed-sections .work-modal-body{overflow:hidden;display:flex;flex-direction:column;padding:14px 20px}
.work-dialog-wide{width:min(1120px,calc(100vw - 28px))}
.work-dialog-full-height{height:calc(100dvh - 32px);max-height:calc(100dvh - 32px)}
.work-dialog-full-height[open]{display:flex;flex-direction:column}
.work-dialog-full-height .work-modal-head{flex:0 0 auto}
.work-dialog-full-height .work-modal-body{flex:1 1 auto;min-height:0;max-height:none}
@media(max-width:520px){.work-dialog-full-height{height:calc(100dvh - 20px);max-height:calc(100dvh - 20px)}}
</style>
