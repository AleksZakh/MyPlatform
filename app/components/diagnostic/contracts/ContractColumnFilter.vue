<script setup lang="ts">
import {computed,ref,nextTick,watch,onMounted,onBeforeUnmount,useId} from 'vue';
import {filterText} from '~~/shared/utils/diagnostic-contract-table';
const props=defineProps<{label:string;modelValue:string;options:string[];portal:HTMLElement|null;resetKey:number}>();
const emit=defineEmits<{'update:modelValue':[string]}>();
const expanded=ref(false),suggesting=ref(false),active=ref(-1),root=ref<HTMLElement|null>(null),input=ref<HTMLInputElement|null>(null),popup=ref<HTMLElement|null>(null);
const id=useId(),popupStyle=ref<Record<string,string>>({}),listId='odis-filter-'+id;
const matches=computed(()=>props.options.filter(v=>filterText(v).includes(filterText(props.modelValue))));
function position(){
 if(!input.value||!props.portal)return;
 const a=input.value.getBoundingClientRect(),host=props.portal.getBoundingClientRect();
 const width=Math.min(Math.max(a.width,210),Math.max(host.width-12,120));
 const left=Math.max(4,Math.min(a.left-host.left,host.width-width-4));
 const below=Math.min(host.bottom,window.innerHeight)-a.bottom-6,above=a.top-Math.max(host.top,0)-6;
 const upwards=below<120&&above>below,maxHeight=Math.max(55,Math.min(230,upwards?above:below));
 popupStyle.value={left:left+'px',top:(upwards?a.top-host.top-4:a.bottom-host.top+4)+'px',width:width+'px',maxHeight:maxHeight+'px',transform:upwards?'translateY(-100%)':'none'};
}
async function openSuggestions(){suggesting.value=true;active.value=-1;await nextTick();position();}
function toggle(){expanded.value=!expanded.value;suggesting.value=false;}
function update(event:Event){emit('update:modelValue',(event.target as HTMLInputElement).value);void openSuggestions();}
function choose(value:string){emit('update:modelValue',value);suggesting.value=false;active.value=-1;input.value?.focus();suggesting.value=false;}
async function keydown(event:KeyboardEvent){
 if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(suggesting.value)suggesting.value=false;else{expanded.value=false;root.value?.querySelector('button')?.focus();}return;}
 if(event.key==='ArrowDown'||event.key==='ArrowUp'){
  event.preventDefault();if(!suggesting.value)await openSuggestions();
  if(matches.value.length){active.value=active.value<0?(event.key==='ArrowDown'?0:matches.value.length-1):(active.value+(event.key==='ArrowDown'?1:-1)+matches.value.length)%matches.value.length;await nextTick();popup.value?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({block:'nearest'});}return;
 }
 if(event.key==='Enter'){event.preventDefault();if(suggesting.value&&active.value>=0&&matches.value[active.value]!==undefined)choose(matches.value[active.value]!);else suggesting.value=false;}
 if(event.key==='Tab')suggesting.value=false;
}
function outside(event:PointerEvent){const node=event.target as Node;if(!root.value?.contains(node)&&!popup.value?.contains(node))suggesting.value=false;}
function scroll(event:Event){if(!(event.target instanceof Node)||!popup.value?.contains(event.target))suggesting.value=false;}
function blur(){void nextTick(()=>{if(!popup.value?.contains(document.activeElement)&&document.activeElement!==input.value)suggesting.value=false;});}
watch(()=>props.resetKey,()=>{expanded.value=false;suggesting.value=false;active.value=-1;});
watch(()=>props.options,()=>{active.value=-1;void nextTick(position);});
onMounted(()=>{document.addEventListener('pointerdown',outside);window.addEventListener('resize',position);window.addEventListener('scroll',scroll,true);});
onBeforeUnmount(()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',position);window.removeEventListener('scroll',scroll,true);});
</script>
<template>
 <div ref="root" class="odis-column-filter">
  <button type="button" :class="['odis-filter-toggle',{'is-filtered':filterText(modelValue)}]" :aria-label="'Фильтр: '+label" :aria-expanded="expanded" :aria-controls="listId+'-input'" @click="toggle">
   <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" :class="{'is-open':expanded}"><path d="m3 4 3 3 3-3" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>{{ label }}<span v-if="filterText(modelValue)" class="odis-filter-mark" aria-hidden="true">●</span>
  </button>
  <div v-if="expanded" class="odis-filter-input-row">
   <input :id="listId+'-input'" ref="input" :value="modelValue" :aria-label="'Значение фильтра: '+label" role="combobox" aria-autocomplete="list" :aria-expanded="suggesting&&!!portal" :aria-controls="listId" :aria-activedescendant="suggesting&&active>=0?listId+'-'+active:undefined" placeholder="Введите или выберите…" autocomplete="off" @input="update" @focus="openSuggestions" @click="openSuggestions" @keydown="keydown" @blur="blur">
   <button v-if="modelValue" type="button" class="odis-filter-clear" :aria-label="'Очистить фильтр: '+label" @click="choose('')">×</button>
  </div>
  <Teleport v-if="suggesting&&portal" :to="portal">
   <div :id="listId" ref="popup" class="odis-filter-options" :style="popupStyle" role="listbox" :aria-label="'Варианты: '+label">
    <div v-for="(value,index) in matches" :id="listId+'-'+index" :key="value" role="option" :aria-selected="active===index" class="odis-filter-option" @pointerdown.prevent @click="choose(value)">{{ value }}</div>
    <div v-if="!matches.length" class="odis-filter-no-options">Нет подходящих вариантов. Можно ввести своё значение.</div>
   </div>
  </Teleport>
 </div>
</template>
<style>
.odis-column-filter{min-width:110px}.odis-column-filter .odis-filter-toggle{display:flex;align-items:center;gap:4px;width:100%;padding:0;border:0;background:transparent;color:inherit;white-space:nowrap;text-align:left;font:inherit}
.odis-filter-toggle svg{flex-shrink:0;transition:transform .12s}.odis-filter-toggle svg.is-open{transform:rotate(180deg)}.odis-filter-toggle.is-filtered{color:#176b88;font-weight:600}.dark .odis-filter-toggle.is-filtered{color:#8bd9f0}.odis-filter-mark{font-size:8px}
.odis-filter-input-row{position:relative;margin-top:4px}.contract-editor-panel .odis-filter-input-row input{height:26px;padding:3px 24px 3px 5px;border:1px solid var(--contract-line,#c7d3df);border-radius:3px;font:inherit;font-weight:400;box-sizing:border-box;width:100%;min-width:110px;background:var(--contract-field,#fff);color:var(--contract-text,#253647)}
.odis-filter-input-row .odis-filter-clear{position:absolute;right:2px;top:1px;width:22px;height:24px;padding:0;text-align:center;border:0;background:transparent;color:inherit}
.odis-filter-options{position:absolute;pointer-events:auto;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;border:1px solid var(--contract-line,#c7d3df);border-radius:5px;background:var(--contract-field,#fff);color:var(--contract-text,#253647);box-shadow:0 5px 18px #0003;font:13px/1.4 system-ui;text-align:left}
.odis-filter-option{padding:6px 9px;cursor:pointer;overflow-wrap:anywhere;white-space:normal}.odis-filter-option:hover,.odis-filter-option[aria-selected=true]{background:var(--contract-panel,#edf4fa)}.odis-filter-no-options{padding:8px;white-space:normal;color:var(--contract-text,#253647)}
</style>
