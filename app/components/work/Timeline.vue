<script setup lang="ts">
import { computed } from 'vue';
import type { WorkTaskDTO } from '~~/shared/types/work';
import { dateKey,shiftDay } from '~~/shared/utils/work-board';
const props=defineProps<{tasks:WorkTaskDTO[];today:string}>();const emit=defineEmits<{open:[WorkTaskDTO]}>();
const scheduled=computed(()=>props.tasks.filter(t=>t.startDate||t.dueDate));
const bounds=computed(()=>{const dates=scheduled.value.flatMap(t=>[dateKey(t.startDate),dateKey(t.dueDate)]).filter(Boolean).sort() as string[];const start=dates[0]||props.today;return {start,end:dates.at(-1)===start?shiftDay(start,1):dates.at(-1)||shiftDay(start,7)};});
function style(t:WorkTaskDTO){const min=Date.parse(bounds.value.start),max=Date.parse(bounds.value.end);const start=Date.parse(dateKey(t.startDate)||dateKey(t.dueDate)!);const end=Date.parse(dateKey(t.dueDate)||dateKey(t.startDate)!);return {left:100*(start-min)/(max-min)+'%',width:Math.max(1,100*(end-start)/(max-min))+'%',background:t.project?.color||'#2563eb'};}
</script>
<template><div class="work-timeline">
 <p class="work-muted">Календарный план по датам начала и завершения. Задачи без этих дат доступны на доске. Автоматический расчёт зависимостей появится позже.</p>
 <div class="work-timeline-head"><span>Задача / этап</span><div>{{ bounds.start }} <span>{{ bounds.end }}</span></div></div>
 <div v-for="t in scheduled" :key="t.id" class="work-timeline-row"><button type="button" @click="emit('open',t)">{{ t.kind==='MILESTONE'?'◆ ':'' }}{{ t.title }}<small>{{ dateKey(t.startDate)||'—' }} → {{ dateKey(t.dueDate)||'—' }}</small></button><div class="work-track"><button type="button" :style="style(t)" :aria-label="t.title" @click="emit('open',t)"></button></div></div>
 <p v-if="!scheduled.length" class="work-empty">Укажите даты начала и завершения задач или этапов — здесь появится план.</p>
</div></template>
