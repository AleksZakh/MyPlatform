<script setup lang="ts">
import ContractsWorkspace from '~/components/diagnostic/contracts/ContractsWorkspace.vue';
import WorkLibraryPreview from '~/components/diagnostic/works/WorkLibraryPreview.vue';
import StructuresWorkspace from '~/components/diagnostic/structures/StructuresWorkspace.vue';
const route=useRoute();
const works=computed(()=>route.query.module==='works');
const structures=computed(()=>route.query.module==='structures');
useHead({title:()=>`${structures.value?'Сооружения':works.value?'Библиотека работ':'Договоры'} · Диагностика ИССО · Space`});
</script>
<template><StructuresWorkspace v-if="structures"/><WorkLibraryPreview v-else-if="works"/><ContractsWorkspace v-else/></template>
