<script setup lang="ts">
import { reactive } from 'vue';import Modal from './Modal.vue';
import { WORK_COLORS,type WorkProjectDTO,type WorkContext } from '~~/shared/types/work';import { dateKey } from '~~/shared/utils/work-board';
const props=defineProps<{project:WorkProjectDTO|null;context:WorkContext}>();const emit=defineEmits<{close:[];saved:[WorkProjectDTO]}>();
const p=props.project;const {error,saving,send}=useWorkApi();
const form=reactive({clientKey:crypto.randomUUID(),version:p?.version,name:p?.name||'',description:p?.description||'',color:p?.color||WORK_COLORS[0],scope:p?.scope||'PRIVATE',departmentId:p?.departmentId||null,startDate:dateKey(p?.startDate)||'',dueDate:dateKey(p?.dueDate)||''});
async function save(){const r=await send<WorkProjectDTO>(p?'/api/work/projects/'+p.id:'/api/work/projects',p?'PUT':'POST',{...form,departmentId:form.scope==='PRIVATE'?null:form.departmentId,startDate:form.startDate||null,dueDate:form.dueDate||null});if(r)emit('saved',r);}
</script>
<template><Modal :title="p?'Настройки проекта':'Создать проект'" @close="emit('close')"><form class="work-form" @submit.prevent="save">
 <p v-if="error" class="work-error" role="alert">{{ error }}</p><fieldset :disabled="saving">
 <label>Название проекта<input v-model="form.name" required maxlength="200" autofocus /></label><label>Цель и ожидаемый результат<textarea v-model="form.description" rows="4" maxlength="20000" /></label>
 <div class="work-two"><label>Видимость<select v-model="form.scope" :disabled="!!p&&p.ownerId!==context.userId"><option value="PRIVATE">Личный проект</option><option value="TEAM" :disabled="!context.canCreateShared&&(!p||p.scope==='PRIVATE')">Только команда проекта</option><option value="DEPARTMENT" :disabled="!context.canCreateShared&&(!p||p.scope==='PRIVATE')">Команда и подразделение</option></select></label>
 <label v-if="form.scope!=='PRIVATE'">Подразделение-владелец<select v-model="form.departmentId" :required="form.scope==='DEPARTMENT'" :disabled="!!p&&p.ownerId!==context.userId"><option :value="null">Без подразделения</option><option v-for="d in context.departments.filter(d=>context.isSystemAdmin||d.id===context.department?.id||d.id===p?.departmentId)" :key="d.id" :value="d.id">{{ d.name }}</option></select></label></div>
 <p class="work-muted">Подразделение — отдел в организационной структуре. Группы Space добавляются на вкладке «Участники» после сохранения проекта с видимостью «Только команда проекта» или «Команда и подразделение».</p>
 <p v-if="!context.canCreateShared" class="work-muted">Личные проекты доступны сразу. Создание общих проектов разрешается в центре администрирования.</p>
 <div class="work-two"><label>Начало<input v-model="form.startDate" type="date" /></label><label>Плановое завершение<input v-model="form.dueDate" type="date" /></label></div>
 <label>Цвет проекта<input v-model="form.color" type="color" /></label><div class="work-colors"><button v-for="c in WORK_COLORS" :key="c" :style="{background:c}" type="button" :aria-label="'Цвет '+c" :aria-pressed="form.color===c" @click="form.color=c"></button></div>
 </fieldset><div class="work-actions"><button class="work-primary" :disabled="saving">{{ saving?'Сохранение…':'Сохранить проект' }}</button><button type="button" @click="emit('close')">Отмена</button></div>
</form></Modal></template>
