<script setup lang="ts">
import type { NavigationData } from '~~/shared/navigation/catalog'
useSeoMeta({ title: 'Space — инструменты' })
const { data, error, status, refresh } = await useFetch<NavigationData>('/api/navigation', { key: 'space-navigation' })
</script>
<template>
  <div class="tools-page"><header><h1>Инструменты</h1><p>Учётные записи, структура организации, права доступа и контроль событий.</p></header>
    <p v-if="error" role="alert">Не удалось загрузить инструменты. <button @click="refresh()">Повторить</button></p>
    <p v-else-if="status === 'pending' && !data" role="status">Загрузка…</p>
    <div v-else class="tools-grid"><NuxtLink v-for="tool in data?.tools ?? []" :key="tool.to" :to="tool.to" class="tool-card"><Icon v-if="tool.icon" :name="tool.icon" class="tool-icon" /><h2>{{ tool.label }}</h2><p>{{ tool.description }}</p><span class="open">Открыть →</span></NuxtLink></div>
    <p v-if="data && !error && !data.tools.length">Нет доступных инструментов.</p>
  </div>
</template>
<style scoped>
.tools-page { min-height:100%; padding:26px; box-sizing:border-box; background:#f6f8fb; color:#172b4d; }.tools-page header { margin-bottom:26px; }h1 { font-size:28px; margin:0 0 10px; }p { color:#64748b; line-height:1.55; } .tools-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:18px; max-width:1500px; }.tool-card { display:flex; flex-direction:column; padding:24px; border:1px solid #dce4ed; border-radius:14px; background:white; box-shadow:0 2px 4px #172b4d0c; text-decoration:none; color:inherit; }.tool-card:hover { border-color:#82b4dc; box-shadow:0 4px 12px #172b4d12; } .tool-icon { font-size:26px; color:#0076bb; margin-bottom:18px; } h2 { font-size:18px; margin:0; }.tool-card p { flex:1; font-size:14px; margin:12px 0 20px; }.open { color:#0076bb; font-weight:600; font-size:14px; }@media(max-width:600px){ .tools-page { padding:16px; }.tools-grid { grid-template-columns:1fr; } }
</style>
