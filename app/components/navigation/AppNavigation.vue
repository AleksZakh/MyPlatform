<script setup lang="ts">
import { computed } from 'vue'
import AdminCacheControl from './AdminCacheControl.vue'
import { breadcrumbs, type NavigationData } from '~~/shared/navigation/catalog'
const route = useRoute()
const router = useRouter()
const { data, error, refresh } = await useFetch<NavigationData>('/api/navigation', { key: 'space-navigation', watch: [() => route.fullPath] })
const items = computed(() => breadcrumbs(route.path, route.query, data.value?.departments,
  typeof route.meta.breadcrumb === 'string' ? route.meta.breadcrumb : undefined))
async function jump(event: Event) {
  const element = event.target as HTMLSelectElement
  const to = element.value
  element.value = ''
  if (data.value?.sections.some(s => s.to === to) || data.value?.tools.some(s => s.to === to)) await router.push(to)
}
</script>
<template>
  <div class="app-navigation">
    <nav aria-label="Хлебные крошки"><ol><li v-for="(item,index) in items" :key="item.to"><span v-if="index" aria-hidden="true" class="separator">›</span><span v-if="index === items.length - 1 || !item.to" :aria-current="index === items.length - 1 ? 'page' : undefined">{{ item.label }}</span><NuxtLink v-else :to="item.to">{{ item.label }}</NuxtLink></li></ol></nav>
    <label v-if="data && !error" class="switcher"><span>Перейти в</span><select aria-label="Перейти в раздел" @change="jump"><option value="">Выберите раздел…</option><optgroup label="Разделы"><option v-for="item in data.sections" :key="item.to" :value="item.to">{{ item.label }}</option></optgroup><optgroup v-if="data.tools.length" label="Инструменты"><option v-for="item in data.tools" :key="item.to" :value="item.to">{{ item.label }}</option></optgroup></select></label>
    <AdminCacheControl v-if="data?.isSystemAdmin && !error" />
    <button v-if="error" type="button" @click="refresh()">Обновить навигацию</button>
  </div>
</template>
<style scoped>
.app-navigation { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px 16px; padding:9px 16px; background:#fff; border-bottom:1px solid #dde5ee; color:#52637a; font-size:14px; }
nav { min-width:0; }ol { display:flex; flex-wrap:wrap; gap:8px; padding:0; margin:0; list-style:none; }li { display:flex; gap:8px; align-items:center; overflow-wrap:anywhere; } a { color:#2563b8; text-decoration:none; } a:hover { text-decoration:underline; } [aria-current] { font-weight:600; color:#172b4d; }.separator { color:#8190a5; }.switcher { display:flex; gap:8px; align-items:center; }select,button { font:inherit; border:1px solid #bdcada; border-radius:6px; padding:6px 8px; background:white; color:#25486d; max-width:100%; }@media(max-width:600px) { .switcher { width:100%; }.switcher select { flex:1; min-width:0; } }
</style>
