<script setup lang="ts">
import WorkName from './WorkName.vue';
import {computed,ref,watch,onMounted,onBeforeUnmount} from 'vue';
import type {UptsStageWork} from '~~/shared/types/upts-object';
import {UPTS_WORK_ROLES} from '~~/shared/utils/upts-work-kinds';
const props=defineProps<{works:UptsStageWork[];stageCount:number;disabled?:boolean}>();
const stages=defineModel<Record<string,number|''>>({required:true});
const enabled=defineModel<string[]>('enabled',{required:true});
const selected=ref<string[]>([]),anchor=ref<number|null>(null),dragStart=ref<number|null>(null);
const keys=computed(()=>props.works.map(w=>w.key));
const allEnabled=computed(()=>!!keys.value.length && keys.value.every(k=>enabled.value.includes(k)));
const valid=(v:unknown)=>typeof v==='number' && Number.isInteger(v) && v>=1 && v<=props.stageCount;
const invalid=computed(()=>props.works.some(w=>enabled.value.includes(w.key) && !valid(stages.value[w.key] ?? 1)));
watch(keys,()=>{selected.value=selected.value.filter(k=>keys.value.includes(k));anchor.value=null;dragStart.value=null;});
function range(from:number,to:number){return keys.value.slice(Math.min(from,to),Math.max(from,to)+1);}
function selectRow(index:number,shift=false){
  if(props.disabled)return;
  selected.value=shift && anchor.value!==null?range(anchor.value,index):[keys.value[index]!];
  if(!shift || anchor.value===null)anchor.value=index;
}
function begin(event:PointerEvent,index:number){
  if(props.disabled || event.button!==0 || (event.pointerType && event.pointerType!=='mouse') || (event.target as HTMLElement).closest('input,select,button,a'))return;
  event.preventDefault();selectRow(index,event.shiftKey);
  dragStart.value=event.shiftKey?anchor.value:index;
  (event.currentTarget as HTMLElement).focus({preventScroll:true});
}
function enter(event:PointerEvent,index:number){
  if(dragStart.value===null || props.disabled)return;
  if(!(event.buttons&1)){end();return;}
  selected.value=range(dragStart.value,index);
}
function end(){dragStart.value=null;}
function keyboard(event:KeyboardEvent,index:number){
  if(event.target!==event.currentTarget)return;
  if(event.key===' ' || event.key==='Enter'){event.preventDefault();selectRow(index,event.shiftKey);}
  if(event.key==='ArrowDown' || event.key==='ArrowUp'){
    event.preventDefault();const next=Math.max(0,Math.min(keys.value.length-1,index+(event.key==='ArrowDown'?1:-1)));
    selectRow(next,event.shiftKey);(event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLElement>('tr')[next]?.focus();
  }
}
function setEnabled(targets:string[],value:boolean){
  if(props.disabled)return;
  enabled.value=value?[...new Set([...enabled.value,...targets])]:enabled.value.filter(k=>!targets.includes(k));
}
function assign(event:Event){
  const select=event.target as HTMLSelectElement;
  const stage=Number(select.value);
  if(!props.disabled && valid(stage)){
    stages.value={...stages.value,...Object.fromEntries(selected.value.map(k=>[k,stage]))};
  }
  select.value='';
}
function setStage(key:string,event:Event){if(!props.disabled){const value=(event.target as HTMLInputElement).value;stages.value={...stages.value,[key]:value===''?'':Number(value)};}}
onMounted(()=>{window.addEventListener('pointerup',end);window.addEventListener('pointercancel',end);window.addEventListener('blur',end);});
onBeforeUnmount(()=>{window.removeEventListener('pointerup',end);window.removeEventListener('pointercancel',end);window.removeEventListener('blur',end);});
</script>
<template>
  <section class="upts-work-selection" aria-label="Выбор работ объекта">
    <div class="upts-selection-actions">
      <span role="status">Включено: {{ enabled.length }} · Выделено: {{ selected.length }}</span>
      <button type="button" :disabled="disabled || !selected.length" @click="setEnabled(selected,true)">Включить выделенные</button>
      <button type="button" :disabled="disabled || !selected.length" @click="setEnabled(selected,false)">Выключить выделенные</button>
      <button type="button" :disabled="disabled || !selected.length" @click="selected=[]">Снять выделение</button>
    </div>
    <p class="work-muted">Флажки включают работы. Shift-клик или перетягивание выделяют диапазон. Этап в заголовке назначается выделенным строкам.</p>
    <p v-if="invalid" class="work-error" role="alert">У включённых работ укажите этап от 1 до {{ stageCount }}.</p>
    <div class="work-table-wrap">
      <table class="upts-selection-table">
        <caption class="upts-sr-only">Работы для включения в объект и этапы выполнения</caption>
        <thead><tr>
          <th class="upts-selection-check"><input type="checkbox" aria-label="Включить все работы" :disabled="disabled" :checked="allEnabled" :indeterminate="!!enabled.length && !allEnabled" @change="setEnabled(keys,!allEnabled)" /></th>
          <th>Работа</th>
          <th class="upts-selection-stage"><label>Этап<select value="" aria-label="Этап выделенных работ" :disabled="disabled || !selected.length" @change="assign"><option value="">—</option><option v-for="n in stageCount" :key="n" :value="n">{{ n }}</option></select></label></th>
          <th>Ответственная роль</th><th>Ожидаемый результат</th>
        </tr></thead>
        <tbody><tr v-for="(w,index) in works" :key="w.key" :data-work-key="w.key" :class="{'is-selected':selected.includes(w.key),'is-disabled':!enabled.includes(w.key)}" :aria-selected="selected.includes(w.key)" tabindex="0" @pointerdown="begin($event,index)" @pointerenter="enter($event,index)" @keydown="keyboard($event,index)">
          <td><input type="checkbox" :checked="enabled.includes(w.key)" :disabled="disabled" :aria-label="'Включить: '+w.name" @change="setEnabled([w.key],($event.target as HTMLInputElement).checked)" /></td>
          <td><WorkName :meta="w" emphasize>{{ w.name }}</WorkName></td>
          <td class="upts-selection-stage"><input :value="stages[w.key] ?? 1" type="number" min="1" :max="stageCount" step="1" :required="enabled.includes(w.key)" :disabled="disabled || !enabled.includes(w.key)" :aria-label="'Этап работы: '+w.name" :aria-invalid="enabled.includes(w.key) && !valid(stages[w.key] ?? 1)" @input="setStage(w.key,$event)" /></td>
          <td>{{ w.responsibleRole ? UPTS_WORK_ROLES[w.responsibleRole] : 'Не указана' }}</td><td>{{ w.expectedResult || 'Не указан' }}</td>
        </tr></tbody>
      </table>
    </div>
  </section>
</template>
<style scoped>
.upts-work-selection{min-width:0;--selection-head:#e9e9eb;--selection-hover:#e8f3f7;--selection-active:#d5eaf2}
.upts-selection-actions{display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:4px}.upts-selection-actions span{margin-right:auto;font-size:12px}.upts-selection-actions button{padding:3px 8px;font-size:12px}
.upts-selection-table{width:100%;min-width:620px;font-size:13px;line-height:20px;border-collapse:collapse}
.upts-selection-table th,.upts-selection-table td{padding:3px 8px;text-align:left;vertical-align:middle;border:0;border-bottom:1px solid var(--work-line);overflow-wrap:anywhere}
.upts-selection-table th{background:var(--selection-head);color:var(--work-text);font-weight:500;position:sticky;top:0;z-index:1}
.upts-selection-table tbody tr{user-select:none;touch-action:pan-y}.upts-selection-table tbody tr:hover{background:var(--selection-hover)}.upts-selection-table tbody tr.is-selected{background:var(--selection-active)}.upts-selection-table tbody tr.is-disabled td:not(:first-child){opacity:.5}.upts-selection-table tbody tr:focus-visible{outline:2px solid var(--work-accent);outline-offset:-2px}
.upts-selection-table th:nth-child(2){width:38%}.upts-selection-table th:nth-child(4){width:18%}.upts-selection-check{width:30px}.upts-selection-stage{width:96px;min-width:96px}
.upts-selection-table .upts-selection-stage label{display:flex;flex-direction:row;align-items:center;gap:4px;white-space:nowrap}
.upts-selection-table .upts-selection-stage :is(input,select){height:24px;padding:1px 5px;line-height:20px;font-size:13px;border-radius:3px;min-width:48px}
.upts-selection-table input[type=checkbox]{display:block;width:13px;height:13px;margin:0}.upts-selection-table input[aria-invalid=true]{border-color:#ef4444}
.upts-sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
:global(html.dark) .upts-work-selection{--selection-head:var(--space-graphite-panel,#344757);--selection-hover:var(--space-graphite-hover,#293547);--selection-active:var(--space-graphite-selected,#223d60)}
</style>
