<script setup lang="ts">
import { ref,onMounted,onBeforeUnmount } from 'vue';
import { WORK_ROLES,workUserName,type WorkUser } from '~~/shared/types/work';
const emit=defineEmits<{accepted:[number]}>();const route=useRoute();
type Invitation={id:string;role:keyof typeof WORK_ROLES;expiresAt:string;project:{id:number;name:string;color:string};inviter:WorkUser};
const rows=ref<Invitation[]>([]),opened=ref(route.query.invitations==='1'),loadError=ref(''),busy=ref(false);const {error,saving,send}=useWorkApi();let timer:ReturnType<typeof setInterval>|undefined,sequence=0;
async function load(){const ticket=++sequence;busy.value=true;loadError.value='';try{const r=await $fetch<Invitation[]>('/api/work/invitations');if(ticket===sequence)rows.value=r;}catch{if(ticket===sequence)loadError.value='Не удалось проверить приглашения.';}finally{if(ticket===sequence)busy.value=false;}}
async function respond(row:Invitation,decision:'ACCEPT'|'DECLINE'){const r=await send<{projectId:number}>('/api/work/invitations/'+row.id,'POST',{decision});if(r){await load();if(decision==='ACCEPT')emit('accepted',r.projectId);}}
function refreshVisible(){if(document.visibilityState==='visible')load();}
onMounted(()=>{load();window.addEventListener('focus',refreshVisible);timer=setInterval(refreshVisible,60000);});onBeforeUnmount(()=>{sequence++;clearInterval(timer);window.removeEventListener('focus',refreshVisible);});
</script>
<template><section class="work-invitations"><button :aria-expanded="opened" @click="opened=!opened;if(opened)load()">Приглашения в проекты <strong v-if="rows.length">({{ rows.length }})</strong></button><span v-if="loadError" class="work-error" role="status">{{ loadError }}</span>
 <div v-if="opened"><p v-if="error" class="work-error" role="alert">{{ error }}</p><p v-if="busy" role="status">Проверяем приглашения…</p><p v-else-if="!rows.length&&!loadError" class="work-muted">Ожидающих приглашений нет.</p>
 <article v-for="r in rows" :key="r.id" class="work-invitation-card" :style="{'--project-color':r.project.color}"><h3>{{ r.project.name }}</h3><p>{{ workUserName(r.inviter) }} приглашает вас. Роль: {{ WORK_ROLES[r.role] }}.</p><p class="work-muted">Доступ ко всем задачам проекта будет открыт после принятия. Приглашение действительно до {{ new Date(r.expiresAt).toLocaleString('ru-RU',{timeZone:'Europe/Moscow'}) }} (МСК).</p><div class="work-actions"><button class="work-primary" :disabled="saving" @click="respond(r,'ACCEPT')">Принять</button><button :disabled="saving" @click="respond(r,'DECLINE')">Отклонить</button></div></article>
 </div></section></template>
