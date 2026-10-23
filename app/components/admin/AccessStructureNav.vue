<script setup lang="ts">
import {computed} from 'vue';
import {isAccessStructureTool,isAccessStructureActive,type NavigationData} from '~~/shared/navigation/catalog';
const route=useRoute();
const {data,error,refresh}=await useFetch<NavigationData>('/api/navigation',{key:'space-navigation'});
const links=computed(()=>(data.value?.tools||[]).filter(isAccessStructureTool));
</script>
<template>
 <nav class="access-structure-nav" aria-label="Доступ и структура">
  <template v-if="!error"><NuxtLink v-for="item in links" :key="item.to" :to="item.to" :aria-current="isAccessStructureActive(item.to,route.path,route.query)?'page':undefined" :class="{'is-active':isAccessStructureActive(item.to,route.path,route.query)}"><Icon v-if="item.icon" :name="item.icon"/><span>{{ item.label }}</span></NuxtLink></template>
  <button v-else @click="refresh()">Не удалось загрузить навигацию. Повторить</button>
 </nav>
</template>
<style scoped>
.access-structure-nav{display:flex;align-items:stretch;gap:22px;flex-shrink:0;overflow-x:auto;white-space:nowrap;padding:0 18px;background:#fff;color:#526073;border-bottom:1px solid #dde3eb;min-height:48px}
.access-structure-nav a{display:inline-flex;gap:7px;align-items:center;padding:12px 0 10px;border-bottom:3px solid transparent;font-size:14px;text-decoration:none;color:inherit}
.access-structure-nav a.is-active{font-weight:700;border-bottom-color:#696cff;color:#5f61e8}
.access-structure-nav a:hover{color:#696cff}.access-structure-nav a:focus-visible,.access-structure-nav button:focus-visible{outline:2px solid #9698ff;outline-offset:-2px}
.access-structure-nav button{border:0;background:transparent;color:inherit;font:inherit;padding:10px;cursor:pointer}
:global(html.dark .access-structure-nav){background:#252b34;color:#b8c4d4;border-color:#465261;color-scheme:dark}
:global(html.dark .access-structure-nav a.is-active){color:#c4c6ff;border-bottom-color:#a3a5ff}
:global(html.dark .access-structure-nav a:hover){color:#e2e4ff}
@media(max-width:640px){.access-structure-nav{gap:16px;padding:0 10px}.access-structure-nav a{font-size:13px}}
</style>
