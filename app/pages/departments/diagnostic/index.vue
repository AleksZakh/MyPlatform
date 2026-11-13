<script setup lang="ts">
import ContractsWorkspace from '~/components/diagnostic/contracts/ContractsWorkspace.vue';
import WorkLibraryPreview from '~/components/diagnostic/works/WorkLibraryPreview.vue';
import StructuresWorkspace from '~/components/diagnostic/structures/StructuresWorkspace.vue';
import TripsWorkspace from '~/components/diagnostic/trips/TripsWorkspace.vue';
const route=useRoute();
const trips=computed(()=>route.query.module==='trips');
const works=computed(()=>route.query.module==='works');
const structures=computed(()=>route.query.module==='structures');
useHead({title:()=>`${trips.value?'Командировки':structures.value?'Сооружения':works.value?'Библиотека работ':'Договоры'} · Диагностика ИССО · Space`});
</script>
<template><TripsWorkspace v-if="trips"/><StructuresWorkspace v-else-if="structures"/><WorkLibraryPreview v-else-if="works"/><ContractsWorkspace v-else/></template>
