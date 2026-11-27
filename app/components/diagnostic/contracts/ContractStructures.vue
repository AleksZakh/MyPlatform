<script setup lang="ts">
import {computed,ref,watch,onBeforeUnmount} from 'vue';
import type {DraftWork} from '~~/shared/types/diagnostic-templates';
import type {ContractStructureListItem} from '~~/shared/types/diagnostic-contract-structures';
import type {ContractStructureWorkRecord,ContractStructureWorksResponse} from '~~/shared/types/diagnostic-contract-details';
import type {StructureListRow} from '~~/shared/types/diagnostic-structures-api';
import {structureLocationMetres,structureRangeError} from '~~/shared/utils/diagnostic-structures';
import StructureStageSelect from './StructureStageSelect.vue';
import ContractColumnFilter from './ContractColumnFilter.vue';
import {vRevealWorkRow} from './revealWorkRow';
import WorkCard from './WorkCard.vue';
import {onWorkChange} from '~/composables/diagnostic/workChanges';
import WorkStatusIcon from './WorkStatusIcon.vue';
import WorkStatusLegend from './WorkStatusLegend.vue';
import {structureFilterColumns,emptyStructureFilters,structureMatches,filterText,diagnosticWorkStatus,type StructureFilterKey} from '~~/shared/utils/diagnostic-contract-table';
const props=defineProps<{contractId:number|null;contractNumber:string;focusId?:number;focusLink?:number;canEdit:boolean;
 excluded?:ReadonlyMap<number,number>;removedWorks?:ReadonlyMap<number,number>;draftWorks?:ReadonlyMap<number,DraftWork[]>;canRemove?:boolean;
 pending:StructureListRow[];pendingStages:ReadonlyMap<number,number>;stageCount:number;editStages:boolean;showSelection:boolean;saving:boolean;
 stageEdits:ReadonlyMap<number,{stage:number}>;employees:{id:number;name:string}[]}>();
