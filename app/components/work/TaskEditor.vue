<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { UPTS_WORK_ROLES, workKindNames } from '~~/shared/utils/upts-work-kinds';
import ProjectFiles from './ProjectFiles.vue';
import TaskSurface from './TaskSurface.vue';import PersonPicker from './PersonPicker.vue';
import { workTaskContext,workTaskColor,WORK_STATUSES,WORK_KINDS,WORK_PRIORITIES,workUserName,type WorkTaskDTO,type WorkProjectDTO,type WorkContext,type WorkUser } from '~~/shared/types/work';
import { dateKey } from '~~/shared/utils/work-board';
const props=defineProps<{task:WorkTaskDTO|null;projects:WorkProjectDTO[];project?:WorkProjectDTO|null;context:WorkContext;uptsContractId?:number|null}>();
const contractOptions=ref<{id:number;number:string;name:string;objectDetails?:{engineerId?:number|null}}[]>([]);
const objectOptions=ref<{id:number;object:{name:string}}[]>([]);
const emit=defineEmits<{close:[];saved:[];createProject:[]}>();const {error,saving,send}=useWorkApi();
const task=props.task;const own=props.context.userId;
const form=reactive({uptsContractId:task?.uptsContractId??props.uptsContractId??null,uptsObjectId:task?.uptsObjectId||null,clientKey:crypto.randomUUID(),version:task?.version,title:task?.title||'',description:task?.description||'',kind:task?.kind||'TASK',status:task?.status||'TODO',priority:task?.priority||'NORMAL',
 projectId:task?.projectId||props.project?.id||null,visibility:task?.visibility||(props.project?'PROJECT':'PRIVATE'),departmentId:task?.departmentId||null,assigneeId:task?task.assigneeId:own,
 participantIds:task?.participants.map(p=>p.userId)||[] as number[],plannedDate:dateKey(task?.plannedDate)||'',startDate:dateKey(task?.startDate)||'',dueDate:dateKey(task?.dueDate)||'',blockedReason:task?.blockedReason||''});
