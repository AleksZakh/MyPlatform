<script setup lang="ts">
import AccessStructureNav from '~/components/admin/AccessStructureNav.vue';
import LiveDepartmentAccess from '~/components/admin/roles/LiveDepartmentAccess.vue';
useSeoMeta({title:'Space — права доступа'});
</script>
<template><div class="live-access-page"><AccessStructureNav/><LiveDepartmentAccess/></div></template>
<style scoped>.live-access-page{height:100%;min-height:0;min-width:0;display:flex;flex-direction:column;overflow:hidden}.live-access-page :deep(.role-preview){flex:1;min-height:0}</style>
