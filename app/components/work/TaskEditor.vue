<script setup lang="ts">
import {evaluateWorkResult} from '~~/shared/utils/upts-work-results';
import type {UptsFileWorkState} from '~~/shared/types/project-files';
import WorkName from '../upts/WorkName.vue';
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { UPTS_WORK_ROLES, workKindNames } from '~~/shared/utils/upts-work-kinds';
import ProjectFiles from './ProjectFiles.vue';
import TaskSurface from './TaskSurface.vue';import PersonPicker from './PersonPicker.vue';
import { workTaskContext,workTaskColor,WORK_STATUSES,WORK_KINDS,WORK_PRIORITIES,workUserName,type WorkTaskDTO,type WorkProjectDTO,type WorkContext,type WorkUser } from '~~/shared/types/work';
import { dateKey } from '~~/shared/utils/work-board';
const props=defineProps<{modal?:boolean;task:WorkTaskDTO|null;projects:WorkProjectDTO[];project?:WorkProjectDTO|null;context:WorkContext;uptsContractId?:number|null}>();
const contractOptions=ref<{id:number;number:string;name:string;objectDetails?:{engineerId?:number|null}}[]>([]);
const objectOptions=ref<{id:number;object:{name:string}}[]>([]);
const emit=defineEmits<{close:[];saved:[];changed:[];createProject:[]}>();const {error,saving,send}=useWorkApi();
const task=props.task;const own=props.context.userId;
const form=reactive({uptsContractId:task?.uptsContractId??props.uptsContractId??null,uptsObjectId:task?.uptsObjectId||null,clientKey:crypto.randomUUID(),version:task?.version,title:task?.title||'',description:task?.description||'',kind:task?.kind||'TASK',status:task?.status||'TODO',priority:task?.priority||'NORMAL',
 projectId:task?.projectId||props.project?.id||null,visibility:task?.visibility||(props.project?'PROJECT':'PRIVATE'),departmentId:task?.departmentId||null,assigneeId:task?task.assigneeId:own,
 participantIds:task?.participants.map(p=>p.userId)||[] as number[],plannedDate:dateKey(task?.plannedDate)||'',startDate:dateKey(task?.startDate)||'',dueDate:dateKey(task?.dueDate)||'',blockedReason:task?.blockedReason||''});
const workVersion=ref(task?.version),workConflict=ref(false);
const resultCheck=ref(task?.resultCheck || evaluateWorkResult(task?.uptsWorkMeta || {},[]));
function fileWorkState(state:UptsFileWorkState){
 if(state.id!==task?.id)return;
 if(workVersion.value!==state.previousVersion){workConflict.value=true;error.value='Работа изменилась другим пользователем. Откройте карточку заново перед сохранением.';return;}
 workVersion.value=state.version;form.status=state.status;resultCheck.value=state.resultCheck;emit('changed');
}
const resultText=ref(task?.uptsWorkMeta?.resultText||''),filesPending=ref(false);
const kuvdEntries=ref((task?.uptsWorkMeta?.kuvdEntries||[]).map(e=>({...e})));
const needsKuvd=computed(()=>/КУВД/i.test(task?.uptsWorkMeta?.expectedResult||'')||kuvdEntries.value.length>0);
const relationship=ref(form.projectId?'PROJECT':'STANDALONE');const participant=ref<number|null>(null);
const readOnly=computed(()=>!!task&&!task.canEditDetails);const canProgress=computed(()=>!!task?.canEdit&&!task.canEditDetails);
const selectedProject=computed(()=>props.projects.find(p=>p.id===form.projectId)|| (props.project?.id===form.projectId?props.project:null));
const isUpts=computed(()=>!!form.uptsContractId || !!(selectedProject.value as any)?.upts || contractOptions.value.length>0);
const selectedContract=computed(()=>contractOptions.value.find(c=>c.id===form.uptsContractId));
const subtitle=computed(()=>selectedContract.value ? `${selectedContract.value.number} · ${selectedContract.value.name}` : task ? workTaskContext(task) : selectedProject.value?.name);
watch(selectedContract,c=>{if(!task&&c?.objectDetails?.engineerId)form.assigneeId=c.objectDetails.engineerId;});
const canAssignUpts=computed(()=>task?.uptsContractId ? !!task.canAssignUpts : !!selectedProject.value?.canManage || selectedContract.value?.objectDetails?.engineerId===own);
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
async function save(){if(filesPending.value||workConflict.value)return;
 if(task?.uptsContractId){const r=await send('/api/upts/tasks/'+task.id,'PUT',{version:workVersion.value,title:form.title,assigneeId:form.assigneeId,status:form.status,resultText:resultText.value,kuvdEntries:kuvdEntries.value.filter(e=>e.number.trim()||e.date)});if(r)emit('saved');return;}
 if(canProgress.value){const r=await send('/api/work/tasks/'+task!.id,'PATCH',{version:task!.version,status:form.status,plannedDate:form.plannedDate||null});if(r)emit('saved');return;}
 const body={...form,plannedDate:form.plannedDate||null,startDate:form.startDate||null,dueDate:form.dueDate||null};
 const r=await send(task?'/api/work/tasks/'+task.id:'/api/work/tasks',task?'PUT':'POST',body);if(r)emit('saved');}
