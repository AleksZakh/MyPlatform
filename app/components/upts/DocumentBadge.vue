<script setup lang="ts">
import {computed} from 'vue';
import {documentTypeStyle} from '~~/shared/utils/upts-document-types';
const props=withDefaults(defineProps<{type:string;count?:number}>(),{count:1});
const style=computed(()=>documentTypeStyle(props.type));
</script>
<template><span class="document-badge-group" :title="type+' · '+count" :aria-label="type+': '+count+' файлов'"><span class="document-badge" :class="{'document-stack':count>1,'document-stack-many':count>2}" :style="{'--document-bg':style.background,'--document-text':style.color}">{{ style.label }}</span><b v-if="count>1" class="document-count">{{ count }}</b></span></template>
<style scoped>
.document-badge-group{display:inline-flex;align-items:center;gap:5px;padding:4px 5px 3px 0;white-space:nowrap;vertical-align:middle}.document-badge{position:relative;isolation:isolate;display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:23px;padding:0 6px;background:var(--document-bg);color:var(--document-text);border:1px solid color-mix(in srgb,var(--document-text) 35%,var(--document-bg));border-radius:4px;font-size:11px;font-weight:650;line-height:1;box-sizing:border-box}.document-stack{margin:4px 4px 0 0;box-shadow:2px -2px 0 0 var(--document-bg),3px -3px 0 0 var(--document-text)}.document-stack-many{box-shadow:2px -2px 0 0 var(--document-bg),3px -3px 0 0 var(--document-text),5px -5px 0 0 var(--document-bg),6px -6px 0 0 var(--document-text)}.document-count{font-size:12px;color:var(--work-text);font-variant-numeric:tabular-nums}
</style>
