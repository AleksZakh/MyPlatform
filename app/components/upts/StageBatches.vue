<script setup lang="ts">
import {computed,ref} from 'vue';
import type {UptsLibrary} from '~~/shared/types/upts-library';
import type {UptsStageBatch} from '~~/shared/types/upts-object';
import {uptsWorkCandidates} from '~~/shared/utils/upts-work-selection';
import {workKindsFor} from '~~/shared/utils/upts-work-kinds';
import WorkSelectionTable from './WorkSelectionTable.vue';
import StageAccordion from './StageAccordion.vue';
const props=defineProps<{library:UptsLibrary|null;objectType:string;startNumber:number;disabled?:boolean}>();
const batches=defineModel<UptsStageBatch[]>({required:true});
const kind=ref(''),error=ref('');
const kinds=computed(()=>workKindsFor(props.objectType));
const stages=computed(()=>batches.value.map(b=>({number:b.stageNumber,workKindKey:b.workKindKey,startDate:b.startDate,endDate:b.endDate})));
function candidates(key:string){return uptsWorkCandidates(props.library,props.objectType,[key]).map(({work})=>work);}
function add(key=kind.value){
 if(!key||props.disabled)return;
 const works=candidates(key);if(!works.length){error.value='В библиотеке нет активных работ для выбранного вида.';return;}
 error.value='';const stageNumber=props.startNumber+batches.value.length;
 batches.value=[...batches.value,{stageNumber,workKindKey:key,startDate:null,endDate:null,selectedWorks:works.map(w=>({id:w.id,version:w.version}))}];kind.value='';
}
function first(key:string){
 if(batches.value.length){const works=candidates(key);batches.value=[{...batches.value[0]!,workKindKey:key,selectedWorks:works.map(w=>({id:w.id,version:w.version}))},...batches.value.slice(1)];}
 else add(key);
}
function batch(number:number){return batches.value.find(b=>b.stageNumber===number)!;}
function rows(number:number){const b=batch(number);return candidates(b.workKindKey).map(w=>({...w,key:String(w.id),workKindKey:b.workKindKey}));}
function select(number:number,keys:string[]){const b=batch(number);b.selectedWorks=candidates(b.workKindKey).filter(w=>keys.includes(String(w.id))).map(w=>({id:w.id,version:w.version}));}
function remove(number:number){batches.value=batches.value.filter(b=>b.stageNumber!==number).map((b,i)=>({...b,stageNumber:props.startNumber+i}));}
defineExpose({add,first});
</script>
<template>
 <section class="upts-stage-batches">
  <div class="upts-stage-add"><label>Добавить вид работ<select v-model="kind" :disabled="disabled"><option value="">Выберите вид работ</option><option v-for="k in kinds" :key="k.key" :value="k.key">{{ k.name }}</option></select></label><button type="button" :disabled="disabled||!kind" @click="add()">+ Добавить этап {{ startNumber+batches.length }}</button></div>
  <p v-if="error" class="work-error" role="alert">{{ error }}</p>
  <StageAccordion :stages="stages"><template #default="{stage}">
   <div class="upts-stage-dates"><label>Начало этапа<input v-model="batch(stage.number).startDate" type="date" min="1900-01-01" max="2200-12-31" :disabled="disabled" /></label><label>Окончание этапа<input v-model="batch(stage.number).endDate" type="date" :min="batch(stage.number).startDate||'1900-01-01'" max="2200-12-31" :disabled="disabled" /></label><button type="button" :disabled="disabled" @click="remove(stage.number)">Убрать новый этап</button></div>
   <WorkSelectionTable :model-value="{}" :enabled="batch(stage.number).selectedWorks.map(w=>String(w.id))" :works="rows(stage.number)" :stage-count="stage.number" :fixed-stage="stage.number" :disabled="disabled" @update:enabled="select(stage.number,$event)" />
  </template></StageAccordion>
 </section>
</template>
<style scoped>
.upts-stage-add,.upts-stage-dates{display:flex;gap:10px;align-items:end;flex-wrap:wrap}.upts-stage-add label{flex:1;min-width:220px}.upts-stage-dates{margin-bottom:8px}.upts-stage-dates label{flex:0 1 180px}.upts-stage-dates button{margin-left:auto}.upts-stage-batches :is(input,select){height:32px;box-sizing:border-box}.upts-stage-batches button{padding:6px 10px}
</style>
