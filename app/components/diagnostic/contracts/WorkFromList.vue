<script setup lang="ts">
import {onMounted,ref} from 'vue';
import type {CalendarRow,CalendarEmployee} from '~~/shared/types/diagnostic-calendar';
import type {ContractWorkRecord} from '~~/shared/types/diagnostic-contract-works';
import type {ContractStructureWorkRecord} from '~~/shared/types/diagnostic-contract-details';
import WorkCard from './WorkCard.vue';
import TripFromList from '../trips/TripFromList.vue';
const props=defineProps<{source:CalendarRow;canEdit:boolean;employees:CalendarEmployee[]}>();
const emit=defineEmits<{close:[]}>();
const detail=ref<{row:ContractWorkRecord|ContractStructureWorkRecord;linkId?:number;isso?:string}>();
const error=ref('');
async function load(){
  const {id,kind,contractId}=props.source;
  if(kind==='trip')return;
  const base='/api/diagnostic/contracts/'+contractId;
  error.value='';
  try{
    if(kind==='structure'){
      detail.value=await $fetch<{row:ContractStructureWorkRecord;linkId:number;isso:string}>(base+'/assignments/structure-card',{query:{workId:id}});
    }else{
      const [row]=await $fetch<ContractWorkRecord[]>(base+'/works',{query:{workId:id}});
      if(!row || row.id!==id)throw Error('Работа в этом договоре больше недоступна.');
      detail.value={row};
    }
  }catch(e:any){error.value=e?.data?.message||e.message||'Не удалось открыть работу.';}
}
onMounted(load);
</script>
<template>
 <TripFromList v-if="source.kind==='trip'" :id="source.id" :contract-id="source.contractId" @close="emit('close')"/>
 <WorkCard v-else-if="detail" v-bind="detail" :kind="source.kind" :contract-id="source.contractId" :contract-number="source.contractNumber"
   :employees="employees" :can-edit="canEdit" @saved="emit('close')" @close="emit('close')"/>
 <UModal v-else open title="Карточка работы" @update:open="v=>{if(!v)emit('close')}">
  <template #body><p v-if="error" role="alert">{{error}} <button @click="load">Повторить</button></p><p v-else role="status">Загрузка работы…</p></template>
 </UModal>
</template>
