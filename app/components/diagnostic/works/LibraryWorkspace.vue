<script setup lang="ts">
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
import WorkLibraryPreview from './WorkLibraryPreview.vue';
import TemplatesWorkspace from '../records/TemplatesWorkspace.vue';
defineProps<{templates:boolean}>();
</script>
<template>
 <section class="library-shell">
  <DiagnosticModuleTabs active="works"/>
  <h1>Библиотека работ</h1>
  <div class="library-layout">
   <nav aria-label="Библиотека работ">
    <NuxtLink to="/departments/diagnostic?module=works" :aria-current="!templates?'page':undefined"><Icon name="lucide:clipboard-list"/>Список работ</NuxtLink>
    <NuxtLink to="/departments/diagnostic?module=templates" :aria-current="templates?'page':undefined"><Icon name="lucide:list-tree"/>Шаблон работ</NuxtLink>
   </nav>
   <div class="library-pane"><TemplatesWorkspace v-if="templates"/><WorkLibraryPreview v-else/></div>
  </div>
 </section>
</template>
<style scoped>
.library-shell{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--ui-bg);color:var(--ui-text)}
.library-shell>h1{padding:6px 12px;text-align:center;font-size:20px;font-weight:600;border-bottom:1px solid var(--ui-border)}
.library-layout{display:grid;grid-template-columns:minmax(145px,180px) minmax(0,1fr);flex:1;min-height:0}
.library-layout>nav{display:flex;flex-direction:column;gap:6px;padding:12px 6px;border-right:1px solid var(--ui-border);background:var(--ui-bg-muted)}
.library-layout a{display:flex;align-items:center;gap:9px;padding:10px;border-radius:4px;border-inline-start:3px solid transparent;color:inherit}
.library-layout a[aria-current=page]{border-color:#2996b7;background:var(--ui-bg-elevated);font-weight:600}
.library-layout a:focus-visible{outline:2px solid #2996b7}
.library-pane{min-width:0;min-height:0;overflow:auto}
@media(max-width:700px){.library-layout{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr)}.library-layout>nav{flex-direction:row;border:0;border-bottom:1px solid var(--ui-border);padding:4px}}
</style>
