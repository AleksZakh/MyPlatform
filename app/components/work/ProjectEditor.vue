<script setup lang="ts">
import { reactive, ref, computed, onMounted, onBeforeUnmount } from 'vue';
import Modal from './Modal.vue';
import { WORK_COLORS, type WorkProjectDTO, type WorkContext } from '~~/shared/types/work';
import { UPTS_TYPES, UPTS_STATUSES, type UptsProjectDTO } from '~~/shared/types/upts';
import { dateKey } from '~~/shared/utils/work-board';
const props=defineProps<{project:WorkProjectDTO|null;context:WorkContext;uptsMode?:boolean}>();
const emit=defineEmits<{close:[];saved:[WorkProjectDTO]}>();
const p=props.project;
const meta=(p as UptsProjectDTO|null)?.upts;
const upts=reactive({projectType:meta?.projectType||'LAND',status:meta?.status||'INTAKE',basis:meta?.basis||'',initiator:meta?.initiator||'',receivedDate:dateKey(meta?.receivedDate)||'',completionNote:meta?.completionNote||''});
const currentContext=ref(props.context),loading=ref(false),loadError=ref('');
let alive=true;
const {error,saving,send}=useWorkApi();
const visibility=ref(p?.scope==='GROUP'||p?.scope==='DEPARTMENT'?'SHARED':p?.scope||(props.uptsMode&&props.context.canCreateShared?'TEAM':'PRIVATE'));
const affiliation=ref(p?.groupId?'GROUP':p?.departmentId?'DEPARTMENT':'NONE');
const ownsProject=computed(()=>!p||p.ownerId===props.context.userId);
const form=reactive({clientKey:crypto.randomUUID(),version:p?.version,name:p?.name||'',description:p?.description||'',color:p?.color||WORK_COLORS[0],departmentId:p?.departmentId||null,groupId:p?.groupId||null,startDate:dateKey(p?.startDate)||'',dueDate:dateKey(p?.dueDate)||''});
const groups=computed(()=>currentContext.value.groups||[]);
const missingAffiliation=computed(()=>visibility.value==='SHARED'&&(affiliation.value==='NONE'||(affiliation.value==='GROUP'?!form.groupId:!form.departmentId)));
async function refresh(){
 loading.value=true;loadError.value='';
 try{const value=await $fetch<WorkContext>('/api/work/context');if(alive)currentContext.value=value;}
 catch{if(alive)loadError.value='Не удалось обновить подразделения и группы. Повторите загрузку перед сохранением.';}
 finally{if(alive)loading.value=false;}
}
onMounted(refresh);onBeforeUnmount(()=>{alive=false;});
async function save(){
 if(missingAffiliation.value)return;
 const scope=visibility.value==='SHARED'?affiliation.value:visibility.value;
 const result=await send<WorkProjectDTO>(p?'/api/work/projects/'+p.id:'/api/work/projects',p?'PUT':'POST',{
  ...form,scope,...(props.uptsMode?{upts:{...upts,receivedDate:upts.receivedDate||null}}:{}),
  departmentId:scope!=='PRIVATE'&&affiliation.value==='DEPARTMENT'?form.departmentId:null,
  groupId:scope!=='PRIVATE'&&affiliation.value==='GROUP'?form.groupId:null,
  startDate:form.startDate||null,dueDate:form.dueDate||null,
 });
 if(result)emit('saved',result);
}
</script>
<template>
 <Modal :title="p?'Настройки проекта':'Создать проект'" @close="emit('close')">
  <form class="work-form" @submit.prevent="save">
   <p v-if="error" class="work-error" role="alert">{{ error }}</p>
   <fieldset :disabled="saving">
    <label>Название проекта<input v-model="form.name" required maxlength="200" autofocus /></label>
    <template v-if="uptsMode">
     <div class="work-two"><label>Тип проекта<select v-model="upts.projectType"><option v-for="(label,key) in UPTS_TYPES" :key="key" :value="key">{{ label }}</option></select></label><label>Состояние<select v-model="upts.status"><option v-for="(label,key) in UPTS_STATUSES" :key="key" :value="key">{{ label }}</option></select></label></div>
     <label>Основание / входящее задание<textarea v-model="upts.basis" rows="2" maxlength="2000" /></label>
     <div class="work-two"><label>Инициатор<input v-model="upts.initiator" maxlength="200" /></label><label>Дата поступления<input v-model="upts.receivedDate" type="date" /></label></div>
     <label v-if="upts.status==='DONE'">Результат завершения<textarea v-model="upts.completionNote" required maxlength="2000" rows="2" /></label>
     <p class="work-muted">Пробная модель УПТС. Типы и состояния уточняются с подразделением. Шаблон работ можно применить после создания проекта.</p>
    </template>
    <label>Цель и ожидаемый результат<textarea v-model="form.description" rows="4" maxlength="20000" /></label>
    <label>Видимость<select v-model="visibility" :disabled="!ownsProject">
     <option value="PRIVATE">Личный проект</option>
     <option value="TEAM" :disabled="!currentContext.canCreateShared&&(!p||p.scope==='PRIVATE')">Только команда проекта</option>
     <option value="SHARED" :disabled="!currentContext.canCreateShared&&(!p||p.scope==='PRIVATE')">Команда и выбранное подразделение / группа</option>
    </select></label>
    <template v-if="visibility!=='PRIVATE'">
     <div class="work-two">
      <label>Принадлежность проекта<select v-model="affiliation" :disabled="!ownsProject">
       <option value="NONE">Без привязки</option><option value="DEPARTMENT">Подразделение</option><option value="GROUP">Группа Space</option>
      </select></label>
      <label v-if="affiliation==='DEPARTMENT'">Подразделение-владелец<select v-model="form.departmentId" required :disabled="!ownsProject">
       <option :value="null">Выберите подразделение</option>
       <option v-if="p?.departmentId&&!currentContext.departments.some(d=>d.id===p?.departmentId)" :value="p.departmentId" disabled>{{ p.department?.name }} (недоступно)</option>
       <option v-for="d in currentContext.departments" :key="d.id" :value="d.id">{{ d.name }}</option>
      </select></label>
      <label v-if="affiliation==='GROUP'">Группа-владелец<select v-model="form.groupId" required :disabled="!ownsProject">
       <option :value="null">Выберите группу Space</option>
       <option v-if="p?.groupId&&!groups.some(g=>g.id===p?.groupId)" :value="p.groupId" disabled>{{ p.group?.name }} (недоступна)</option>
       <option v-for="g in groups" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select></label>
     </div>
     <div class="work-actions"><button type="button" :disabled="loading" @click="refresh">{{ loading?'Обновляем списки…':'Обновить подразделения и группы' }}</button></div>
     <p v-if="loadError" class="work-error" role="alert">{{ loadError }}</p>
     <p v-if="missingAffiliation" class="work-muted">Для общей видимости выберите подразделение или группу Space.</p>
     <p v-if="visibility==='TEAM'" class="work-muted">Проект доступен только его владельцу и команде. Привязка к подразделению или группе сама по себе не предоставляет доступ.</p>
     <p v-else-if="affiliation==='GROUP'" class="work-muted">Активные сотрудники выбранной группы Space, включая участников связанных активных групп AD, смогут читать проект и его задачи. Состав проверяется при обращении к проекту. Для редактирования назначьте сотруднику роль на вкладке «Участники». После выхода из группы доступ по группе прекращается; отдельно назначенная роль в команде сохраняется.</p>
     <p v-else-if="affiliation==='DEPARTMENT'" class="work-muted">Активные сотрудники выбранного подразделения смогут читать проект и его задачи. Роли для редактирования назначаются на вкладке «Участники».</p>
     <p class="work-muted">Группа или подразделение определяет принадлежность проекта. Владельцем и ответственным за назначение руководителей остаётся создатель проекта.</p>
    </template>
    <p v-if="!currentContext.canCreateShared" class="work-muted">Создание общих проектов и смена их принадлежности разрешаются в центре администрирования.</p>
    <div class="work-two"><label>Начало<input v-model="form.startDate" type="date" /></label><label>Плановое завершение<input v-model="form.dueDate" type="date" /></label></div>
    <label>Цвет проекта<input v-model="form.color" type="color" /></label>
    <div class="work-colors"><button v-for="c in WORK_COLORS" :key="c" :style="{background:c}" type="button" :aria-label="'Цвет '+c" :aria-pressed="form.color===c" @click="form.color=c"></button></div>
   </fieldset>
   <div class="work-actions"><button class="work-primary" :disabled="saving||missingAffiliation||(visibility!=='PRIVATE'&&(loading||!!loadError))">{{ saving?'Сохранение…':'Сохранить проект' }}</button><button type="button" @click="emit('close')">Отмена</button></div>
  </form>
 </Modal>
</template>