const highlight=ref(props.focusId);
const focusNotice=ref('');
const emit=defineEmits<{count:[number];linked:[rows:ContractStructureListItem[]];changeStages:[rows:ContractStructureListItem[],value:number];exclude:[ContractStructureListItem[]];removeWork:[ContractStructureWorkRecord];removeDraft:[workId:number,structureId:number]}>();
const persisted=ref<ContractStructureListItem[]>([]),busy=ref(false),error=ref('');
const filters=ref(emptyStructureFilters()),filterResetKey=ref(0),filterPortal=ref<HTMLElement|null>(null);
const rows=computed<ContractStructureListItem[]>(()=>{
 const ids=new Set(persisted.value.map(row=>row.structureId));
 const added=props.pending.filter(row=>!ids.has(Number(row.id))).map(row=>({
  id:-Number(row.id),structureId:Number(row.id),stage:props.pendingStages.get(Number(row.id))??1,code:row.issoCode,structureName:row.structureName,
  roadName:row.roadName,location:row.location,locationMetres:structureLocationMetres(row.location),
  additionalId:row.additionalId,obstacleName:'',district:''
 }));
 return [...persisted.value.filter(row=>!props.excluded?.has(row.structureId)),...added];
});
const from=ref(''),to=ref('');
const rangeError=computed(()=>structureRangeError({locationFrom:from.value,locationTo:to.value}));
const inRange=computed(()=>{
 if(rangeError.value)return [];
 const lo=structureLocationMetres(from.value),hi=structureLocationMetres(to.value);
 if(lo===null&&hi===null)return rows.value;
 return rows.value.filter(row=>{
  const metres=row.locationMetres??structureLocationMetres(row.location);
  return metres!==null && (lo===null||metres>=lo) && (hi===null||metres<=hi);
 });
});
const visibleRows=computed(()=>inRange.value.filter(row=>structureMatches(row,filters.value)));
const hasFilters=computed(()=>!!(from.value||to.value)||Object.values(filters.value).some(value=>!!filterText(value)));
const filterOptions=computed(()=>Object.fromEntries(structureFilterColumns.map(({key})=>[key,[...new Set(inRange.value.filter(row=>structureMatches(row,filters.value,key)).map(row=>row[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true}))])) as Record<StructureFilterKey,string[]>);
function clearFilters(){filters.value=emptyStructureFilters();from.value='';to.value='';filterResetKey.value++;}
const checked=ref(new Set<number>()),bulkStage=ref(1);
const marked=computed(()=>visibleRows.value.filter(row=>checked.value.has(row.structureId)));
watch(visibleRows,list=>{
 const visible=new Set(list.map(row=>row.structureId));
 for(const id of checked.value)if(!visible.has(id))checked.value.delete(id);
});
watch(()=>props.stageCount,count=>{if(bulkStage.value>count)bulkStage.value=1;});
function selectRows(list:ContractStructureListItem[],event:Event){
 const on=(event.target as HTMLInputElement).checked;
 for(const row of list){if(on)checked.value.add(row.structureId);else checked.value.delete(row.structureId);}
}
function assign(list:ContractStructureListItem[],value:number){
 if(props.editStages&&!props.saving&&Number.isInteger(value)&&value>=1&&value<=props.stageCount)emit('changeStages',list,value);
}
const selectedId=ref<number|null>(null);
const selected=computed(()=>rows.value.find(row=>row.id===selectedId.value)??null);
const works=ref<ContractStructureWorkRecord[]>([]),worksBusy=ref(false),worksError=ref('');
const visibleWorks=computed(()=>works.value.filter(work=>!props.removedWorks?.has(work.id)));
const pendingWorks=computed(()=>{
 const existing=new Set(works.value.map(work=>work.workId));
 return (props.draftWorks?.get(selected.value?.structureId??0)??[]).filter(work=>!existing.has(work.id));
});
const workActions=computed(()=>props.editStages&&(props.canRemove||pendingWorks.value.length>0));
const detail=ref<ContractStructureWorkRecord|null>(null);
const date=(s:string|null)=>s?s.split('-').reverse().join('.'):'—';
const hasUnknownStatus=computed(()=>visibleWorks.value.some(work=>diagnosticWorkStatus(work.status).key==='unknown'));
let listGeneration=0,worksGeneration=0;

function clearWorks(){worksGeneration++;works.value=[];worksError.value='';worksBusy.value=false;detail.value=null;}
async function loadWorks(){
 clearWorks();
 const request=worksGeneration,contractId=props.contractId,linkId=selectedId.value;
 if(!contractId||!linkId||linkId<0)return;
 worksBusy.value=true;
 try{
  const data=await $fetch<ContractStructureWorksResponse>(`/api/diagnostic/contracts/${contractId}/structures/${linkId}/works`);
  if(request===worksGeneration&&data.linkId===linkId){
    works.value=data.works;
    const link=persisted.value.find(item=>item.id===linkId);
    if(link)link.workCount=data.works.length;
    focusNotice.value=linkId===props.focusLink && !data.works.some(w=>w.id===props.focusId)?'Выбранная в календаре работа больше недоступна.':'';
  }
 }catch(e:any){if(request===worksGeneration)worksError.value=e?.data?.message||'Не удалось загрузить работы сооружения.';}
 finally{if(request===worksGeneration)worksBusy.value=false;}
}
async function load(){
 const request=++listGeneration,contractId=props.contractId;
 persisted.value=[];selectedId.value=null;busy.value=false;error.value='';clearWorks();
 if(!contractId){emit('count',0);return;}
 busy.value=true;
 try{
  const data=await $fetch<ContractStructureListItem[]>(`/api/diagnostic/contracts/${contractId}/structures`);
  if(request!==listGeneration)return;
  persisted.value=data;emit('linked',data);emit('count',data.length);const target=props.focusId?data.find(r=>r.id===props.focusLink):undefined;
  focusNotice.value=props.focusId&&!target?'Сооружение выбранной работы больше недоступно.':'';
  selectedId.value=props.focusId?target?.id??null:visibleRows.value[0]?.id??null;
 }catch(e:any){if(request===listGeneration)error.value=e?.data?.message||'Не удалось загрузить сооружения.';}
 finally{if(request===listGeneration)busy.value=false;}
}
watch(()=>props.contractId,()=>{clearFilters();void load();},{immediate:true});
watch(visibleRows,list=>{if(!(focusNotice.value && selectedId.value===null) && !list.some(row=>row.id===selectedId.value))selectedId.value=list[0]?.id??null;});
watch(selectedId,()=>void loadWorks());
// Keep an open draft intact. Its version is checked at save time.
let refreshAfterClose=false;
onWorkChange(()=>{
 if (detail.value) refreshAfterClose=true;
 else void loadWorks();
});
function closeDetail() {
 detail.value=null;
 if (refreshAfterClose) reloadAfterSave();
}
function reloadAfterSave() {
 refreshAfterClose=false;
 void loadWorks();
}
onBeforeUnmount(()=>{listGeneration++;worksGeneration++;});
</script>

<template>
 <section class="contract-structures-workspace" :class="{'cs-draft':!contractId}">
  <header class="contract-section-head">
   <h2>Перечень сооружений <small v-if="!busy&&!error" class="cs-filter-count">Показано: {{ visibleRows.length }} из {{ rows.length }}</small></h2>
   <div class="cs-range" role="group" aria-label="Участок дороги">
    <span>Место, км</span><input v-model="from" aria-label="От километра" placeholder="От" title="Километр или км+м"/><span>—</span><input v-model="to" aria-label="До километра" placeholder="До" title="Километр или км+м"/>
   </div>
   <div v-if="editStages" class="cs-bulk" role="group" aria-label="Массовое назначение этапа">
    <label>Этап для выбранных <StructureStageSelect :count="stageCount" :value="bulkStage" label="Этап для выбранных сооружений" :disabled="saving" @change="n=>bulkStage=n"/></label>
    <button type="button" :disabled="saving||!marked.length||bulkStage>stageCount" @click="assign(marked,bulkStage)">Назначить ({{marked.length}})</button>
   </div>
   <button v-if="editStages && (canRemove || marked.some(row=>row.id<0))" type="button" :disabled="saving||!marked.length" @click="emit('exclude',marked)"><Icon name="lucide:unlink"/>Исключить из договора ({{marked.length}})</button>
   <button type="button" :disabled="!hasFilters" @click="clearFilters">Очистить фильтры</button>
   <button type="button" :disabled="busy||!contractId" @click="load">Обновить</button>
   <small v-if="!editStages && marked.length" class="cs-hint">Выбрано: {{marked.length}}. Для назначения этапа нажмите «Редактировать».</small>
   <p v-if="rangeError" class="cs-hint" role="alert">{{rangeError}}</p>
   <p v-if="focusNotice" class="cs-hint" role="status">{{focusNotice}}</p>
  </header>
  <div ref="filterPortal" class="cs-filter-layer"></div>
  <div class="contract-detail-table contract-compact-table cs-list" :aria-busy="busy">
   <table><caption class="sr-only">Сооружения договора. Нажмите на код ИССО для просмотра работ.</caption>
    <colgroup>
     <col v-if="showSelection" class="cs-col-check"/><col class="cs-col-number"/>
     <col v-for="column in structureFilterColumns" :key="column.key" :class="'cs-col-'+column.key"/>
     <col class="cs-col-stage"/>
    </colgroup>
    <thead><tr><th v-if="showSelection" class="cs-check"><input type="checkbox" aria-label="Выбрать все показанные сооружения" title="Выбрать всё" :checked="!!marked.length&&marked.length===visibleRows.length" :indeterminate="marked.length>0&&marked.length<visibleRows.length" :disabled="saving||!visibleRows.length" @change="selectRows(visibleRows,$event)"/></th><th>№</th><th v-for="column in structureFilterColumns" :key="column.key" class="cs-filter-heading"><ContractColumnFilter v-model="filters[column.key]" :label="column.label" :options="filterOptions[column.key]" :portal="filterPortal" :reset-key="filterResetKey"/></th><th scope="col">Этап</th></tr></thead>
    <tbody>
     <tr v-if="busy"><td :colspan="showSelection?10:9" role="status">Загрузка сооружений…</td></tr>
     <tr v-else-if="error"><td :colspan="showSelection?10:9" role="alert">{{ error }} <button type="button" @click="load">Повторить</button></td></tr>
     <tr v-else-if="!rows.length"><td :colspan="showSelection?10:9">{{ contractId?'К этому договору пока не привязаны сооружения.':'Сооружения пока не добавлены.' }}</td></tr>
     <tr v-else-if="!visibleRows.length"><td :colspan="showSelection?10:9">По заданным фильтрам сооружения не найдены. <button type="button" @click="clearFilters">Очистить фильтры</button></td></tr>
     <template v-else><tr v-for="(row,index) in visibleRows" :key="row.id" v-reveal-work-row="props.focusLink===row.id?'scroll':false" :class="{'is-selected':selectedId===row.id}" @click="selectedId=row.id">
      <td v-if="showSelection" class="cs-check" @click.stop><input type="checkbox" :aria-label="'Выбрать '+row.code" :checked="checked.has(row.structureId)" :disabled="saving" @change="selectRows([row],$event)"/></td>
      <td data-label="№">{{ index+1 }}</td><td data-label="Код ИССО"><button type="button" class="cs-code" :aria-pressed="selectedId===row.id" :aria-label="`Работы сооружения ${row.code}`" @click.stop="selectedId=row.id">{{ row.code || 'Без ИССО' }}</button></td>
      <td data-label="Сооружение">{{ row.structureName }} <small v-if="row.worklogActive!=null" :title="row.worklogActive?'По черновику работы ведутся или завершены':'По черновику работы предстоят'" :class="{'cs-worklog-active':row.worklogActive}">· {{row.worklogActive?'Работы начаты':'Работы предстоят'}}</small> <small v-if="row.decommissioned">· Выведено из эксплуатации</small></td><td data-label="Название А/Д"><span class="contract-cell-ellipsis cs-road" :title="row.roadName">{{ row.roadName }}</span></td>
      <td data-label="Место, км">{{ row.location }}</td><td data-label="Доп. инф."><span class="contract-cell-ellipsis" :title="row.additionalId">{{ row.additionalId }}</span></td><td data-label="Основное препятствие">{{ row.obstacleName }}</td><td data-label="Район расположения">{{ row.district }}</td>
      <td data-label="Этап" @click.stop><StructureStageSelect v-if="editStages" :count="stageCount" :value="stageEdits.get(row.structureId)?.stage??row.stage" :label="'Этап сооружения '+row.code" :disabled="saving" @change="assign([row],$event)"/><span v-else>{{row.stage}}</span></td>
     </tr></template>
    </tbody>
   </table>
  </div>
  <section v-if="contractId || pending.length" class="cs-work-panel" aria-label="Работы выбранного сооружения">
   <div class="cs-selected" aria-live="polite">
    <template v-if="selected"><p><strong>{{ selected.structureName||'Сооружение' }}</strong> · Код ИССО: <strong>{{ selected.code || 'Без ИССО' }}</strong> · {{ selected.location||'Место не указано' }}</p><p class="contract-cell-ellipsis cs-address" :title="[selected.roadName,selected.district].filter(Boolean).join(' · ')">{{ [selected.roadName,selected.district].filter(Boolean).join(' · ') }}</p></template>
    <p v-else>{{ busy?'Загрузка сооружений…':'Выберите сооружение в верхней таблице.' }}</p>
   </div>
   <header class="cs-work-heading"><h3>Работы по сооружению <small v-if="selected&&!worksBusy&&!worksError">· Всего: {{ visibleWorks.length+pendingWorks.length }}</small></h3><div class="odis-work-heading-tools"><WorkStatusLegend :unknown="hasUnknownStatus"/><button type="button" :disabled="!selected||worksBusy" @click="loadWorks">Обновить работы</button></div></header>
   <div class="contract-detail-table contract-compact-table cs-works" :aria-busy="worksBusy">
    <table><thead><tr><th class="odis-status-cell">Статус</th><th>№</th><th>Работа</th><th>Начало, план</th><th>Окончание, план</th><th>План, чел·ч</th><th>Исполнитель, план</th><th>Примечания</th><th v-if="workActions">Действия</th></tr></thead>
     <tbody>
      <tr v-if="!selected"><td :colspan="workActions?9:8">Выберите сооружение для просмотра работ.</td></tr>
      <tr v-else-if="worksBusy"><td :colspan="workActions?9:8" role="status">Загрузка работ…</td></tr>
      <tr v-else-if="worksError"><td :colspan="workActions?9:8" role="alert">{{ worksError }} <button type="button" @click="loadWorks">Повторить</button></td></tr>
      <tr v-else-if="!visibleWorks.length&&!pendingWorks.length"><td :colspan="workActions?9:8">В этом договоре у выбранного сооружения пока нет сохранённых работ.</td></tr>
      <template v-else><tr v-for="(work,index) in visibleWorks" :key="work.id" tabindex="-1" v-reveal-work-row="highlight===work.id?'focus':false" :class="{'odis-work-highlight':highlight===work.id}" @click="highlight=work.id" @keydown.enter.self.prevent="detail=work" @dblclick="detail=work">
       <td class="odis-status-cell"><WorkStatusIcon :status="work.status"/></td><td data-label="№">{{ index+1 }}</td><td data-label="Код ИССО"><button type="button" class="cw-name contract-cell-ellipsis" :title="work.name" @click="detail=work">{{ work.name }}</button></td>
       <td>{{ date(work.planStart) }}</td><td>{{ date(work.planFinish) }}</td><td class="cs-hours">{{ work.planHours??'—' }}</td><td>{{ work.planExecutor||'—' }}</td><td><span class="contract-cell-ellipsis cs-note" :title="work.note">{{ work.note||'—' }}</span></td>
       <td v-if="workActions"><button v-if="canRemove" type="button" class="odis-remove-row" :disabled="saving||work.tripManaged" :aria-label="'Удалить работу '+work.name" :title="work.tripManaged?'Работа связана с командировкой':'Удалить работу по сооружению'" @click.stop="emit('removeWork',work)" @dblclick.stop><Icon name="lucide:trash-2"/></button></td>
      </tr>
      <tr v-for="(work,index) in pendingWorks" :key="'draft-'+work.id"><td><WorkStatusIcon status="unplanned"/></td><td>{{visibleWorks.length+index+1}}</td><td>{{work.name}}</td><td colspan="4">Добавляется при сохранении</td><td>{{work.note||'—'}}</td>
       <td v-if="workActions"><button type="button" class="odis-remove-row" :disabled="saving" :aria-label="'Убрать работу '+work.name" title="Убрать из добавляемых" @click="selected && emit('removeDraft',work.id,selected.structureId)"><Icon name="lucide:trash-2"/></button></td></tr></template>
     </tbody>
    </table>
   </div>
  </section>
 </section>
 <WorkCard v-if="detail && contractId" :row="detail" kind="structure" :contract-id="contractId"
   :contract-number="contractNumber" :employees="employees" :can-edit="canEdit" :isso="selected?.code" :link-id="selectedId" @close="closeDetail" @saved="reloadAfterSave" />
</template>

<style>
.contract-structures-workspace.cs-draft:not(:has(.cs-work-panel)){grid-template-rows:auto minmax(86px,1fr)}
.contract-structures-workspace .contract-section-head{flex-wrap:wrap;align-items:center}
.contract-structures-workspace .cs-range,.contract-structures-workspace .cs-bulk,.cs-bulk label{display:inline-flex;align-items:center;gap:5px}
.contract-structures-workspace .cs-range input,.contract-structures-workspace .cs-stage-control{background:var(--contract-bg);color:var(--contract-text);border:1px solid var(--contract-line);border-radius:3px;padding:2px 5px;font:inherit}
.cs-range input{width:6em}.cs-stage-control{min-width:3.2em;max-width:10em}.cs-list input.cs-stage-control{width:7em}
.contract-structures-workspace .cs-check{text-align:center;width:30px}.cs-check input{vertical-align:middle;accent-color:var(--diag-accent,#176b88)}
.cs-range,.cs-bulk,.cs-hint{font-size:12px}.cs-hint{flex-basis:100%}

.contract-structures-workspace{position:relative}
.cs-filter-layer{position:absolute;inset:0;z-index:30;pointer-events:none}
.cs-filter-count{display:inline-block;margin-left:10px;font-size:12px;font-weight:400;color:var(--contract-text,#253647)}
.contract-compact-table th.cs-filter-heading{vertical-align:top}


.contract-structures-workspace { grid-template-columns: minmax(0,1fr); }
.cs-list table, .cs-works table { table-layout: fixed; width: 100%; white-space: normal; }
.cs-list .cs-col-check { width: 27px; }
.cs-col-number { width: 3.4em; }
.cs-col-code { width: 8%; }
.cs-col-roadName { width: 17%; }
.cs-col-location { width: 8%; }
.cs-col-additionalId { width: 9%; }
.cs-col-stage { width: 5em; }
.cs-list .odis-column-filter, .cs-list .odis-filter-input-row input { min-width: 0; }
.cs-list .odis-column-filter .odis-filter-toggle { white-space: normal; line-height: 1.2; overflow-wrap: anywhere; }
.cs-list :is(td, th), .cs-works :is(td, th) { overflow-wrap: anywhere; }
.cs-list .contract-cell-ellipsis, .cs-works .contract-cell-ellipsis { max-width: 100%; }
.cs-list .cs-stage-control, .cs-list input.cs-stage-control { width: 100%; max-width: 100%; min-width: 0; }
.cs-work-heading, .cs-work-heading .odis-work-heading-tools { flex-wrap: wrap; min-width: 0; }
.cs-works th:nth-child(2) { width: 3.4em; }
@media (max-width: 680px) {
 .cs-list :is(th,td), .cs-works :is(th,td) { padding-inline: 2px; }
 .cs-list :is(table, thead, tbody) { display: block; width: 100%; }
 .cs-list colgroup, .cs-list thead th:not(.cs-check):not(.cs-filter-heading) { display: none; }
 .cs-list tr { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); }
 .cs-list tr + tr { border-top: 2px solid var(--contract-line); }
 .cs-list .cs-check, .cs-list th.cs-check { width: auto; text-align: left; }
 .cs-list thead { position: static; }
 .cs-list :is(td,th), .cs-list thead th { position: static; height: auto; min-width: 0; padding: 4px 6px; }
 .cs-list td[data-label]::before { content: attr(data-label); display: block; font-size: 11px; opacity: .8; }
 .cs-list td[colspan] { grid-column: 1/-1; }
 .cs-list th.cs-check::after { content: "Выбрать всё"; margin-left: 5px; font-weight: 400; }
 .cs-list .contract-cell-ellipsis { white-space: normal; }
 .cs-list .cs-stage-control { max-width: 6em; }
 .cs-works th:nth-child(2) { width: 2em; }

}
</style>
