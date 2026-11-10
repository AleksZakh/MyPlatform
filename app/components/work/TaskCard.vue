<script setup lang="ts">
import WorkName from '../upts/WorkName.vue';
import { workTaskColor, workTaskContext } from '~~/shared/types/work';
import type { WorkTaskDTO } from '~~/shared/types/work';
import { WORK_STATUSES, WORK_PRIORITIES, workUserName } from '~~/shared/types/work';
import { formatWorkDate,dateKey } from '~~/shared/utils/work-board';
defineProps<{task:WorkTaskDTO;today:string;busy?:boolean}>();
const emit=defineEmits<{open:[WorkTaskDTO]}>();
function drag(e:DragEvent,id:number){e.dataTransfer?.setData('text/space-task',String(id));if(e.dataTransfer)e.dataTransfer.effectAllowed='move';}
</script>
<template><article class="work-card" :class="{'work-card--contract':task.uptsContractId}" :style="{'--project-color':workTaskColor(task)}" :draggable="task.canEdit&&!busy" @dragstart="drag($event,task.id)">
 <div class="work-card-top"><span class="work-project-tag">{{ workTaskContext(task) }}</span><span class="work-id">#{{ task.id }}</span></div>
 <button class="work-card-title" type="button" @click="emit('open',task)"><WorkName :meta="task.uptsWorkMeta" :emphasize="!!task.uptsContractId">{{ task.title }}</WorkName></button>
 <div class="work-badges"><span>{{ WORK_STATUSES[task.status as keyof typeof WORK_STATUSES] }}</span><span v-if="task.priority!=='NORMAL'">{{ WORK_PRIORITIES[task.priority as keyof typeof WORK_PRIORITIES] }} приоритет</span></div>
 <p v-if="task.blockedReason" class="work-blocked">⏸ {{ task.blockedReason }}</p>
 <div class="work-card-foot"><span>{{ workUserName(task.assignee) }}</span><span v-if="task._count.comments">{{ task._count.comments }} комм.</span></div>
 <p v-if="task.plannedDate" class="work-muted">В плане: {{ formatWorkDate(task.plannedDate) }}</p>
 <p v-if="task.dueDate" :class="{'work-overdue':task.status!=='DONE'&&dateKey(task.dueDate)!<today}">Сдать до {{ formatWorkDate(task.dueDate) }}</p>
</article></template>
