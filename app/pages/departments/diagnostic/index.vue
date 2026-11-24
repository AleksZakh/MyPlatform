<script setup lang="ts">
import ContractsWorkspace from '~/components/diagnostic/contracts/ContractsWorkspace.vue';
import WorkLibraryPreview from '~/components/diagnostic/works/WorkLibraryPreview.vue';
import StructuresWorkspace from '~/components/diagnostic/structures/StructuresWorkspace.vue';
import TripsWorkspace from '~/components/diagnostic/trips/TripsWorkspace.vue';
import CalendarWorkspace from '~/components/diagnostic/calendar/CalendarWorkspace.vue';
import PlansWorkspace from '~/components/diagnostic/plans/PlansWorkspace.vue';
import JournalWorkspace from '~/components/diagnostic/records/JournalWorkspace.vue';
import TemplatesWorkspace from '~/components/diagnostic/records/TemplatesWorkspace.vue';
const route=useRoute();
const plans=computed(()=>route.query.module==='plans');
const calendar=computed(()=>route.query.module==='calendar');
const trips=computed(()=>route.query.module==='trips');
const works=computed(()=>route.query.module==='works');
const structures=computed(()=>route.query.module==='structures');
useHead({title:()=>`${route.query.module==='journal'?'Журнал событий':route.query.module==='templates'?'Шаблоны работ':plans.value?'Планы и отчёты':calendar.value?'Календарный план':trips.value?'Командировки':structures.value?'Сооружения':works.value?'Библиотека работ':'Договоры'} · Диагностика ИССО · Space`});
</script>
<template><JournalWorkspace v-if="route.query.module==='journal'"/><TemplatesWorkspace v-else-if="route.query.module==='templates'"/><PlansWorkspace v-else-if="plans"/><CalendarWorkspace v-else-if="calendar"/><TripsWorkspace v-else-if="trips"/><StructuresWorkspace v-else-if="structures"/><WorkLibraryPreview v-else-if="works"/><ContractsWorkspace v-else/></template>

<style src="~/assets/css/odis-records.css"></style>
