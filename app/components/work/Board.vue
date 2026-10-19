<script setup lang="ts">
import { computed } from 'vue';
import type { WorkTaskDTO } from '~~/shared/types/work';
import { WORK_STATUSES } from '~~/shared/types/work';
import { timeBucket,TIME_COLUMNS,shiftDay } from '~~/shared/utils/work-board';
import TaskCard from './TaskCard.vue';
const props=defineProps<{tasks:WorkTaskDTO[];mode:'time'|'status';today:string;busy:boolean}>();
const emit=defineEmits<{open:[WorkTaskDTO];move:[WorkTaskDTO,Record<string,unknown>]}>();
const columns=computed(()=>props.mode==='time'?TIME_COLUMNS:Object.entries(WORK_STATUSES).map(([key,label])=>({key,label})));
const rows=(key:string)=>props.tasks.filter(t=>(props.mode==='time'?timeBucket(t,props.today):t.status)===key);
const droppable=(key:string)=>props.mode==='status'||['today','tomorrow','unscheduled','done'].includes(key);
function drop(e:DragEvent,key:string){if(props.busy||!droppable(key))return;const id=Number(e.dataTransfer?.getData('text/space-task'));const t=props.tasks.find(t=>t.id===id);if(!t?.canEdit)return;
 if(props.mode==='status'){emit('move',t,{status:key});return;}
 if(key==='done'){emit('move',t,{status:'DONE'});return;}
 if(t.status==='DONE')return; // Reopen explicitly via status view; date movement never silently reopens work.
 emit('move',t,{plannedDate:key==='unscheduled'?null:key==='today'?props.today:shiftDay(props.today,1)});
}
</script>
<template><div class="work-board" aria-label="Доска задач">
 <section v-for="c in columns" :key="c.key" class="work-column" @dragover="droppable(c.key)&&$event.preventDefault()" @drop.prevent="drop($event,c.key)">
  <header><h3>{{ c.label }}</h3><span>{{ rows(c.key).length }}</span></header>
  <p v-if="mode==='time'&&['week','later'].includes(c.key)" class="work-muted">Дату можно выбрать в карточке</p>
  <TaskCard v-for="t in rows(c.key)" :key="t.id" :task="t" :today="today" :busy="busy" @open="emit('open',$event)" />
  <p v-if="!rows(c.key).length" class="work-empty-column">Задач пока нет</p>
 </section>
</div></template>
