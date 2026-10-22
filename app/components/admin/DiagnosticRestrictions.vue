
<script setup lang="ts">
import {ref,onMounted} from 'vue';
const props=defineProps<{userId:number;canManage:boolean}>();const emit=defineEmits<{saved:[]}>();
const labels={VIEW:'Просмотр',CREATE:'Создание',UPDATE:'Изменение',DELETE:'Удаление'};
const selected=ref<string[]>([]),revision=ref(''),error=ref(''),busy=ref(false);
const endpoint='/api/admin/users/'+props.userId+'/diagnostic-restrictions';
async function load(){busy.value=true;error.value='';try{const r=await $fetch<{actions:string[];revision:string}>(endpoint);selected.value=r.actions;revision.value=r.revision;}catch{error.value='Не удалось загрузить ограничения.';}finally{busy.value=false;}}
async function save(){busy.value=true;error.value='';try{const r=await $fetch<{actions:string[];revision:string}>(endpoint,{method:'PUT',headers:{'x-space-access-change':'1'},body:{actions:selected.value,revision:revision.value}});selected.value=r.actions;revision.value=r.revision;emit('saved');}catch{error.value='Не удалось сохранить ограничения. Обновите их и повторите.';}finally{busy.value=false;}}
onMounted(load);
</script>
<template><details class="diagnostic-restrictions"><summary>Персональные запреты → Диагностика → Договоры</summary><p>Запрет действует поверх прав группы и отдела. Запрет просмотра закрывает все операции с договорами.</p><div><label v-for="(label,key) in labels" :key="key"><input v-model="selected" type="checkbox" :value="key" :disabled="busy||!canManage" />Запретить: {{ label }}</label></div><p v-if="error" role="alert">{{ error }}</p><button :disabled="busy||!canManage||!revision" @click="save">Применить запреты</button><button :disabled="busy" @click="load">Обновить запреты</button></details></template>
<style scoped>.diagnostic-restrictions{padding:8px;border:1px solid var(--space-line,#cbd5e1);border-radius:8px}.diagnostic-restrictions div{display:flex;flex-wrap:wrap;gap:16px}.diagnostic-restrictions button{margin:8px 8px 0 0;padding:6px;border:1px solid var(--space-line,#cbd5e1);border-radius:6px}</style>
