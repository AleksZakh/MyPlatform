<script setup lang="ts">
import { ref,watch } from 'vue';import PersonPicker from './PersonPicker.vue';
import { WORK_ROLES,workUserName,type WorkProjectDTO } from '~~/shared/types/work';
const props=defineProps<{project:WorkProjectDTO;userId:number}>();const emit=defineEmits<{changed:[]}>();
const {error,saving,send}=useWorkApi();const candidate=ref<number|null>(null),role=ref('MEMBER'),removing=ref<number|null>(null),reassign=ref<number|null>(null);
const editable=()=>props.project.canManage&&!props.project.archivedAt;
async function add(){if(!candidate.value)return;const r=await send('/api/work/projects/'+props.project.id+'/members','PUT',{version:props.project.version,userId:candidate.value,role:role.value});if(r){candidate.value=null;emit('changed');}}
async function change(userId:number,role:string){const r=await send('/api/work/projects/'+props.project.id+'/members','PUT',{version:props.project.version,userId,role});if(r)emit('changed');}
async function remove(){const r=await send('/api/work/projects/'+props.project.id+'/members','DELETE',{version:props.project.version,userId:removing.value,reassignTo:reassign.value});if(r){removing.value=null;emit('changed');}}
watch(removing,()=>{error.value='';reassign.value=null;});
</script>
<template><section class="work-members"><h2>Участники проекта</h2><p class="work-muted">Владелец: {{ workUserName(project.owner) }}. Его полномочия сохраняются. Наблюдатели читают, кураторы обсуждают, исполнители работают с задачами, руководители ведут проект.</p>
 <p v-if="error" class="work-error" role="alert">{{ error }}</p>
 <div v-for="m in project.members" :key="m.userId" class="work-member"><strong>{{ workUserName(m.user) }}</strong>
 <select :value="m.role" :aria-label="'Роль '+workUserName(m.user)" :disabled="saving||!editable()||(m.role==='MANAGER'&&project.ownerId!==userId)" @change="change(m.userId,($event.target as HTMLSelectElement).value)"><option v-for="(label,key) in WORK_ROLES" :key="key" :value="key" :disabled="key==='MANAGER'&&project.ownerId!==userId">{{ label }}</option></select>
 <button v-if="editable()&&(project.ownerId===userId||m.role!=='MANAGER')" :disabled="saving" @click="removing=m.userId">Исключить</button></div>
 <form v-if="editable()&&project.scope!=='PRIVATE'" class="work-form work-member-add" @submit.prevent="add"><PersonPicker v-model="candidate" label="Добавить сотрудника"/><label>Роль<select v-model="role"><option v-for="(label,key) in WORK_ROLES" :key="key" :value="key" :disabled="key==='MANAGER'&&project.ownerId!==userId">{{ label }}</option></select></label><button class="work-primary" :disabled="saving||!candidate">Добавить в проект</button></form>
 <p v-if="project.scope==='PRIVATE'">Чтобы добавить участников, измените видимость проекта в настройках.</p>
 <div v-if="removing" class="work-confirm"><p>Исключить сотрудника #{{ removing }}? При наличии открытых задач выберите, кому их передать.</p><label>Новый исполнитель<select v-model="reassign"><option :value="null">Не выбран</option><option :value="project.ownerId">Владелец проекта</option><option v-for="m in project.members.filter(m=>m.userId!==removing&&['MEMBER','MANAGER'].includes(m.role))" :key="m.userId" :value="m.userId">{{ workUserName(m.user) }}</option></select></label><button :disabled="saving" @click="remove">Исключить</button><button @click="removing=null">Отмена</button></div>
</section></template>
