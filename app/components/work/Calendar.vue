<script setup lang="ts">
import { computed, ref } from 'vue';
import type { WorkTaskDTO } from '~~/shared/types/work';
import { WORK_STATUSES } from '~~/shared/types/work';
import { dateKey, shiftDay, formatWorkDate } from '~~/shared/utils/work-board';
import { compareWorkTasks } from '~~/shared/utils/work-order';
const props=defineProps<{tasks:WorkTaskDTO[];today:string}>();
const emit=defineEmits<{open:[WorkTaskDTO]}>();
const month=ref(props.today.slice(0,7)+'-01');
const label=computed(()=>new Intl.DateTimeFormat('ru-RU',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month.value+'T00:00:00Z')));
function moveMonth(offset:number){const date=new Date(month.value+'T00:00:00Z');date.setUTCMonth(date.getUTCMonth()+offset);month.value=date.toISOString().slice(0,10);}
const scheduledDay=(task:WorkTaskDTO)=>dateKey(task.plannedDate)||dateKey(task.startDate)||dateKey(task.dueDate);
const sorted=computed(()=>[...props.tasks].sort((a,b)=>compareWorkTasks(a,b)));
const days=computed(()=>{const weekday=(new Date(month.value+'T00:00:00Z').getUTCDay()+6)%7;const start=shiftDay(month.value,-weekday);return Array.from({length:42},(_,i)=>{const day=shiftDay(start,i);return {day,tasks:sorted.value.filter(t=>scheduledDay(t)===day)};});});
const unscheduled=computed(()=>sorted.value.filter(t=>!scheduledDay(t)));
const weekdays=['Понедельник','Вторник','Среда','Четверг','Пятница','Суббота','Воскресенье'];
</script>
<template>
 <section aria-label="Календарный план задач">
  <div class="work-toolbar"><h2>{{ label }}</h2><div class="work-actions"><button aria-label="Предыдущий месяц" @click="moveMonth(-1)">←</button><button @click="month=today.slice(0,7)+'-01'">Сегодня</button><button aria-label="Следующий месяц" @click="moveMonth(1)">→</button></div></div>
  <p class="work-muted">Задача показана на дату плана, а если она не задана — на дату начала или срока. Нажмите на задачу, чтобы открыть подробности.</p>
  <div class="work-calendar-scroll"><div class="work-calendar-grid">
   <div v-for="day in weekdays" :key="day" class="work-calendar-weekday">{{ day }}</div>
   <section v-for="cell in days" :key="cell.day" class="work-calendar-day" :class="{'is-outside':cell.day.slice(0,7)!==month.slice(0,7),'is-today':cell.day===today}" :aria-label="formatWorkDate(cell.day)">
    <time :datetime="cell.day">{{ formatWorkDate(cell.day) }}</time>
    <button v-for="task in cell.tasks" :key="task.id" class="work-calendar-task" :style="{'--project-color':task.project?.color||'#64748b'}" @click="emit('open',task)">{{ task.title }}<small>{{ task.project?.name||'Самостоятельная' }} · {{ WORK_STATUSES[task.status as keyof typeof WORK_STATUSES] }}</small></button>
   </section>
  </div></div>
  <h3 v-if="unscheduled.length">Без даты ({{ unscheduled.length }})</h3><div class="work-calendar-unscheduled"><button v-for="task in unscheduled" :key="task.id" class="work-calendar-task" :style="{'--project-color':task.project?.color||'#64748b'}" @click="emit('open',task)">{{ task.title }}<small>{{ task.project?.name||'Самостоятельная' }}</small></button></div>
 </section>
</template>
