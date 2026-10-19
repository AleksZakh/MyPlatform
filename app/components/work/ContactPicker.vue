<script setup lang="ts">
import { ref,watch,onMounted,onBeforeUnmount } from 'vue';
import type { ChatPerson } from '~~/shared/types/chat';
import { workUserName } from '~~/shared/types/work';
const props=defineProps<{exclude:number[];disabled?:boolean}>();const emit=defineEmits<{choose:[ChatPerson]}>();
const search=ref(''),people=ref<ChatPerson[]>([]),busy=ref(false),error=ref(''),warning=ref(''),more=ref(false);let offset=0,sequence=0,timer:ReturnType<typeof setTimeout>|undefined;
async function load(append=false){const ticket=++sequence;busy.value=true;error.value='';const next=append?offset:0;
 try{const r=await $fetch<{people:ChatPerson[];hasMore:boolean;warning:string|null}>('/api/work/contacts',{query:{q:search.value,offset:next}});if(ticket!==sequence)return;people.value=append?[...people.value,...r.people]:r.people;offset=next+r.people.length;more.value=r.hasMore;warning.value=r.warning||'';}
 catch(e:any){if(ticket===sequence)error.value=e.data?.message||'Не удалось загрузить сотрудников.';}finally{if(ticket===sequence)busy.value=false;}}
watch(search,()=>{sequence++;people.value=[];more.value=false;clearTimeout(timer);timer=setTimeout(()=>load(),300);});onMounted(()=>load());onBeforeUnmount(()=>{sequence++;clearTimeout(timer);});
</script>
<template><div class="work-contact-picker"><label>Сотрудник<input v-model="search" type="search" placeholder="Имя или доменный логин" :disabled="disabled" /></label><p class="work-muted">В списке — активные сотрудники Space. Для поиска ещё не активированных сотрудников введите имя или логин.</p>
 <p v-if="error" class="work-error" role="alert">{{ error }} <button type="button" @click="load()">Повторить</button></p><p v-if="warning" role="status">{{ warning }}</p>
 <div class="work-choice-list"><button v-for="p in people.filter(p=>!p.id||!props.exclude.includes(p.id))" :key="p.directoryObjectId||p.id" type="button" :disabled="disabled||busy" @click="emit('choose',p)"><strong>{{ workUserName(p) }}</strong><small>{{ p.login }} · {{ p.status==='ACTIVE'?'Активен в Space':'Доменный сотрудник · нужна активация' }}</small></button></div>
 <p v-if="busy" role="status">Поиск…</p><p v-else-if="!people.filter(p=>!p.id||!props.exclude.includes(p.id)).length" class="work-muted">Новых участников не найдено. Измените запрос.</p>
 <button v-if="more" type="button" :disabled="busy||disabled" @click="load(true)">Показать ещё</button>
</div></template>
