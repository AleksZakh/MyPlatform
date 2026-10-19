<script setup lang="ts">
import { ref,watch,onMounted,onBeforeUnmount } from 'vue';
import { WORK_ROLES,workUserName,type WorkUser,type WorkProjectDTO } from '~~/shared/types/work';
const props=defineProps<{project:WorkProjectDTO;userId:number}>();const emit=defineEmits<{changed:[]}>();
type Group={id:number;name:string};type Preview={group:Group;revision:string;users:WorkUser[];skippedInactive:number};
const query=ref(''),groups=ref<Group[]>([]),page=ref(1),total=ref(0),preview=ref<Preview|null>(null),selected=ref<number[]>([]),role=ref('MEMBER'),loading=ref(false),notice=ref('');
const {error,saving,send}=useWorkApi();let sequence=0,timer:ReturnType<typeof setTimeout>|undefined;
const existing=(id:number)=>id===props.project.ownerId||props.project.members.some(m=>m.userId===id);
async function load(append=false){const ticket=++sequence;loading.value=true;error.value='';const next=append?page.value+1:1;
 try{const r=await $fetch<{items:Group[];total:number}>('/api/work/projects/'+props.project.id+'/groups',{query:{q:query.value,page:next}});if(ticket!==sequence)return;groups.value=append?[...groups.value,...r.items]:r.items;total.value=r.total;page.value=next;}catch(e:any){if(ticket===sequence)error.value=e.data?.message||'Не удалось загрузить группы.';}finally{if(ticket===sequence)loading.value=false;}}
async function choose(g:Group){const ticket=++sequence;loading.value=true;error.value='';notice.value='';preview.value=null;
 try{const r=await $fetch<Preview>('/api/work/projects/'+props.project.id+'/groups/'+g.id);if(ticket!==sequence)return;preview.value=r;selected.value=r.users.filter(u=>!existing(u.id)).slice(0,1000).map(u=>u.id);}catch(e:any){if(ticket===sequence)error.value=e.data?.data?.message||e.data?.message||'Не удалось прочитать состав группы.';}finally{if(ticket===sequence)loading.value=false;}}
async function add(){if(!preview.value)return;const r=await send<{addedIds:number[];unchanged:number}>('/api/work/projects/'+props.project.id+'/groups','POST',{version:props.project.version,groupId:preview.value.group.id,revision:preview.value.revision,role:role.value,userIds:selected.value});if(r){notice.value=`Добавлено сотрудников: ${r.addedIds.length}.`;preview.value=null;selected.value=[];emit('changed');}}
watch(query,()=>{sequence++;preview.value=null;groups.value=[];clearTimeout(timer);timer=setTimeout(()=>load(),300);});onMounted(()=>load());onBeforeUnmount(()=>{sequence++;clearTimeout(timer);});
</script>
<template><section class="work-group-members"><h3>Добавить сотрудников группы Space</h3><p class="work-muted">Выберите группу и проверьте сотрудников. В проект добавятся выбранные активные учётные записи, в том числе из связанных групп AD. За один раз можно добавить до 1000 сотрудников. Изменения состава группы в дальнейшем не изменяют команду проекта. Уже назначенные роли сохраняются.</p>
 <p v-if="error" class="work-error" role="alert">{{ error }}</p><p v-if="notice" role="status">{{ notice }}</p>
 <label>Поиск группы<input v-model="query" type="search" :disabled="saving" placeholder="Название группы Space" /></label><button type="button" :disabled="saving||loading" @click="preview=null;load()">Обновить группы</button>
 <div class="work-choice-list"><button v-for="g in groups" :key="g.id" type="button" :disabled="saving||loading" @click="choose(g)">{{ g.name }}</button></div>
 <button v-if="groups.length<total" type="button" :disabled="loading||saving" @click="load(true)">Ещё группы</button><p v-if="loading" role="status">Загружаем состав…</p><p v-else-if="!groups.length">Активных групп не найдено.</p>
 <form v-if="preview" class="work-form work-confirm" @submit.prevent="add"><h3>{{ preview.group.name }}</h3><p>Активных сотрудников: {{ preview.users.length }}. Неактивных учётных записей Space пропущено: {{ preview.skippedInactive }}.</p>
 <p class="work-muted">Ещё не зарегистрированных и неактивированных сотрудников можно пригласить по имени или логину на вкладке «Сотрудник».</p>
 <div class="work-choice-list"><label v-for="u in preview.users" :key="u.id" class="work-check"><input v-model="selected" :value="u.id" type="checkbox" :disabled="saving||existing(u.id)||(!selected.includes(u.id)&&selected.length>=1000)"/>{{ workUserName(u) }} <small v-if="existing(u.id)">Уже в проекте</small></label></div>
 <label>Роль для новых участников<select v-model="role" :disabled="saving"><option v-for="(label,key) in WORK_ROLES" :key="key" :value="key" :disabled="key==='MANAGER'&&project.ownerId!==userId">{{ label }}</option></select></label><button class="work-primary" :disabled="saving||!selected.length">Добавить выбранных ({{ selected.length }})</button>
 </form></section></template>
