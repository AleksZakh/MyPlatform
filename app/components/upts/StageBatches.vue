<script setup lang="ts">
import {computed,ref} from 'vue';
import type {UptsLibrary} from '~~/shared/types/upts-library';
import type {UptsStageBatch} from '~~/shared/types/upts-object';
import {uptsWorkCandidates} from '~~/shared/utils/upts-work-selection';
import {workKindsFor} from '~~/shared/utils/upts-work-kinds';
import WorkSelectionTable from './WorkSelectionTable.vue';
import StageAccordion from './StageAccordion.vue';
const props=defineProps<{library:UptsLibrary|null;objectType:string;startNumber:number;disabled?:boolean;usedKinds?:string[]}>();
const batches=defineModel<UptsStageBatch[]>({required:true});
const kind=ref(''),error=ref('');
const kinds=computed(()=>workKindsFor(props.objectType));
const used=computed(()=>new Set([...(props.usedKinds||[]),...batches.value.map(b=>b.workKindKey)]));
const stages=computed(()=>batches.value.map(b=>({number:b.stageNumber,workKindKey:b.workKindKey,startDate:b.startDate,endDate:b.endDate})));
function candidates(key:string){return uptsWorkCandidates(props.library,props.objectType,[key]).map(({work})=>work);}
function add(key=kind.value){
 if(!key||props.disabled)return;
 if(used.value.has(key)){error.value='Этот вид работ уже добавлен.';return;}
 const works=candidates(key);if(!works.length){error.value='В библиотеке нет активных работ для выбранного вида.';return;}
 error.value='';const stageNumber=props.startNumber+batches.value.length;
 batches.value=[...batches.value,{stageNumber,workKindKey:key,startDate:null,endDate:null,selectedWorks:works.map(w=>({id:w.id,version:w.version}))}];kind.value='';
}
function batch(number:number){return batches.value.find(b=>b.stageNumber===number)!;}
function rows(number:number){const b=batch(number);return candidates(b.workKindKey).map(w=>({...w,key:String(w.id),workKindKey:b.workKindKey}));}
function select(number:number,keys:string[]){const b=batch(number);b.selectedWorks=candidates(b.workKindKey).filter(w=>keys.includes(String(w.id))).map(w=>({id:w.id,version:w.version}));}
function remove(number:number){batches.value=batches.value.filter(b=>b.stageNumber!==number).map((b,i)=>({...b,stageNumber:props.startNumber+i}));}
defineExpose({add});
</script>
<template>
 <section class="upts-stage-batches">
  <div class="upts-stage-add"><label>Добавить вид работ<select v-model="kind" :disabled="disabled"><option value="">Выберите вид работ</option><option v-for="k in kinds" :key="k.key" :value="k.key" :disabled="used.has(k.key)">{{ k.name }}</option></select></label><button type="button" :disabled="disabled||!kind||used.has(kind)" class="upts-stage-plus" aria-label="Добавить вид работ" title="Добавить вид работ" @click="add()">+</button></div>
  <p v-if="error" class="work-error" role="alert">{{ error }}</p>
  <StageAccordion :stages="stages"><template #default="{stage}">
   <WorkSelectionTable :model-value="{}" :enabled="batch(stage.number).selectedWorks.map(w=>String(w.id))" :works="rows(stage.number)" :stage-count="stage.number" :fixed-stage="stage.number" compact-toolbar :disabled="disabled" @update:enabled="select(stage.number,$event)">
    <template #toolbar-start><div class="upts-stage-dates"><label>Начало этапа<input v-model="batch(stage.number).startDate" type="date" min="1900-01-01" max="2200-12-31" :disabled="disabled" /></label><label>Окончание этапа<input v-model="batch(stage.number).endDate" type="date" :min="batch(stage.number).startDate||'1900-01-01'" max="2200-12-31" :disabled="disabled" /></label></div></template>
    <template #toolbar-end><button type="button" class="upts-stage-remove" :disabled="disabled" :aria-label="'Удалить новый этап '+stage.number" title="Удалить новый этап" @click="remove(stage.number)"><Icon name="lucide:trash-2" aria-hidden="true" /></button></template>
   </WorkSelectionTable>
  </template></StageAccordion>
 </section>
</template>
<style scoped>
.upts-stage-add{display:flex;gap:6px;align-items:end;margin-bottom:6px;max-width:360px}.upts-stage-add label{flex:1;min-width:0}.upts-stage-dates{display:flex;gap:8px;align-items:end}.upts-stage-dates label{width:148px;max-width:40vw}.upts-stage-batches :is(input,select){height:32px;box-sizing:border-box}.upts-stage-batches :is(.upts-stage-plus,.upts-stage-remove){display:inline-flex;align-items:center;justify-content:center;width:32px;height:32px;flex:none;padding:0}.upts-stage-plus{font-size:20px;line-height:1}.upts-stage-remove{color:var(--work-danger,#c24145)}.upts-stage-remove :deep(.iconify){width:17px;height:17px}
</style>
