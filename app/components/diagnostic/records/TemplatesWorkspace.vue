<script setup lang="ts">
import {categoryNames,type Category} from '~~/shared/utils/diagnostic-planning';
import type {WorkTemplate} from '~~/shared/types/diagnostic-templates';
const templates=ref<WorkTemplate[]>([]),library=ref<{id:number;name:string;code:string;category:Category}[]>([]);
const creating=ref(false),canCreate=ref(false),pending=ref(false),error=ref(''),name=ref(''),category=ref<Category>('contract'),ids=ref<number[]>([]);
async function load(){
 try{templates.value=await $fetch('/api/diagnostic/templates');}catch(e:any){error.value=e.data?.message||'Не удалось загрузить шаблоны.';}
}
onMounted(async()=>{await load();try{canCreate.value=(await $fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.contracts',action:'CREATE'}})).allowed;}catch{canCreate.value=false;}});
async function open(){
 error.value='';try{library.value=(await $fetch<{library:typeof library.value}>('/api/diagnostic/planning/options')).library;
 ids.value=[];name.value='';creating.value=true;}catch(e:any){error.value=e.data?.message||'Не удалось загрузить библиотеку работ.';}
}
async function save(){
 if(pending.value)return;pending.value=true;error.value='';
 try{await $fetch('/api/diagnostic/templates',{method:'POST',headers:{'x-space-diagnostic':'1'},body:{category:category.value,name:name.value,items:ids.value},retry:0});creating.value=false;await load();}
 catch(e:any){error.value=e.data?.message||'Не удалось сохранить шаблон.';}finally{pending.value=false;}
}
</script>
<template><section class="odis-records"><header><h1>Шаблоны работ</h1><button :disabled="!canCreate" @click="open">Создать шаблон</button></header>
<p v-if="error&&!creating" role="alert">{{error}}</p>
<div class="records-scroll"><table><thead><tr><th>Шаблон</th><th>Категория</th><th>Состав</th><th>Автор</th></tr></thead><tbody><tr v-for="t in templates" :key="t.id"><td>{{t.name}}</td><td>{{categoryNames[t.category]}}</td><td><details><summary>Работ: {{t.items.length}} <span v-if="t.unavailable">· недоступно: {{t.unavailable}}</span></summary><p v-for="w in t.items" :key="w.id">{{w.code}} · {{w.name}}</p></details></td><td>{{t.author}}</td></tr></tbody></table></div>
<UModal v-if="creating" open title="Новый шаблон работ" @update:open="v=>{if(!pending)creating=v}"><template #body><form id="odis-template-form" @submit.prevent="save"><fieldset class="odis-records" :disabled="pending">
<label>Название <input v-model.trim="name" maxlength="150" required/></label><label>Категория <select v-model="category" @change="ids=[]"><option v-for="(value,key) in categoryNames" :key="key" :value="key">{{value}}</option></select></label>
<label v-for="w in library.filter(w=>w.category===category)" :key="w.id" class="template-work"><input v-model="ids" type="checkbox" :value="w.id"/> {{w.code}} · {{w.name}}</label>
<p v-if="error" role="alert">{{error}}</p></fieldset></form></template><template #footer><button form="odis-template-form" :disabled="pending||!ids.length||!name">Сохранить</button></template></UModal>
</section></template>
