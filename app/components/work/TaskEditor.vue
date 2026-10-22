<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import TaskSurface from './TaskSurface.vue';import PersonPicker from './PersonPicker.vue';
import { WORK_STATUSES,WORK_KINDS,WORK_PRIORITIES,workUserName,type WorkTaskDTO,type WorkProjectDTO,type WorkContext,type WorkUser } from '~~/shared/types/work';
import { dateKey } from '~~/shared/utils/work-board';
const props=defineProps<{task:WorkTaskDTO|null;projects:WorkProjectDTO[];project?:WorkProjectDTO|null;context:WorkContext}>();
const emit=defineEmits<{close:[];saved:[];createProject:[]}>();const {error,saving,send}=useWorkApi();
const task=props.task;const own=props.context.userId;
const form=reactive({clientKey:crypto.randomUUID(),version:task?.version,title:task?.title||'',description:task?.description||'',kind:task?.kind||'TASK',status:task?.status||'TODO',priority:task?.priority||'NORMAL',
 projectId:task?.projectId||props.project?.id||null,visibility:task?.visibility||(props.project?'PROJECT':'PRIVATE'),departmentId:task?.departmentId||null,assigneeId:task?task.assigneeId:own,
 participantIds:task?.participants.map(p=>p.userId)||[] as number[],plannedDate:dateKey(task?.plannedDate)||'',startDate:dateKey(task?.startDate)||'',dueDate:dateKey(task?.dueDate)||'',blockedReason:task?.blockedReason||''});