const resultText=ref(task?.uptsWorkMeta?.resultText||''),filesPending=ref(false);
const relationship=ref(form.projectId?'PROJECT':'STANDALONE');const participant=ref<number|null>(null);
const readOnly=computed(()=>!!task&&!task.canEditDetails);const canProgress=computed(()=>!!task?.canEdit&&!task.canEditDetails);
const selectedProject=computed(()=>props.projects.find(p=>p.id===form.projectId)|| (props.project?.id===form.projectId?props.project:null));
const isUpts=computed(()=>!!form.uptsContractId || !!(selectedProject.value as any)?.upts || contractOptions.value.length>0);
const selectedContract=computed(()=>contractOptions.value.find(c=>c.id===form.uptsContractId));
const subtitle=computed(()=>selectedContract.value ? `${selectedContract.value.number} · ${selectedContract.value.name}` : task ? workTaskContext(task) : selectedProject.value?.name);
watch(selectedContract,c=>{if(!task&&c?.objectDetails?.engineerId)form.assigneeId=c.objectDetails.engineerId;});
const canAssignUpts=computed(()=>!!selectedProject.value?.canManage || selectedContract.value?.objectDetails?.engineerId===own);
const staff=ref<WorkUser[]>([]),staffError=ref(''),staffLoading=ref(false);
async function loadStaff(){staffLoading.value=true;staffError.value='';try{staff.value=await $fetch<WorkUser[]>('/api/upts/people');}catch{staffError.value='Не удалось загрузить полный состав УПТС. Проверьте соединение с AD и повторите.';}finally{staffLoading.value=false;}}
watch(isUpts,yes=>{if(yes)loadStaff();},{immediate:true});
const assignable=computed(()=>{
 const p=selectedProject.value;if(!p)return undefined;
 const team=[p.owner,...p.members.filter(m=>['MANAGER','MEMBER'].includes(m.role)).map(m=>m.user)];
 return [...new Map([...(isUpts.value&&canAssignUpts.value?staff.value:[]),...team].map(u=>[u.id,u])).values()].sort((a,b)=>workUserName(a).localeCompare(workUserName(b),'ru'));
});
watch(()=>form.visibility,v=>{if(v==='PRIVATE'){form.assigneeId=own;form.participantIds=[];form.departmentId=null;}else if(v==='DEPARTMENT'){form.departmentId=props.context.department?.id||null;form.participantIds=[];}else form.departmentId=null;});
watch(relationship,v=>{if(v==='STANDALONE'){form.projectId=null;form.visibility='PRIVATE';}else{form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
watch(()=>form.projectId,v=>{if(v){form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
let objectRequest=0;
watch(()=>form.projectId,async (id,old)=>{const serial=++objectRequest;if(old!==undefined&&id!==old)form.uptsObjectId=null;objectOptions.value=[];if(!id)return;try{const rows=await $fetch<typeof objectOptions.value>(`/api/upts/projects/${id}/objects`);if(serial===objectRequest)objectOptions.value=rows;}catch{}},{immediate:true});
let contractRequest=0;
watch(()=>form.projectId,async (id,old)=>{const serial=++contractRequest;if(old!==undefined&&id!==old)form.uptsContractId=null;contractOptions.value=[];if(!id)return;try{const rows=await $fetch<typeof contractOptions.value>(`/api/upts/projects/${id}/contracts`);if(serial===contractRequest)contractOptions.value=rows;}catch{}},{immediate:true});
async function save(){if(filesPending.value)return;
 if(task?.uptsContractId){const r=await send('/api/upts/tasks/'+task.id,'PUT',{version:task.version,title:form.title,assigneeId:form.assigneeId,status:form.status,resultText:resultText.value});if(r)emit('saved');return;}
 if(canProgress.value){const r=await send('/api/work/tasks/'+task!.id,'PATCH',{version:task!.version,status:form.status,plannedDate:form.plannedDate||null});if(r)emit('saved');return;}
 const body={...form,plannedDate:form.plannedDate||null,startDate:form.startDate||null,dueDate:form.dueDate||null};
 const r=await send(task?'/api/work/tasks/'+task.id:'/api/work/tasks',task?'PUT':'POST',body);if(r)emit('saved');}
const confirmingDelete=ref(false);
async function remove(){const r=await send('/api/work/tasks/'+task!.id,'DELETE',{version:task!.version});if(r)emit('saved');}
const comment=ref(''),commentKey=ref(crypto.randomUUID()),comments=ref<{id:number;body:string;createdAt:string;author:WorkUser}[]>([]),commentsError=ref(''),hasMore=ref(false);
async function loadComments(more=false){if(!task)return;try{const rows=await $fetch<typeof comments.value>('/api/work/tasks/'+task.id+'/comments',{query:{after:more?comments.value.at(-1)?.id:undefined}});comments.value=more?[...comments.value,...rows]:rows;hasMore.value=rows.length===100;commentsError.value='';}catch{commentsError.value='Не удалось загрузить обсуждение.';}}
async function postComment(){const r=await send('/api/work/tasks/'+task!.id+'/comments','POST',{clientKey:commentKey.value,body:comment.value});if(r){comment.value='';commentKey.value=crypto.randomUUID();await loadComments();}}
onMounted(()=>{if(!isUpts.value)loadComments();});
defineExpose({useProject:(p:WorkProjectDTO)=>{relationship.value='PROJECT';form.projectId=p.id;form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
</script>
<template><TaskSurface :slide="!!task" :title="form.title || (isUpts?'Новая работа':'Новая задача')" :subtitle="subtitle" :color="task?workTaskColor(task):undefined" @close="emit('close')">
 <form class="work-form" @submit.prevent="save">
  <p v-if="error" class="work-error" role="alert">{{ error }}</p>
  <fieldset :disabled="saving||readOnly"><label>{{ isUpts ? 'Название работы' : 'Название задачи' }}<input v-model="form.title" required maxlength="250" autofocus /></label>
   <div v-if="!isUpts" class="work-two"><label>К чему относится задача?<select v-model="relationship"><option value="STANDALONE">Самостоятельная задача</option><option value="PROJECT">Задача в рамках проекта</option></select></label>
   <label v-if="relationship==='PROJECT'">Проект<select v-model="form.projectId" required><option :value="null">Выберите проект</option><option v-for="p in projects.filter(p=>p.canCreateTask||p.id===form.projectId)" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
   <label v-else>Кто видит задачу?<select v-model="form.visibility"><option value="PRIVATE">Только я</option><option value="PARTICIPANTS" :disabled="!context.canAssign">Участники задачи</option><option value="DEPARTMENT" :disabled="!context.canAssign||!context.department">Моё подразделение</option></select></label></div>
   <label v-if="contractOptions.length && (!isUpts || !form.uptsContractId)">Объект<select v-model="form.uptsContractId"><option :value="null">Без привязки к объекту</option><option v-for="c in contractOptions" :key="c.id" :value="c.id">{{ c.number }} · {{ c.name }}</option></select></label>
   <label v-if="!isUpts && objectOptions.length">Связанный участок<select v-model="form.uptsObjectId"><option :value="null">Общая задача проекта</option><option v-for="o in objectOptions" :key="o.id" :value="o.id">{{ o.object.name }}</option></select></label>
   <dl v-if="task?.uptsWorkMeta" class="upts-work-reference">
    <template v-if="task.uptsWorkMeta.stageNumber"><dt>Этап работ</dt><dd>{{ task.uptsWorkMeta.stageNumber }}</dd></template>
    <template v-if="task.uptsWorkMeta.workKindKey || task.uptsWorkMeta.workKindKeys?.length"><dt>Вид работ</dt><dd>{{ workKindNames(task.uptsWorkMeta) }}</dd></template>
    <dt>Ответственная роль</dt><dd>{{ task.uptsWorkMeta.responsibleRole ? UPTS_WORK_ROLES[task.uptsWorkMeta.responsibleRole] : 'Не указана' }}</dd>
    <dt>Ожидаемый результат</dt><dd>{{ task.uptsWorkMeta.expectedResult || 'Не указан' }}</dd>
   </dl>
   <label v-if="!isUpts">Описание и ожидаемый результат<textarea v-model="form.description" rows="4" maxlength="20000" /></label>
   <div v-if="!isUpts" class="work-two"><label>Тип<select v-model="form.kind"><option v-for="(label,key) in WORK_KINDS" :key="key" :value="key">{{ label }}</option></select></label><label>Приоритет<select v-model="form.priority"><option v-for="(label,key) in WORK_PRIORITIES" :key="key" :value="key">{{ label }}</option></select></label></div>
   <PersonPicker v-if="form.visibility!=='PRIVATE'" :disabled="!!task?.uptsContractId && !canAssignUpts" v-model="form.assigneeId" :initial="task?.assignee" :options="assignable" label="Исполнитель" />
   <template v-if="isUpts && canAssignUpts && selectedProject">
    <small v-if="staffLoading" role="status">Загружаем сотрудников УПТС…</small>
    <p v-if="staffError" class="work-error" role="alert">{{ staffError }} <button type="button" @click="loadStaff">Повторить</button></p>
    <p v-if="form.assigneeId && form.assigneeId!==selectedProject.ownerId && !selectedProject.members.some(m=>m.userId===form.assigneeId)" class="work-muted">Новый исполнитель будет добавлен в команду и получит доступ к объекту и его работам. Для объекта «Только мне» сначала измените видимость в настройках доступа.</p>
   </template>
   <div v-if="!isUpts && form.visibility==='PARTICIPANTS'"><PersonPicker v-model="participant" label="Добавить участника" /><button type="button" :disabled="!participant" @click="participant&&!form.participantIds.includes(participant)&&form.participantIds.push(participant);participant=null">Добавить</button><div class="work-badges"><button v-for="id in form.participantIds" :key="id" type="button" @click="form.participantIds=form.participantIds.filter(x=>x!==id)">Участник #{{ id }} ×</button></div></div>
   <div v-if="!isUpts" class="work-two"><label>Начало работы<input v-model="form.startDate" type="date" /></label><label>Крайний срок<input v-model="form.dueDate" type="date" /></label></div>
   <label v-if="!isUpts">Что мешает выполнению?<input v-model="form.blockedReason" maxlength="1000" placeholder="Например, ожидаем выгрузку от заказчика" /></label>
  </fieldset>
  <template v-if="task?.uptsContractId">
   <label>Результат работы<textarea v-model="resultText" :disabled="saving || (readOnly&&!canProgress)" rows="3" maxlength="5000" placeholder="Например: № КУВД, реквизиты выписки или описание результата" /></label>
   <ProjectFiles v-if="selectedProject" :project="selectedProject" :contract-id="task.uptsContractId" :task-id="task.id" default-scope="SHARED" @pending="filesPending=$event" />
   <p class="work-muted">Сохранение результата или прикреплённых итоговых документов завершает работу и запускает следующую по списку.</p>
   <p v-if="filesPending" class="work-muted">Завершите загрузку или очистите очередь файлов перед сохранением.</p>
  </template>
  <fieldset :disabled="saving||(readOnly&&!canProgress)"><div class="work-two"><label>Состояние<select v-model="form.status"><option v-for="(label,key) in WORK_STATUSES" :key="key" :value="key">{{ label }}</option></select></label><label v-if="!isUpts">Запланировать работу на<input v-model="form.plannedDate" type="date" /></label></div></fieldset>
  <p v-if="!isUpts" class="work-muted">Плановый день можно переносить независимо от крайнего срока. Календарь — по московскому времени.</p>
  <div class="work-actions"><button v-if="!readOnly||canProgress" class="work-primary" :disabled="saving || filesPending" type="submit">{{ saving?'Сохранение…':'Сохранить' }}</button><button type="button" @click="emit('close')">Закрыть</button><button v-if="task?.canDelete" type="button" class="work-danger" :disabled="saving || filesPending" @click="confirmingDelete=true">Удалить</button></div>
  <div v-if="confirmingDelete" class="work-confirm"><p>Удалить задачу из рабочих списков? История сохранится.</p><button type="button" :disabled="saving || filesPending" @click="remove">Да, удалить</button><button type="button" @click="confirmingDelete=false">Отмена</button></div>
 </form>
 <section v-if="task && !isUpts" class="work-discussion"><h3>Обсуждение</h3><p v-if="commentsError" role="alert">{{ commentsError }} <button @click="loadComments()">Повторить</button></p>
 <article v-for="c in comments" :key="c.id"><strong>{{ workUserName(c.author) }}</strong><small>{{ c.createdAt.slice(0,10) }}</small><p>{{ c.body }}</p></article>
 <button v-if="hasMore" @click="loadComments(true)">Ещё комментарии</button><form v-if="task.canComment" @submit.prevent="postComment"><label>Комментарий<textarea v-model="comment" required maxlength="5000" rows="2" /></label><button :disabled="saving||!comment.trim()">Отправить</button></form>
 </section>
</TaskSurface></template>

<style scoped>.upts-work-reference{padding:12px;border:1px solid var(--work-line);border-radius:8px;margin:0}.upts-work-reference dt{font-size:12px;color:var(--work-muted);margin-top:5px}.upts-work-reference dd{margin:3px 0;overflow-wrap:anywhere}</style>
