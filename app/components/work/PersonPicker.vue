<script setup lang="ts">
import { ref, watch, computed, onBeforeUnmount } from 'vue';
import { workUserName, type WorkUser } from '~~/shared/types/work';
const props=defineProps<{modelValue:number|null;options?:WorkUser[];disabled?:boolean;label?:string;initial?:WorkUser|null}>();
const emit=defineEmits<{'update:modelValue':[number|null]}>();
const query=ref(''),rows=ref<WorkUser[]>([]),total=ref(0),page=ref(1),error=ref(''),loading=ref(false);let timer:ReturnType<typeof setTimeout>|undefined;let serial=0;
const choices=computed(()=>{
 const base=props.options || rows.value;const filtered=props.options?base.filter(u=>workUserName(u).toLowerCase().includes(query.value.toLowerCase())):base;
 const selected=props.initial?.id===props.modelValue?props.initial:base.find(u=>u.id===props.modelValue);
 return selected&&!filtered.some(u=>u.id===selected.id)?[selected,...filtered]:filtered;
});
async function load(more=false){if(props.options)return;const ticket=++serial;loading.value=true;error.value='';const target=more?page.value+1:1;
 try{const data=await $fetch<{items:WorkUser[];total:number}>('/api/work/people',{query:{q:query.value,page:target}});if(ticket!==serial)return;rows.value=more?[...rows.value,...data.items]:data.items;total.value=data.total;page.value=target;}
 catch{if(ticket===serial)error.value='Не удалось загрузить сотрудников.';}finally{if(ticket===serial)loading.value=false;}}
watch(query,()=>{clearTimeout(timer);timer=setTimeout(()=>load(),250);});
watch(()=>props.options,()=>{if(!props.options)load();},{immediate:true});
onBeforeUnmount(()=>{clearTimeout(timer);serial++;});
</script>
<template><div class="work-picker">
 <label><span>{{ label || 'Сотрудник' }}</span><input v-model="query" type="search" placeholder="Поиск по имени или логину" :disabled="disabled" /></label>
 <select :aria-label="label || 'Выбрать сотрудника'" :value="modelValue ?? ''" :disabled="disabled" @change="emit('update:modelValue', Number(($event.target as HTMLSelectElement).value)||null)">
  <option value="">Не выбран</option><option v-if="modelValue && !choices.some(u=>u.id===modelValue)" :value="modelValue">Сотрудник №{{ modelValue }}</option>
  <option v-for="u in choices" :key="u.id" :value="u.id">{{ workUserName(u) }}</option>
 </select>
 <small v-if="loading">Загрузка…</small><p v-if="error" role="alert">{{ error }} <button type="button" @click="load()">Повторить</button></p>
 <button v-if="!options && rows.length<total" type="button" :disabled="loading" @click="load(true)">Ещё сотрудники ({{ rows.length }} / {{ total }})</button>
</div></template>
