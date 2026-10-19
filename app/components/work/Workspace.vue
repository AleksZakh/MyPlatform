<script setup lang="ts">
import { ref,computed } from 'vue';
import type { WorkTaskDTO,WorkProjectDTO } from '~~/shared/types/work';
import { WORK_STATUSES,workUserName } from '~~/shared/types/work';
import { dateKey } from '~~/shared/utils/work-board';
import Board from './Board.vue';import Timeline from './Timeline.vue';import TaskEditor from './TaskEditor.vue';import ProjectEditor from './ProjectEditor.vue';import Members from './Members.vue';import Invitations from './Invitations.vue';
const {context,projects,project,tasks,tab,view,selectedDepartment,archived,completed,search,today,loading,error,saveError,saving,taskTotal,projectTotal,contextLabel,loadProjects,loadTasks,reload,initialize,openProject,selectTab,move,toggleArchive}=useWorkWorkspace();
const editorRef=ref<InstanceType<typeof TaskEditor>|null>(null);
const taskEditor=ref(false),task=ref<WorkTaskDTO|null>(null),projectEditor=ref(false),editingProject=ref<WorkProjectDTO|null>(null),archiveConfirm=ref(false),detailLoading=ref(false);
const route=useRoute();const visibleProjects=computed(()=>route.params.department&&selectedDepartment.value?projects.value.filter(p=>p.departmentId===selectedDepartment.value||p.scope==='PRIVATE'):projects.value);
const tabs=[{key:'mine',label:'Мои задачи'},{key:'department',label:'Задачи отдела'},{key:'projects',label:'Проекты'}] as const;
async function editTask(t?:WorkTaskDTO){error.value='';if(t){detailLoading.value=true;try{task.value=await $fetch<WorkTaskDTO>('/api/work/tasks/'+t.id);if(task.value.projectId&&!projects.value.some(p=>p.id===task.value?.projectId)){projects.value.push(await $fetch<WorkProjectDTO>('/api/work/projects/'+task.value.projectId));}}catch(e:any){error.value=e.data?.message||'Не удалось открыть задачу.';return;}finally{detailLoading.value=false;}}else task.value=null;taskEditor.value=true;}
function editProject(p:WorkProjectDTO|null=null){editingProject.value=p;projectEditor.value=true;}
async function taskSaved(){taskEditor.value=false;await reload();}
async function projectSaved(p:WorkProjectDTO){projectEditor.value=false;await reload();if(taskEditor.value){if(!projects.value.some(x=>x.id===p.id))projects.value.push(p);editorRef.value?.useProject(p);}else await openProject(p);}
async function invitationAccepted(id:number){try{await reload();await openProject(await $fetch<WorkProjectDTO>('/api/work/projects/'+id));}catch{error.value='Приглашение принято. Обновите список проектов.';}}
async function archive(){archiveConfirm.value=false;await toggleArchive();}
</script>
<template><section class="work-root work-workspace">
 <header class="work-page-head"><div><p class="work-eyebrow">SPACE · {{ route.params.department?contextLabel:'Рабочее пространство' }}</p><h1>Задачи и проекты</h1><p class="work-muted">Личная работа и общие проекты — в одном месте</p></div>
 <div class="work-actions"><button :disabled="loading||!context" aria-label="Обновить список" @click="context?reload():initialize()">Обновить</button><button v-if="context" class="work-primary" :disabled="detailLoading||!!project&&!project.canCreateTask" @click="editTask()">+ Задача</button><button v-if="context" @click="editProject()">+ Проект</button></div></header>
 <Invitations v-if="context" @accepted="invitationAccepted"/>
 <nav class="work-tabs" aria-label="Раздел задач"><button v-for="t in tabs" :key="t.key" :aria-pressed="tab===t.key" @click="selectTab(t.key)">{{ t.label }}</button></nav>
 <p v-if="error||saveError" role="alert" class="work-error">{{ error||saveError }}</p>
 <div v-if="context" class="work-body">
  <template v-if="tab==='projects'&&!project"><div class="work-toolbar"><h2>{{ route.params.department?'Проекты подразделения и личные':'Доступные проекты' }}</h2><label class="work-check"><input v-model="archived" type="checkbox"/>Архив</label><label v-if="route.params.department">Подразделение<select v-model="selectedDepartment"><option v-for="d in context.departments" :key="d.id" :value="d.id">{{ d.name }}</option></select></label></div>
   <div class="work-project-grid"><button v-for="p in visibleProjects" :key="p.id" class="work-project-card" :style="{'--project-color':p.color}" @click="openProject(p)"><span class="work-project-tag">{{ p.department?.name|| (p.scope==='PRIVATE'?'Личный проект':'Командный проект') }}</span><h2>{{ p.name }}</h2><p>{{ p.description||'Добавьте цель и ожидаемый результат проекта' }}</p><footer><span>{{ p.members.length+1 }} участн.</span><span>{{ dateKey(p.dueDate)||'Срок не задан' }}</span></footer></button></div>
   <div v-if="!visibleProjects.length&&!loading" class="work-empty"><h2>Начните с первого проекта</h2><p>Определите цель, добавьте задачи и пригласите участников.</p><button class="work-primary" @click="editProject()">Создать проект</button></div>
   <button v-if="projects.length<projectTotal" @click="loadProjects(true).catch(()=>error='Не удалось загрузить проекты.')">Ещё проекты ({{ projects.length }} / {{ projectTotal }})</button>
  </template>
  <template v-else>
   <header v-if="project" class="work-project-header" :style="{'--project-color':project.color}"><button @click="project=null;selectTab('projects')">← Все проекты</button><h2>{{ project.name }}</h2><p>{{ project.description }}</p><div class="work-actions"><span>{{ project.archivedAt?'Архив · только чтение':project.department?.name||'Проект' }}</span><button v-if="project.canManage&&!project.archivedAt" @click="editProject(project)">Настройки</button><button v-if="project.canManage" @click="archiveConfirm=true">{{ project.archivedAt?'Восстановить':'В архив' }}</button></div><div v-if="archiveConfirm" class="work-confirm"><p>{{ project.archivedAt?'Восстановить проект?':'Перевести проект в архив? Задачи останутся доступны для чтения.' }}</p><button :disabled="saving" @click="archive">Подтвердить</button><button @click="archiveConfirm=false">Отмена</button></div></header>
   <div class="work-toolbar"><div class="work-view-switch" aria-label="Представление задач"><button :aria-pressed="view==='time'" @click="view='time'">По дням</button><button :aria-pressed="view==='status'" @click="view='status'">По состоянию</button><button :aria-pressed="view==='list'" @click="view='list'">Список</button><button v-if="project" :aria-pressed="view==='timeline'" @click="view='timeline'">План</button><button v-if="project" :aria-pressed="view==='members'" @click="view='members'">Участники</button></div>
    <label v-if="tab==='department'&&!project">Подразделение<select v-model="selectedDepartment"><option :value="null">Выберите отдел</option><option v-for="d in context.departments" :key="d.id" :value="d.id">{{ d.name }}</option></select></label>
    <input v-if="view!=='members'" v-model="search" type="search" aria-label="Поиск задач" placeholder="Поиск по названию задачи"/><label v-if="view!=='members'" class="work-check"><input v-model="completed" type="checkbox"/>Показывать готовые</label>
   </div>
   <p v-if="tab==='department'&&!selectedDepartment&&!project" class="work-empty">Выберите подразделение. Будут показаны только доступные вам задачи.</p>
   <p v-if="tab==='mine'" class="work-muted">Ваши задачи из всех проектов и подразделений. Личные задачи видны только вам.</p>
   <p v-if="loading||detailLoading" role="status">Загрузка…</p>
   <Members v-if="view==='members'&&project" :project="project" :user-id="context.userId" @changed="reload" @settings="editProject(project)"/>
   <Timeline v-else-if="view==='timeline'" :tasks="tasks" :today="today" @open="editTask"/>
   <div v-else-if="view==='list'" class="work-table-wrap"><table><thead><tr><th>Задача</th><th>Проект</th><th>Исполнитель</th><th>Состояние</th><th>План</th><th>Срок</th></tr></thead><tbody><tr v-for="t in tasks" :key="t.id"><td><button @click="editTask(t)">{{ t.title }}</button></td><td>{{ t.project?.name||'Самостоятельная' }}</td><td>{{ workUserName(t.assignee) }}</td><td>{{ WORK_STATUSES[t.status as keyof typeof WORK_STATUSES] }}</td><td>{{ dateKey(t.plannedDate)||'—' }}</td><td>{{ dateKey(t.dueDate)||'—' }}</td></tr></tbody></table><p v-if="!tasks.length&&!loading" class="work-empty">Задач пока нет</p></div>
   <Board v-else :tasks="tasks" :mode="view==='status'?'status':'time'" :today="today" :busy="saving" @open="editTask" @move="move"/>
   <footer v-if="view!=='members'" class="work-list-footer"><span>Показано {{ tasks.length }} из {{ taskTotal }}</span><button v-if="tasks.length<taskTotal" :disabled="loading" @click="loadTasks(true)">Показать ещё</button><span v-if="tasks.length<taskTotal">Доска и план показывают загруженные задачи.</span></footer>
  </template>
 </div>
 <p v-else-if="loading" class="work-empty" role="status">Открываем рабочее пространство…</p>
 <TaskEditor ref="editorRef" @create-project="editProject()" v-if="taskEditor&&context" :task="task" :projects="projects" :project="project" :context="context" @close="taskEditor=false" @saved="taskSaved"/>
 <ProjectEditor v-if="projectEditor&&context" :project="editingProject" :context="context" @close="projectEditor=false" @saved="projectSaved"/>
</section></template>
<style src="~/assets/css/work.css"></style>