const confirmingDelete=ref(false);
async function remove(){const r=await send('/api/work/tasks/'+task!.id,'DELETE',{version:workVersion.value});if(r)emit('saved');}
const comment=ref(''),commentKey=ref(crypto.randomUUID()),comments=ref<{id:number;body:string;createdAt:string;author:WorkUser}[]>([]),commentsError=ref(''),hasMore=ref(false);
async function loadComments(more=false){if(!task)return;try{const rows=await $fetch<typeof comments.value>('/api/work/tasks/'+task.id+'/comments',{query:{after:more?comments.value.at(-1)?.id:undefined}});comments.value=more?[...comments.value,...rows]:rows;hasMore.value=rows.length===100;commentsError.value='';}catch{commentsError.value='Не удалось загрузить обсуждение.';}}
async function postComment(){const r=await send('/api/work/tasks/'+task!.id+'/comments','POST',{clientKey:commentKey.value,body:comment.value});if(r){comment.value='';commentKey.value=crypto.randomUUID();await loadComments();}}
onMounted(()=>{if(!isUpts.value)loadComments();});
defineExpose({useProject:(p:WorkProjectDTO)=>{relationship.value='PROJECT';form.projectId=p.id;form.visibility='PROJECT';form.departmentId=null;form.participantIds=[];}});
</script>
<template><TaskSurface :slide="!!task && !modal && !isUpts" :work-card="isUpts" :title="form.title || (isUpts?'Новая работа':'Новая задача')" :subtitle="subtitle" :color="task?workTaskColor(task):undefined" @close="emit('close')">
 <template #title><WorkName :meta="task?.uptsWorkMeta" :emphasize="isUpts">{{ form.title || (isUpts?'Новая работа':'Новая задача') }}</WorkName></template>
 <form class="work-form" :class="{'upts-task-form':isUpts}" @submit.prevent="save">
 <div class="task-editor-main" :class="{'upts-task-main':isUpts}">
  <p v-if="error" class="work-error" role="alert">{{ error }}</p>
  <fieldset :disabled="saving||readOnly"><label v-if="!isUpts || !task">{{ isUpts ? 'Название работы' : 'Название задачи' }}<input v-model="form.title" required maxlength="250" autofocus /></label>
   <div v-if="!isUpts" class="work-two"><label>К чему относится задача?<select v-model="relationship"><option value="STANDALONE">Самостоятельная задача</option><option value="PROJECT">Задача в рамках проекта</option></select></label>
   <label v-if="relationship==='PROJECT'">Проект<select v-model="form.projectId" required><option :value="null">Выберите проект</option><option v-for="p in projects.filter(p=>p.canCreateTask||p.id===form.projectId)" :key="p.id" :value="p.id">{{ p.name }}</option></select></label>
   <label v-else>Кто видит задачу?<select v-model="form.visibility"><option value="PRIVATE">Только я</option><option value="PARTICIPANTS" :disabled="!context.canAssign">Участники задачи</option><option value="DEPARTMENT" :disabled="!context.canAssign||!context.department">Моё подразделение</option></select></label></div>
   <label v-if="contractOptions.length && (!isUpts || !form.uptsContractId)">Объект<select v-model="form.uptsContractId"><option :value="null">Без привязки к объекту</option><option v-for="c in contractOptions" :key="c.id" :value="c.id">{{ c.number }} · {{ c.name }}</option></select></label>
   <label v-if="!isUpts && objectOptions.length">Связанный участок<select v-model="form.uptsObjectId"><option :value="null">Общая задача проекта</option><option v-for="o in objectOptions" :key="o.id" :value="o.id">{{ o.object.name }}</option></select></label>
   <dl v-if="task?.uptsWorkMeta" class="upts-work-reference">
    <div><dt>Вид работ</dt><dd><WorkName :meta="task.uptsWorkMeta" emphasize>{{ workKindNames(task.uptsWorkMeta)||'Не указан' }}</WorkName></dd></div>
    <div><dt>Ответственная роль</dt><dd>{{ task.uptsWorkMeta.responsibleRole ? UPTS_WORK_ROLES[task.uptsWorkMeta.responsibleRole] : 'Не указана' }}</dd></div>
    <div><dt>Ожидаемый результат</dt><dd>{{ task.uptsWorkMeta.expectedResult || 'Не указан' }}</dd></div>
   </dl>
   <label v-if="!isUpts">Описание и ожидаемый результат<textarea v-model="form.description" rows="4" maxlength="20000" /></label>
   <div v-if="!isUpts" class="work-two"><label>Тип<select v-model="form.kind"><option v-for="(label,key) in WORK_KINDS" :key="key" :value="key">{{ label }}</option></select></label><label>Приоритет<select v-model="form.priority"><option v-for="(label,key) in WORK_PRIORITIES" :key="key" :value="key">{{ label }}</option></select></label></div>
   <PersonPicker :class="{'upts-task-person':isUpts}" v-if="form.visibility!=='PRIVATE'" :disabled="!!task?.uptsContractId && !canAssignUpts" v-model="form.assigneeId" :initial="task?.assignee" :options="assignable" label="Исполнитель" />
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
   <fieldset v-if="needsKuvd" :disabled="saving || readOnly" class="upts-kuvd"><legend>КУВД</legend><div v-for="(entry,i) in kuvdEntries" :key="i" class="upts-kuvd-row"><label>№ КУВД<input v-model="entry.number" maxlength="100" required /></label><label>Дата КУВД<input v-model="entry.date" type="date" min="1900-01-01" max="2200-12-31" required /></label><button type="button" :aria-label="'Удалить запись КУВД '+(i+1)" @click="kuvdEntries.splice(i,1)">×</button></div><button type="button" @click="kuvdEntries.push({number:'',date:null})">+ Добавить КУВД</button></fieldset>
   <div class="upts-result-check" aria-live="polite"><strong>Условия завершения</strong><div v-for="check in resultCheck.checks" :key="check.key"><Icon :name="check.done?'lucide:circle-check':'lucide:circle'" /> {{ check.label }} — {{ check.done?'сохранено':'ожидается' }}</div></div>
   <label>{{ resultCheck.checks.find(c=>c.field==='resultText')?.label || 'Результат работы / примечание' }}<textarea v-model="resultText" :disabled="saving || (readOnly&&!canProgress)" rows="3" maxlength="5000" placeholder="Например: № КУВД, реквизиты выписки или описание результата" /></label>
  </template>
 </div>
 <section v-if="task?.uptsContractId" class="upts-task-files" aria-label="Документы работы">
   <ProjectFiles v-if="selectedProject" :project="selectedProject" :contract-id="task.uptsContractId" :task-id="task.id" default-scope="SHARED" @pending="filesPending=$event" @work-state="fileWorkState" />
   <p class="work-muted">Статус меняется автоматически после сохранения требуемых полей или загрузки документов нужного типа. Все условия завершения должны быть выполнены.</p>
   <p v-if="filesPending" class="work-muted">Завершите загрузку или очистите очередь файлов перед сохранением.</p>
 </section>
 <div class="task-editor-footer" :class="{'upts-task-footer':isUpts}">
  <p v-if="isUpts" class="upts-auto-state" role="status">Состояние: <strong>{{ ({TODO:'Запланировано',IN_PROGRESS:'Выполняется',REVIEW:'На проверке',DONE:'Выполнена'} as Record<string,string>)[form.status] || form.status }}</strong> · автоматически по результату</p>
  <fieldset v-if="!isUpts" :disabled="saving||(readOnly&&!canProgress)"><div class="work-two"><label v-if="!isUpts">Состояние<select v-model="form.status"><option v-for="(label,key) in WORK_STATUSES" :key="key" :value="key">{{ label }}</option></select></label><label v-if="!isUpts">Запланировать работу на<input v-model="form.plannedDate" type="date" /></label></div></fieldset>
  <p v-if="!isUpts" class="work-muted">Плановый день можно переносить независимо от крайнего срока. Календарь — по московскому времени.</p>
  <div class="work-actions"><button v-if="isUpts||!readOnly||canProgress" class="work-primary" :disabled="saving || filesPending || workConflict || (readOnly&&!canProgress)" type="submit">{{ saving?'Сохранение…':'Сохранить' }}</button><button type="button" @click="emit('close')">Закрыть</button><button v-if="task && (isUpts || task.canDelete)" type="button" class="work-danger" :disabled="saving || filesPending || workConflict || !task.canDelete" :title="task.canDelete ? undefined : 'Недостаточно прав для удаления работы'" @click="confirmingDelete=true">Удалить</button></div>
  <p v-if="isUpts && readOnly && !canProgress" class="work-muted" role="status">Работа доступна только для просмотра. Для изменения нужны права руководителя, куратора объекта, кадастрового инженера или назначенного исполнителя.</p>
  <div v-if="confirmingDelete" class="work-confirm"><p>Удалить задачу из рабочих списков? История сохранится.</p><button type="button" :disabled="saving || filesPending" @click="remove">Да, удалить</button><button type="button" @click="confirmingDelete=false">Отмена</button></div>
 </div>
 </form>
 <section v-if="task && !isUpts" class="work-discussion"><h3>Обсуждение</h3><p v-if="commentsError" role="alert">{{ commentsError }} <button @click="loadComments()">Повторить</button></p>
 <article v-for="c in comments" :key="c.id"><strong>{{ workUserName(c.author) }}</strong><small>{{ c.createdAt.slice(0,10) }}</small><p>{{ c.body }}</p></article>
 <button v-if="hasMore" @click="loadComments(true)">Ещё комментарии</button><form v-if="task.canComment" @submit.prevent="postComment"><label>Комментарий<textarea v-model="comment" required maxlength="5000" rows="2" /></label><button :disabled="saving||!comment.trim()">Отправить</button></form>
 </section>
