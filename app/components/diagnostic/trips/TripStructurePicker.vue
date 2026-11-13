<script setup lang="ts">
import {ref,watch,onBeforeUnmount,computed} from 'vue';
import type {TripStructureItem} from '~~/shared/types/diagnostic-trips';
const props=defineProps<{modelValue:TripStructureItem[];disabled?:boolean}>();
const emit=defineEmits<{'update:modelValue':[TripStructureItem[]]}>();
const search=ref(''),road=ref(''),from=ref(''),to=ref(''),page=ref(1),total=ref(0),roads=ref<string[]>([]),rows=ref<TripStructureItem[]>([]),checked=ref<number[]>([]),removeIds=ref<number[]>([]),busy=ref(false),error=ref('');
let generation=0,timer:ReturnType<typeof setTimeout>|undefined;
const pages=computed(()=>Math.max(1,Math.ceil(total.value/100))),chosen=computed(()=>new Set(props.modelValue.map(s=>s.id)));
const available=computed(()=>rows.value.filter(s=>!chosen.value.has(s.id)));
async function load(){const gen=++generation;busy.value=true;error.value='';checked.value=[];try{const r=await $fetch<{items:TripStructureItem[];total:number;roads:string[];page:number}>('/api/diagnostic/trips/structures',{query:{search:search.value,road:road.value,from:from.value,to:to.value,page:page.value}});if(gen!==generation)return;rows.value=r.items;total.value=r.total;roads.value=r.roads;}catch(e:any){if(gen===generation){rows.value=[];error.value=e?.data?.message||'Не удалось загрузить сооружения.';}}finally{if(gen===generation)busy.value=false;}}
watch([search,road,from,to],()=>{page.value=1;generation++;clearTimeout(timer);timer=setTimeout(()=>void load(),250);});
watch(page,()=>{clearTimeout(timer);void load();});
watch(()=>props.disabled,v=>{if(!v)void load();},{immediate:true});
onBeforeUnmount(()=>{generation++;clearTimeout(timer);});
function add(){emit('update:modelValue',[...props.modelValue,...available.value.filter(s=>checked.value.includes(s.id))]);checked.value=[];}
function remove(){emit('update:modelValue',props.modelValue.filter(s=>!removeIds.value.includes(s.id)));removeIds.value=[];}
</script>
<template>
 <div class="trip-picker">
  <div class="trip-picker-filter"><label>Автодорога<select v-model="road" :disabled="disabled"><option value="">Все автодороги</option><option v-for="r in roads" :key="r">{{r}}</option></select></label><label>Поиск<input v-model="search" :disabled="disabled" placeholder="Код ИССО, сооружение, км"/></label><label>Интервал, км<input v-model="from" :disabled="disabled" placeholder="От: 16+550"/></label><label>До<input v-model="to" :disabled="disabled" placeholder="28+300"/></label></div>
  <div class="trip-picker-columns">
   <div><div class="trip-bar">Выбранные сооружения · {{modelValue.length}}</div><div class="trip-table-scroll trip-picker-table"><table><thead><tr><th></th><th>ИССО</th><th>Км+м / автодорога</th></tr></thead><tbody><tr v-for="s in modelValue" :key="s.id"><td><input v-model="removeIds" type="checkbox" :value="s.id" :disabled="disabled" :aria-label="`Убрать ${s.code}`"/></td><td>{{s.code}}</td><td :title="s.roadName">{{s.location}} · {{s.roadName}}</td></tr><tr v-if="!modelValue.length"><td colspan="3">Сооружения не выбраны.</td></tr></tbody></table></div></div>
   <div class="trip-transfer"><button type="button" :disabled="disabled||busy||!checked.length" @click="add" title="Добавить выбранные сооружения">← Добавить</button><button type="button" :disabled="disabled||!removeIds.length" @click="remove">Убрать →</button></div>
   <div><div class="trip-bar">Доступные сооружения · {{total}}</div><div class="trip-table-scroll trip-picker-table" :aria-busy="busy"><table><thead><tr><th></th><th>ИССО</th><th>Км+м</th><th>Сооружение</th><th>Доп. идентификатор</th></tr></thead><tbody><tr v-if="busy"><td colspan="5">Загрузка…</td></tr><template v-else><tr v-for="s in available" :key="s.id"><td><input v-model="checked" type="checkbox" :value="s.id" :disabled="disabled" :aria-label="`Выбрать ${s.code}`"/></td><td>{{s.code}}</td><td>{{s.location}}</td><td :title="s.roadName">{{s.structureName}}</td><td>{{s.additionalId}}</td></tr><tr v-if="!available.length"><td colspan="5">Нет доступных сооружений по выбранным условиям.</td></tr></template></tbody></table></div><div class="trip-picker-pages"><label><input type="checkbox" :disabled="disabled||busy||!available.length" :checked="available.length>0&&available.every(s=>checked.includes(s.id))" @change="checked=($event.target as HTMLInputElement).checked?available.map(s=>s.id):[]"/>Все на странице</label><button type="button" :disabled="busy||page<=1" @click="page--">←</button><span>{{page}} / {{pages}}</span><button type="button" :disabled="busy||page>=pages" @click="page++">→</button></div></div>
  </div><p v-if="error" class="trip-error" role="alert">{{error}} <button type="button" @click="load">Повторить</button></p>
 </div>
</template>
