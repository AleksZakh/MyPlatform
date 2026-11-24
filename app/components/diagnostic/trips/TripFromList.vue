<script setup lang="ts">
import {onMounted,ref} from 'vue';
import type {TripRecord} from '~~/shared/types/diagnostic-trips';
import TripEditor from './TripEditor.vue';
const props=defineProps<{id:number;contractId:number}>();
defineEmits<{close:[]}>();
const trip=ref<TripRecord>(), error=ref('');
async function load(){
  error.value='';
  try {
    const record=await $fetch<TripRecord>('/api/diagnostic/trips/'+props.id);
    if(record.contractId!==props.contractId) throw Error('Командировка больше не относится к выбранному договору.');
    trip.value=record;
  }catch(e:any){error.value=e?.data?.message||e.message||'Не удалось открыть командировку.';}
}
onMounted(load);
</script>
<template>
 <TripEditor v-if="trip" :trip="trip" :catalog="{contracts:[{id:trip.contractId,number:trip.contractNumber}],executors:[{id:trip.executorId,name:trip.executor}],participants:trip.participants,warning:null}" read-only @close="$emit('close')"/>
 <UModal v-else open title="Командировка" @update:open="v=>{if(!v)$emit('close')}">
  <template #body><p v-if="error" role="alert">{{error}} <button @click="load">Повторить</button></p><p v-else role="status">Загрузка командировки…</p></template>
 </UModal>
</template>
<style src="~/assets/css/diagnostic-trips.css"></style>