</TaskSurface></template>

<style scoped>.upts-result-check{font-size:12px;display:grid;gap:4px;padding:7px 10px;background:var(--work-bg);border:1px solid var(--work-line);border-radius:6px}.upts-auto-state{margin:0;font-size:13px}.upts-work-reference{padding:12px;border:1px solid var(--work-line);border-radius:8px;margin:0}.upts-work-reference dt{font-size:12px;color:var(--work-muted);margin-top:5px}.upts-work-reference dd{margin:3px 0;overflow-wrap:anywhere}
.work-form:not(.upts-task-form)>.task-editor-main,.work-form:not(.upts-task-form)>.task-editor-footer{display:contents}
.upts-task-form{height:100%;min-height:0;display:flex;flex-direction:column;gap:0}.upts-task-main{flex:0 0 auto;min-height:0;padding:12px 22px;display:flex;flex-direction:column;gap:8px}.upts-task-main fieldset{gap:8px}.upts-task-files{flex:1 1 0;min-height:100px;overflow:auto;overscroll-behavior:contain;border-top:1px solid var(--work-line);padding:10px 22px}.upts-task-files :deep(.project-file-table),.upts-task-files :deep(.project-file-queue){max-height:none;overflow:visible}.upts-task-files :deep(.project-file-table){overflow-x:auto}.upts-task-files>.work-muted{font-size:11px;margin:8px 0}.upts-task-main textarea{resize:none}.upts-task-footer{flex:0 0 auto;padding:12px 22px;background:#e8e8ea;border-top:1px solid var(--work-line);display:grid;gap:10px}.upts-task-main .upts-work-reference{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.upts-task-person{grid-template-columns: minmax(160px, .8fr) minmax(200px,1.2fr);align-items:end}.upts-task-person :deep(small),.upts-task-person :deep(p){grid-column:1/-1}.upts-task-form :deep(input:not([type=checkbox]):not([type=file])),.upts-task-form :deep(select){box-sizing:border-box;height:32px;min-height:32px;padding:5px 8px}.upts-task-main .upts-kuvd{max-height:150px;overflow:auto}.upts-kuvd-row{display:grid;grid-template-columns:1fr 160px auto;gap:10px;align-items:end}.upts-kuvd>button{justify-self:start}.upts-task-footer .work-two{max-width:640px}
:global(html.dark .upts-task-footer){background:#465765}
@media(max-height:760px),(max-width:600px){.upts-task-main{max-height:42dvh;overflow:auto}.upts-task-footer{padding:8px 22px;gap:6px}}
@media(max-width:600px){.upts-task-main .upts-work-reference{grid-template-columns:1fr}.upts-task-person{grid-template-columns:1fr}.upts-kuvd-row{grid-template-columns:1fr 130px auto}}
</style>
