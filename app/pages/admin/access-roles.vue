<script setup lang="ts">
import AccessStructureNav from '~/components/admin/AccessStructureNav.vue';
import RolePolicyPreview from '~/components/admin/roles/RolePolicyPreview.vue';
useSeoMeta({title:'Space — роли подразделений'});
</script>
<template><div class="access-roles-page"><AccessStructureNav/><RolePolicyPreview/></div></template>
<style scoped>.access-roles-page{min-height:100%;display:flex;flex-direction:column}.access-roles-page :deep(.role-preview){flex:1;min-height:0}</style>