const relationship=ref(form.projectId?'PROJECT':'STANDALONE');const participant=ref<number|null>(null);
const readOnly=computed(()=>!!task&&!task.canEditDetails);const canProgress=computed(()=>!!task?.canEdit&&!task.canEditDetails);
const selectedProject=computed(()=>props.projects.find(p=>p.id===form.projectId)|| (props.project?.id===form.projectId?props.project:null));
const assignable=computed(()=>selectedProject.value ? [selectedProject.value.owner,...selectedProject.value.members.filter(m=>['MANAGER','MEMBER'].includes(m.role)).map(m=>m.user)] : undefined);
watch(()=>form.visibility,v=>{if(v==='PRIVATE'){form.assigneeId=own;form.participantIds=[];form.departmentId=null;}else if(v==='DEPARTMENT'){form.departmentId=props.context.department?.id||null;form.participantIds=[];}else form.departmentId=null;});
watch(relationship,v=>{if(v==='STANDALONE'){form.projectId=null;form.visibility='PRIVATE';}else{form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
watch(()=>form.projectId,v=>{if(v){form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
async function save(){if(canProgress.value){const r=await send('/api/work/tasks/'+task!.id,'PATCH',{version:task!.version,status:form.status,plannedDate:form.plannedDate||null});if(r)emit('saved');return;}
 const body={...form,plannedDate:form.plannedDate||null,startDate:form.startDate||null,dueDate:form.dueDate||null};
 const r=await send(task?'/api/work/tasks/'+task.id:'/api/work/tasks',task?'PUT':'POST',body);if(r)emit('saved');}
const confirmingDelete=ref(false);
async function remove(){const r=await send('/api/work/tasks/'+task!.id,'DELETE',{version:task!.version});if(r)emit('saved');}
const comment=ref(''),commentKey=ref(crypto.randomUUID()),comments=ref<{id:number;body:string;createdAt:string;author:WorkUser}[]>([]),commentsError=ref(''),hasMore=ref(false);
async function loadComments(more=false){if(!task)return;try{const rows=await $fetch<typeof comments.value>('/api/work/tasks/'+task.id+'/comments',{query:{after:more?comments.value.at(-1)?.id:undefined}});comments.value=more?[...comments.value,...rows]:rows;hasMore.value=rows.length===100;commentsError.value='';}catch{commentsError.value='Не удалось загрузить обсуждение.';}}
async function postComment(){const r=await send('/api/work/tasks/'+task!.id+'/comments','POST',{clientKey:commentKey.value,body:comment.value});if(r){comment.value='';commentKey.value=crypto.randomUUID();await loadComments();}}
onMounted(()=>loadComments());
defineExpose({useProject:(p:WorkProjectDTO)=>{relationship.value='PROJECT';form.projectId=p.id;form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
</script>
<template><TaskSurface :slide="!!task" :title="task?'Задача #'+task.id:'Новая задача'" @close="emit('close')">
 <form class="work-form" @submit.prevent="save">
  <p v-if="error" class="work-error" role="alert">{{ error }}</p>
  <fieldset :disabled="saving||readOnly"><label>Название задачи<input v-model="form.title" required maxlength="250" autofocus /></label>
   <div class="work-two"><label>К чему относится задача?<select v-model="relationship"><option value="STANDALONE">Самостоятельная задача</option><option value="PROJECT">Задача в рамках проекта</option></select></label>
   <label v-if="relationship==='PROJECT'">Проект<select v-model="form.projectId" required><option :value="null">Выберите проект</option><option v-for="p in projects.filter(p=>p.canCreateTask||p.id===form.projectId)" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
   <label v-else>Кто видит задачу?<select v-model="form.visibility"><option value="PRIVATE">Только я</option><option value="PARTICIPANTS" :disabled="!context.canAssign">Участники задачи</option><option value="DEPARTMENT" :disabled="!context.canAssign||!context.department">Моё подразделение</option></select></label></div>
   <label>Описание и ожидаемый результат<textarea v-model="form.description" rows="4" maxlength="20000" /></label>
   <div class="work-two"><label>Тип<select v-model="form.kind"><option v-for="(label,key) in WORK_KINDS" :key="key" :value="key">{{ label }}</option></select></label><label>Приоритет<select v-model="form.priority"><option v-for="(label,key) in WORK_PRIORITIES" :key="key" :value="key">{{ label }}</option></select></label></div>
   <PersonPicker v-if="form.visibility!=='PRIVATE'" v-model="form.assigneeId" :initial="task?.assignee" :options="assignable" label="Исполнитель" />
   <div v-if="form.visibility==='PARTICIPANTS'"><PersonPicker v-model="participant" label="Добавить участника" /><button type="button" :disabled="!participant" @click="participant&&!form.participantIds.includes(participant)&&form.participantIds.push(participant);participant=null">Добавить</button><div class="work-badges"><button v-for="id in form.participantIds" :key="id" type="button" @click="form.participantIds=form.participantIds.filter(x=>x!==id)">Участник #{{ id }} ×</button></div></div>
   <div class="work-two"><label>Начало работы<input v-model="form.startDate" type="date" /></label><label>Крайний срок<input v-model="form.dueDate" type="date" /></label></div>
   <label>Что мешает выполнению?<input v-model="form.blockedReason" maxlength="1000" placeholder="Например, ожидаем выгрузку от заказчика" /></label>
  </fieldset>
  <fieldset :disabled="saving||(readOnly&&!canProgress)"><div class="work-two"><label>Состояние<select v-model="form.status"><option v-for="(label,key) in WORK_STATUSES" :key="key" :value="key">{{ label }}</option></select></label><label>Запланировать работу на<input v-model="form.plannedDate" type="date" /></label></div></fieldset>
  <p class="work-muted">Плановый день можно переносить независимо от крайнего срока. Календарь — по московскому времени.</p>
  <div class="work-actions"><button v-if="!readOnly||canProgress" class="work-primary" :disabled="saving" type="submit">{{ saving?'Сохранение…':'Сохранить' }}</button><button type="button" @click="emit('close')">Закрыть</button><button v-if="task?.canDelete" type="button" class="work-danger" :disabled="saving" @click="confirmingDelete=true">Удалить</button></div>
  <div v-if="confirmingDelete" class="work-confirm"><p>Удалить задачу из рабочих списков? История сохранится.</p><button type="button" :disabled="saving" @click="remove">Да, удалить</button><button type="button" @click="confirmingDelete=false">Отмена</button></div>
 </form>
 <section v-if="task" class="work-discussion"><h3>Обсуждение</h3><p v-if="commentsError" role="alert">{{ commentsError }} <button @click="loadComments()">Повторить</button></p>
 <article v-for="c in comments" :key="c.id"><strong>{{ workUserName(c.author) }}</strong><small>{{ c.createdAt.slice(0,10) }}</small><p>{{ c.body }}</p></article>
 <button v-if="hasMore" @click="loadComments(true)">Ещё комментарии</button><form v-if="task.canComment" @submit.prevent="postComment"><label>Комментарий<textarea v-model="comment" required maxlength="5000" rows="2" /></label><button :disabled="saving||!comment.trim()">Отправить</button></form>
 </section>
</TaskSurface></template>
