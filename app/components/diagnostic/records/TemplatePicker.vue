<script setup lang="ts">
import type {TemplateUse,WorkTemplate} from '~~/shared/types/diagnostic-templates';
import {categoryNames} from '~~/shared/utils/diagnostic-planning';
import type {StructureListResponse} from '~~/shared/types/diagnostic-structures-api';
const props=defineProps<{structure:boolean}>();
const emit=defineEmits<{close:[];apply:[TemplateUse,string]}>();
const templates=ref<WorkTemplate[]>([]),choice=ref<number|null>(null),search=ref(''),result=ref<StructureListResponse>(),page=ref(1),error=ref(''),selected=ref<number[]>([]);
let generation=0,timer:ReturnType<typeof setTimeout>;
const active=computed(()=>templates.value.find(t=>t.id===choice.value));
async function load(){
 const current=++generation;
 try{const data=await $fetch<StructureListResponse>('/api/diagnostic/structures',{query:{page:page.value,search:search.value,pageSize:25}});
 if(current===generation){result.value=data;error.value='';}}
 catch(e:any){if(current===generation)error.value=e.data?.message||'Не удалось загрузить сооружения.';}
}
watch(search,()=>{page.value=1;generation++;result.value=undefined;clearTimeout(timer);timer=setTimeout(load,250);});
watch(page,()=>void load());
onBeforeUnmount(()=>{generation++;clearTimeout(timer);});
onMounted(async()=>{try{templates.value=(await $fetch<WorkTemplate[]>('/api/diagnostic/templates')).filter(t=>(t.category==='structure')===props.structure);
 if(props.structure)await load();}catch(e:any){error.value=e.data?.message||'Не удалось загрузить шаблоны.';}});
</script>
<template><UModal open title="Применить шаблон работ" @update:open="v=>{if(!v)emit('close')}"><template #body><div class="odis-records">
<label>Шаблон <select v-model="choice"><option :value="null">Выберите шаблон</option><option v-for="t in templates" :key="t.id" :value="t.id" :disabled="!!t.unavailable">{{t.name}}{{t.unavailable?' (изменён состав библиотеки)':''}} · {{categoryNames[t.category]}}</option></select></label>
<p v-if="!templates.length&&!error">Для этого раздела нет доступных шаблонов.</p><p v-if="active">{{active.items.map(w=>w.name).join(' · ')}}</p>
<template v-if="structure"><label>Найти сооружение <input v-model="search" type="search" placeholder="Код ИССО, дорога, км"/></label>
<label v-for="s in result?.items" :key="s.id" class="template-work"><input v-model="selected" type="checkbox" :value="Number(s.id)"/> {{s.issoCode}} · {{s.roadName}} · {{s.location}}</label>
<div><button :disabled="page===1" @click="page--">Назад</button> {{page}} / {{result?.pageCount||1}} <button :disabled="page>=(result?.pageCount||1)" @click="page++">Далее</button> · Выбрано: {{selected.length}}</div></template><p v-if="error" role="alert">{{error}}</p></div></template>
<template #footer><button :disabled="!active||structure&&!selected.length" @click="active&&emit('apply',{templateId:active.id,structureIds:[...selected]},active.name)">Применить</button></template></UModal></template>
