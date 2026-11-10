<script setup lang="ts">
import { computed } from 'vue';
import type { UptsWorkMeta } from '~~/shared/types/upts-object';
import { uptsWorkColours } from '~~/shared/utils/upts-work-colors';
import { workKindNames } from '~~/shared/utils/upts-work-kinds';
const props=defineProps<{meta?:UptsWorkMeta|null;emphasize?:boolean}>();
const colours=computed(()=>uptsWorkColours(props.meta));
const primary=computed(()=>colours.value[0]);
</script>
<template><span class="upts-work-name" :class="{'upts-work-name--coloured':primary,'upts-work-name--bold':emphasize||meta}" :style="primary?{backgroundColor:primary.background,color:primary.foreground}:undefined" :title="workKindNames(meta)||undefined"><slot /><span v-if="colours.length>1" class="upts-work-colour-marks" aria-hidden="true"><i v-for="c in colours" :key="c.key" :style="{backgroundColor:c.background}" /></span></span></template>
<style scoped>
.upts-work-name{overflow-wrap:anywhere}.upts-work-name--bold{font-weight:700}.upts-work-name--coloured{padding:1px 5px;border-radius:3px;box-decoration-break:clone;-webkit-box-decoration-break:clone;line-height:1.45}
.upts-work-colour-marks{display:inline-flex;gap:3px;margin-left:6px;vertical-align:middle}.upts-work-colour-marks i{width:9px;height:9px;border-radius:50%;border:1px solid currentColor;display:inline-block}
@media (forced-colors:active){.upts-work-name--coloured{color:CanvasText!important;background:Canvas!important;outline:1px solid CanvasText}}
</style>
