<script setup lang="ts">
import {computed,ref,onMounted,onBeforeUnmount} from 'vue';
type Option={id:string;label:string};
const props=defineProps<{label:string;options:Option[];modelValue:string[];disabled?:boolean;placeholder?:string}>();
const emit=defineEmits<{'update:modelValue':[string[]]}>();
const root=ref<HTMLElement>(),trigger=ref<HTMLButtonElement>(),open=ref(false),search=ref('');
const selected=computed(()=>new Set(props.modelValue));
const filtered=computed(()=>props.options.filter(v=>v.label.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))));
const summary=computed(()=>props.modelValue.length===1?props.options.find(v=>selected.value.has(v.id))?.label:props.modelValue.length?'Выбрано: '+props.modelValue.length:'');
function toggle(id:string){const next=new Set(selected.value);if(next.has(id))next.delete(id);else next.add(id);emit('update:modelValue',[...next]);}
function close(){open.value=false;search.value='';}
function outside(e:PointerEvent){if(!root.value?.contains(e.target as Node))close();}
onMounted(()=>document.addEventListener('pointerdown',outside));
onBeforeUnmount(()=>document.removeEventListener('pointerdown',outside));
</script>
<template>
 <div ref="root" class="filter" @keydown.esc.stop="close();trigger?.focus()" @focusout="e=>{if(e.relatedTarget&&!root?.contains(e.relatedTarget as Node))close()}">
  <div class="labels"><span>{{label}}</span><small v-if="options.length">{{options.length}}</small></div>
  <button ref="trigger" type="button" class="opr-button choice" :disabled="disabled" :aria-label="label" :aria-expanded="open&&!disabled" @click="open?close():open=true">
   <span>{{summary||placeholder||'Все'}}</span><Icon name="lucide:chevron-down" aria-hidden="true"/>
  </button>
  <div v-if="open&&!disabled" class="popup" role="group" :aria-label="label">
   <input v-model="search" type="search" :aria-label="'Поиск: '+label" placeholder="Поиск"/>
   <div class="bulk"><button type="button" :disabled="!filtered.length" @click="emit('update:modelValue',[...new Set([...modelValue,...filtered.map(v=>v.id)])])">Выбрать всё</button><button type="button" :disabled="!modelValue.length" @click="emit('update:modelValue',[])">Снять выбор</button></div>
   <div class="options"><label v-for="o in filtered" :key="o.id"><input type="checkbox" :checked="selected.has(o.id)" @change="toggle(o.id)"/>{{o.label}}</label>
    <p v-if="!filtered.length">Нет совпадений</p>
   </div>
  </div>
 </div>
</template>
<style scoped>
.filter{position:relative;min-width:0}.labels{display:flex;align-items:baseline;gap:5px;font-size:13px;margin-bottom:4px}.labels small{color:var(--opr-muted)}
.choice{width:100%;justify-content:space-between;text-align:left;min-height:32px}.choice span:first-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.popup{position:absolute;z-index:5;top:100%;left:0;width:min(330px,85vw);padding:6px;border:1px solid var(--opr-line);border-radius:4px;background:var(--opr-field);box-shadow:0 5px 16px #1525342b}.popup>input{width:100%}.bulk{display:flex;gap:14px;padding:6px;color:var(--opr-accent);font-size:12px}.options{max-height:min(32vh,280px);overflow:auto}.options label{display:flex;gap:7px;align-items:baseline;padding:4px 6px;cursor:pointer;font-size:13px}.options label:hover{background:var(--opr-selected)}.options input{accent-color:var(--opr-accent)}.options p{padding:6px;color:var(--opr-muted)}
@media(min-width:751px) and (max-width:1150px){.filter:nth-child(n+3) .popup{left:auto;right:0}}
@media(min-width:501px) and (max-width:750px){.filter:nth-child(even) .popup{left:auto;right:0}}
</style>
