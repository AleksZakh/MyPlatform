<script setup lang="ts">
import AccessStructureNav from '~/components/admin/AccessStructureNav.vue';
import LiveDepartmentAccess from '~/components/admin/roles/LiveDepartmentAccess.vue';
useSeoMeta({title:'Space — права доступа'});
</script>
<template><div class="live-access-page"><AccessStructureNav/><LiveDepartmentAccess/></div></template>
<style scoped>.live-access-page{min-height:100%;display:flex;flex-direction:column}.live-access-page :deep(.role-preview){flex:1;min-height:0}</style>
