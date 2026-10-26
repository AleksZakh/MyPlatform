<script setup lang="ts">
import ContractsWorkspace from '~/components/diagnostic/contracts/ContractsWorkspace.vue';
import WorkLibraryPreview from '~/components/diagnostic/works/WorkLibraryPreview.vue';
const route=useRoute();
const works=computed(()=>route.query.module==='works');
useHead({title:()=>`${works.value?'Библиотека работ':'Договоры'} · Диагностика ИССО · Space`});
</script>
<template><WorkLibraryPreview v-if="works"/><ContractsWorkspace v-else/></template>
