<script setup lang="ts">
import { computed } from 'vue';
defineProps<{isCollapsed:boolean}>();const route=useRoute();
const destination=computed(()=>{const match=route.path.match(/^\/departments\/([^/]+)/);return match?'/departments/'+match[1]+'/projects':'/projects';});
</script>
<template><NuxtLink :to="destination" title="Задачи и проекты" class="work-sidebar-link"><Icon name="lucide:kanban" size="22"/><span v-if="!isCollapsed">Задачи и проекты</span></NuxtLink></template>
<style scoped>.work-sidebar-link{display:flex;align-items:center;gap:12px;padding:10px;border-radius:8px;white-space:normal;line-height:1.25;font-size:15px}.work-sidebar-link:hover{background:#2563eb18}.work-sidebar-link svg{flex-shrink:0}.router-link-active{background:#2563eb18;font-weight:600}</style>
