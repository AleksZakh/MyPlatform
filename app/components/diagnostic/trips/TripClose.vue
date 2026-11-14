<script setup lang="ts">
import type {TripRecord,TripCatalog} from '~~/shared/types/diagnostic-trips';
import TripEditor from './TripEditor.vue';
defineProps<{trip:TripRecord;catalog:TripCatalog}>();
const emit=defineEmits<{close:[];saved:[TripRecord]}>();
</script>
<template><TripEditor :trip="trip" :catalog="catalog" read-only closing @close="emit('close')" @saved="row=>emit('saved',row)"/></template>
