<script setup lang="ts">
import type { WorkTaskDTO } from '~~/shared/types/work';
import { WORK_STATUSES, WORK_PRIORITIES, workUserName } from '~~/shared/types/work';
import { dateKey } from '~~/shared/utils/work-board';
defineProps<{task:WorkTaskDTO;today:string;busy?:boolean}>();
const emit=defineEmits<{open:[WorkTaskDTO]}>();
function drag(e:DragEvent,id:number){e.dataTransfer?.setData('text/space-task',String(id));if(e.dataTransfer)e.dataTransfer.effectAllowed='move';}
</script>
<template><article class="work-card" :style="{'--project-color':task.project?.color||'#64748b'}" :draggable="task.canEdit&&!busy" @dragstart="drag($event,task.id)">
 <div class="work-card-top"><span class="work-project-tag">{{ task.project?.name || (task.visibility==='PRIVATE'?'Личная задача':'Самостоятельная задача') }}</span><span class="work-id">#{{ task.id }}</span></div>
 <button class="work-card-title" type="button" @click="emit('open',task)">{{ task.title }}</button>
 <div class="work-badges"><span>{{ WORK_STATUSES[task.status as keyof typeof WORK_STATUSES] }}</span><span v-if="task.priority!=='NORMAL'">{{ WORK_PRIORITIES[task.priority as keyof typeof WORK_PRIORITIES] }} приоритет</span></div>
 <p v-if="task.blockedReason" class="work-blocked">⏸ {{ task.blockedReason }}</p>
 <div class="work-card-foot"><span>{{ workUserName(task.assignee) }}</span><span v-if="task._count.comments">{{ task._count.comments }} комм.</span></div>
 <p v-if="task.plannedDate" class="work-muted">В плане: {{ dateKey(task.plannedDate) }}</p>
 <p v-if="task.dueDate" :class="{'work-overdue':task.status!=='DONE'&&dateKey(task.dueDate)!<today}">Сдать до {{ dateKey(task.dueDate) }}</p>
</article></template>
