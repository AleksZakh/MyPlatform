<script setup lang="ts">
import type {EmployeePlansResult,PlanWorkRow} from '~~/shared/types/diagnostic-plans';
import {tripDateLabel} from '~~/shared/utils/diagnostic-trips';
import {diagnosticWorkStatus} from '~~/shared/utils/diagnostic-contract-table';
import WorkFromList from '../diagnostic/contracts/WorkFromList.vue';
import {onWorkChange} from '~/composables/diagnostic/workChanges';
const allowed=ref(false),edit=ref(false),rows=ref<EmployeePlansResult>(),opened=ref<PlanWorkRow|null>(null);
const busy=ref(false),error=ref(''),page=ref(1),cursors=ref<(string|null)[]>([null]),search=ref('');
let generation=0,timer:ReturnType<typeof setTimeout>,controller:AbortController|undefined;
async function load(){
 if(!allowed.value)return;
 const n=++generation;controller?.abort();controller=new AbortController();busy.value=true;error.value='';
 try{const result=await $fetch<EmployeePlansResult>('/api/diagnostic/plans',{query:{employee:'me',periodMode:'all',page:page.value,search:search.value,cursor:cursors.value[page.value-1]||undefined},signal:controller.signal});
 if(n===generation)rows.value=result;}
 catch(e:any){if(n===generation)error.value=e.data?.message||'Не удалось загрузить работы.';}
 finally{if(n===generation)busy.value=false;}
}
function reset(){page.value=1;cursors.value=[null];void load();}
watch(search,()=>{clearTimeout(timer);timer=setTimeout(reset,250);});
onWorkChange(reset);
onMounted(async()=>{
 try{const check=(action:string)=>$fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.contracts',action}});
 allowed.value=(await check('VIEW')).allowed;if(allowed.value){void load();edit.value=(await check('UPDATE')).allowed;}}
 catch(e:any){error.value=e.data?.message||'Не удалось проверить доступ к ОДИС.';}
});
onBeforeUnmount(()=>{generation++;controller?.abort();clearTimeout(timer);});
function next(){if(!rows.value?.nextCursor)return;cursors.value[page.value]=rows.value.nextCursor;page.value++;void load();}
</script>
<template><section v-if="allowed && (busy||error||rows?.employees.some(x=>x.id===rows?.currentUser.id))" class="work-odis">
 <div class="work-toolbar"><h2>Мои работы ОДИС <small v-if="rows">({{rows.total}})</small></h2><input v-model="search" type="search" placeholder="Поиск работ ОДИС"/><button :disabled="busy" @click="reset">Обновить</button></div>
 <p v-if="busy" role="status">Загрузка работ ОДИС…</p><p v-else-if="error" role="alert">{{error}}</p>
 <div v-else class="work-odis-table"><table><thead><tr><th>Работа</th><th>Договор</th><th>Статус</th><th>Начало</th><th>Окончание</th></tr></thead><tbody><tr v-for="r in rows?.rows" :key="r.key" @dblclick="opened=r"><td><button @click="opened=r">{{r.name}}</button></td><td>{{r.contractNumber}}</td><td>{{diagnosticWorkStatus(r.status).title}}</td><td>{{tripDateLabel(r.planStart)}}</td><td>{{tripDateLabel(r.planFinish)}}</td></tr></tbody></table><p v-if="!rows?.rows.length">Работ не найдено.</p></div>
 <footer v-if="page>1||rows?.nextCursor"><button :disabled="busy||page===1" @click="page--;load()">Назад</button> {{page}} <button :disabled="busy||!rows?.nextCursor" @click="next">Вперёд</button></footer>
 <WorkFromList v-if="opened" :key="opened.key" :source="opened" :employees="rows?.employees||[]" :can-edit="edit" @close="opened=null"/>
</section></template>
<style scoped>
.work-odis{margin:8px 0;border:1px solid var(--space-line,#c9d6e2);padding:6px 10px}.work-odis-table{overflow:auto;max-height:30vh}
.work-odis table{width:100%;text-align:left;font-size:13px}.work-odis :is(th,td){padding:3px 8px}.work-odis td button{text-align:left;text-decoration:underline}
</style>

<style src="~/assets/css/diagnostic-contracts.css"></style>
