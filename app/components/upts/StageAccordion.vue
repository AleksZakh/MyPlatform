<script setup lang="ts">
import type {AccordionItem} from '@nuxt/ui';
import {computed,ref,watch,nextTick} from 'vue';
import type {UptsObjectStage} from '~~/shared/types/upts-object';
import {stageLabel} from '~~/shared/utils/upts-object-stages';
import {formatWorkDate} from '~~/shared/utils/work-board';
const props=defineProps<{stages:UptsObjectStage[]}>();
const opened=ref<string[]>([]);
const items=computed<AccordionItem[]>(()=>props.stages.map(stage=>({value:String(stage.number),label:stageLabel(stage),stage})));
watch(()=>props.stages.map(s=>String(s.number)),(keys,old=[])=>{opened.value=[...opened.value.filter(k=>keys.includes(k)),...keys.filter(k=>!old.includes(k))];},{immediate:true});
function revealInvalid(event:Event){const target=event.target as HTMLElement;const value=target.closest<HTMLElement>('[data-upts-stage]')?.dataset.uptsStage;if(value&&!opened.value.includes(value)){event.preventDefault();opened.value=[...opened.value,value];nextTick(()=>target.focus());}}
</script>
<template>
 <UAccordion v-model="opened" :items="items" type="multiple" :unmount-on-hide="false" class="upts-stage-accordion" @invalid.capture="revealInvalid" :ui="{trigger:'upts-stage-trigger',body:'upts-stage-body'}">
  <template #default="{item}"><span class="upts-stage-heading"><strong>{{ item.label }}</strong><small>{{ formatWorkDate(item.stage.startDate)||'Начало не задано' }} — {{ formatWorkDate(item.stage.endDate)||'Окончание не задано' }}</small></span></template>
  <template #body="{item}"><div :data-upts-stage="item.value"><slot :stage="item.stage" /></div></template>
 </UAccordion>
</template>
<style scoped>
.upts-stage-accordion{min-width:0;width:100%}.upts-stage-heading{display:flex;align-items:center;flex-wrap:wrap;gap:6px 18px;text-align:left;width:100%}.upts-stage-heading strong{font-size:13px;color:var(--work-text)}.upts-stage-heading small{font-size:11px;color:var(--work-muted);margin-left:auto}.upts-stage-accordion :deep(.upts-stage-trigger){display:flex;width:100%;padding:9px 12px;border:1px solid var(--work-line);border-radius:6px;background:color-mix(in srgb,var(--work-line) 22%,var(--work-panel));margin-top:6px;cursor:pointer}.upts-stage-accordion :deep(.upts-stage-body){padding:8px 2px 12px}
</style>
