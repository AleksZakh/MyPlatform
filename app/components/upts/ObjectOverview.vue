<script setup lang="ts">
import WorkName from './WorkName.vue';
import DocumentBadge from './DocumentBadge.vue';
import {workKindNames} from '~~/shared/utils/upts-work-kinds';
import {ref,computed,onMounted,onBeforeUnmount} from 'vue';
import Modal from '../work/Modal.vue';
import {WORK_STATUSES,workUserName,type WorkTaskDTO,type WorkUser} from '~~/shared/types/work';
import {UPTS_CONTRACT_TYPES} from '~~/shared/types/upts-library';
import {formatWorkDate} from '~~/shared/utils/work-board';
import type {UptsContractDTO,UptsProjectDTO} from '~~/shared/types/upts';
const props=defineProps<{contractId:number}>();
const emit=defineEmits<{close:[];changed:[];work:[task:WorkTaskDTO];edit:[object:UptsContractDTO];files:[project:UptsProjectDTO,contractId:number]}>();
const data=ref<{object:UptsContractDTO;project:UptsProjectDTO;canAssign:boolean;tasks:(WorkTaskDTO&{fileCount:number;documentGroups?:{type:string;count:number}[]})[];notifications:{taskId:number;emailSentAt:string|null;chatSentAt:string|null;lastError:string|null}[]}|null>(null),people=ref<WorkUser[]>([]),error=ref(''),busy=ref(false),selected=ref<number[]>([]),assignee=ref<number|null>(null),anchor=ref(0),drag=ref<number|null>(null);
const d=computed(()=>data.value?.object.objectDetails||{});
const rows=computed(()=>data.value?.tasks||[]);
const documentLegend=computed(()=>[...new Set(rows.value.flatMap(t=>(t.documentGroups||[]).map(g=>g.type)))].sort((a,b)=>a.localeCompare(b,'ru')));
const selectable=computed(()=>rows.value.filter(t=>!['DONE','CANCELLED'].includes(t.status)));
const statusName=(status:string)=>(WORK_STATUSES as Record<string,string>)[status]||status;
const stats=computed(()=>({all:rows.value.length,todo:rows.value.filter(t=>t.status==='TODO').length,active:rows.value.filter(t=>t.status==='IN_PROGRESS').length,review:rows.value.filter(t=>t.status==='REVIEW').length,done:rows.value.filter(t=>t.status==='DONE').length}));
const characteristics=computed(()=>[['Вид работ',workKindNames(d.value)],['Условный номер',data.value?.object.number],['Кадастровый номер',d.value.sourceCadastralNumber],['Объект',d.value.road],['Тип',data.value?.object.contractType?UPTS_CONTRACT_TYPES[data.value.object.contractType]:''],['Местоположение',d.value.address],['Площадь, кв. м',d.value.sourceArea],['Категория земель',d.value.landCategory],['ВРИ',d.value.permittedUses?.join('; ')],['Вид права',d.value.rightKind],['Правообладатель',d.value.rightHolders?.join('; ')],['Номер договора',d.value.basisContractNumber],['Дата договора',formatWorkDate(d.value.basisContractDate)],['Номер заявки',d.value.requestNumber],['Начало работ',formatWorkDate(d.value.workStartDate)],['Окончание работ',formatWorkDate(data.value?.object.dueDate)],['Куратор',person(d.value.curatorId)],['Кадастровый инженер',person(d.value.engineerId)],['Количество этапов',d.value.stageCount||1],['Этап',d.value.stage]]);
function person(id?:number|null){return id?workUserName(people.value.find(p=>p.id===id)||{id,fullName:null,login:null}):'—';}
async function load(){busy.value=true;error.value='';try{const [v,p]=await Promise.all([$fetch<NonNullable<typeof data.value>>(`/api/upts/contracts/${props.contractId}/overview`),$fetch<WorkUser[]>('/api/upts/people')]);data.value=v;people.value=p;selected.value=[];}catch(e:any){error.value=e.data?.message||'Не удалось загрузить карточку объекта.';}finally{busy.value=false;}}
function choose(index:number,shift=false){if(busy.value||!data.value?.canAssign)return;if(!shift)anchor.value=index;selected.value=rows.value.slice(Math.min(anchor.value,index),Math.max(anchor.value,index)+1).filter(t=>!['DONE','CANCELLED'].includes(t.status)).map(t=>t.id);}
function begin(e:PointerEvent,i:number){if(e.button!==0||(e.target as HTMLElement).closest('input,button,select'))return;choose(i,e.shiftKey);drag.value=e.shiftKey?anchor.value:i;e.preventDefault();}
function enter(e:PointerEvent,i:number){if(drag.value===null)return;if(!(e.buttons&1)){drag.value=null;return;}anchor.value=drag.value;choose(i,true);}
async function assign(){if(!assignee.value||!selected.value.length)return;busy.value=true;error.value='';try{await $fetch(`/api/upts/contracts/${props.contractId}/assign`,{method:'POST',headers:{'x-space-work':'1'},body:{assigneeId:assignee.value,tasks:rows.value.filter(t=>selected.value.includes(t.id)).map(t=>({id:t.id,version:t.version}))}});await load();emit('changed');}catch(e:any){error.value=e.data?.message||'Не удалось назначить исполнителя. Обновите карточку.';}finally{busy.value=false;}}
defineExpose({refresh:load});
function endDrag(){drag.value=null;}
onMounted(()=>{load();window.addEventListener('pointerup',endDrag);window.addEventListener('blur',endDrag);});
onBeforeUnmount(()=>{window.removeEventListener('pointerup',endDrag);window.removeEventListener('blur',endDrag);});
</script>
<template><Modal full-height viewport-width fixed-sections grey-header icon="streamline-kameleon-color:map-pin" title="Карточка объекта" @close="emit('close')">
 <div class="object-overview-layout">
 <p v-if="error" class="work-error" role="alert">{{ error }}</p>
 <template v-if="data"><div class="object-overview-fields"><div v-for="([label,value],i) in characteristics" :key="i"><small>{{ label }}</small><p>{{ value || '—' }}</p></div></div>
 <div class="work-actions object-overview-actions"><button :disabled="busy" @click="load"><Icon name="lucide:refresh-cw" /> Обновить</button><button v-if="data.project.canManage&&!data.project.archivedAt" @click="emit('edit',data.object)">Редактировать объект</button><button @click="emit('files',data.project,data.object.id)">Документы объекта</button></div>
 <div class="object-overview-stats"><span>Всего: {{ stats.all }}</span><span>Запланировано: {{ stats.todo }}</span><span>В работе: {{ stats.active }}</span><span>На проверке: {{ stats.review }}</span><span>Выполнено: {{ stats.done }}</span></div>
 <div v-if="data.canAssign" class="work-toolbar"><span>Выделено: {{ selected.length }}</span><label>Исполнитель<select v-model="assignee" :disabled="busy"><option :value="null">Выберите сотрудника</option><option v-for="p in people" :key="p.id" :value="p.id">{{ workUserName(p) }}</option></select></label><button :disabled="busy||!assignee||!selected.length" @click="assign">Назначить выделенным</button></div>
 <p v-if="data.canAssign" class="work-muted">Выделите строки флажками, Shift-кликом или перетягиванием. Завершённые работы не переназначаются.</p>
 <div v-if="documentLegend.length" class="object-document-legend" aria-label="Обозначения типов документов"><span v-for="type in documentLegend" :key="type"><DocumentBadge :type="type" /><small>{{ type }}</small></span></div>
 <div class="work-table-wrap object-overview-table"><table class="object-work-table"><colgroup><col v-if="data.canAssign" class="col-check" /><col class="col-number" /><col class="col-work" /><col class="col-stage" /><col class="col-state" /><col class="col-person" /><col class="col-date" /><col class="col-date" /><col class="col-result" /><col class="col-files" /></colgroup><thead><tr><th v-if="data.canAssign"><input type="checkbox" aria-label="Выделить все работы" :checked="!!selectable.length&&selected.length===selectable.length" @change="selected=($event.target as HTMLInputElement).checked?selectable.map(t=>t.id):[]" /></th><th>№</th><th>Работа</th><th>Этап</th><th>Статус</th><th>Исполнитель</th><th>Начало</th><th>Окончание</th><th>Результат</th><th>Файлы</th></tr></thead><tbody><tr v-for="(t,i) in rows" :key="t.id" :class="{selected:selected.includes(t.id)}" @pointerdown="begin($event,i)" @pointerenter="enter($event,i)" @pointerup="drag=null" @dblclick="emit('work',t)"><td v-if="data.canAssign"><input v-model="selected" :disabled="busy || t.status==='DONE' || t.status==='CANCELLED'" type="checkbox" :value="t.id" :aria-label="'Выделить '+t.title" /></td><td>{{ i+1 }}</td><td><button @click="emit('work',t)"><WorkName :meta="t.uptsWorkMeta" emphasize>{{ t.title }}</WorkName></button></td><td>{{ t.uptsWorkMeta?.stageNumber||1 }}</td><td>{{ statusName(t.status) }}</td><td>{{ t.assignee?workUserName(t.assignee):'Не назначен' }}</td><td>{{ formatWorkDate(t.uptsWorkMeta?.startedAt)||'—' }}</td><td>{{ formatWorkDate(t.uptsWorkMeta?.completedAt)||'—' }}</td><td>{{ t.uptsWorkMeta?.resultText||'—' }}</td><td class="object-work-documents"><template v-if="t.documentGroups?.length"><button v-for="g in t.documentGroups" :key="g.type" type="button" :aria-label="g.type+': '+g.count+' файлов. Открыть карточку работы'" @click="emit('work',t)"><DocumentBadge :type="g.type" :count="g.count" /></button></template><span v-else class="work-muted">{{ t.fileCount || '—' }}</span></td></tr></tbody></table></div>
 <details class="object-delivery" v-if="data.canAssign&&data.notifications.length"><summary>Доставка уведомлений</summary><p v-for="(n,i) in data.notifications" :key="i">Работа #{{ n.taskId }} · чат: {{ n.chatSentAt?'доставлено':'в очереди' }} · email: {{ n.emailSentAt?'отправлено':'в очереди' }} {{ n.lastError||'' }}</p></details>
 </template>
 <p v-else-if="busy" class="work-muted" role="status">Загружаем карточку…</p><button v-else @click="load">Повторить загрузку</button>
 </div>
</Modal></template>
<style scoped>
.object-overview-layout{display:flex;flex-direction:column;gap:8px;height:100%;min-height:0}
.object-overview-fields{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px 12px;padding:8px;background:color-mix(in srgb,var(--work-line) 18%,var(--work-panel));border:1px solid var(--work-line);border-radius:7px;flex-shrink:0;max-height:35vh;overflow:auto}
.object-overview-fields>div{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:13px}
.object-overview-fields small{color:var(--work-muted);flex:0 1 105px;font-size:11px;line-height:1.3}
.object-overview-fields p{font-size:13px;font-weight:600;color:var(--work-text);margin:0;flex:1;min-width:0;padding:3px 5px;border-bottom:1px solid var(--work-line);overflow-wrap:anywhere;line-height:1.3}
.object-overview-actions{margin:0}.object-overview-actions button{padding:4px 9px;font-size:12px}
.object-overview-stats{display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;font-weight:600}
.object-overview-layout .work-toolbar{gap:8px;margin:0;flex-shrink:0;align-items:center}.object-overview-layout .work-toolbar label{display:flex;align-items:center;gap:8px}.object-overview-layout .work-toolbar select{width:260px;max-width:45vw;padding:5px 8px;height:32px}.object-overview-layout>.work-muted{margin:0;font-size:11px}
.object-overview-table{flex:1;min-height:130px;overflow:auto}.object-work-table{min-width:1080px;width:100%;table-layout:fixed}.object-work-table .col-check{width:28px}.object-work-table .col-number{width:30px}.object-work-table .col-work{width:23%}.object-work-table .col-stage{width:42px}.object-work-table .col-state{width:100px}.object-work-table .col-person{width:15%}.object-work-table .col-date{width:78px}.object-work-table .col-result{width:12%}.object-work-table thead th{position:sticky;top:0;background:var(--work-panel);z-index:1}.object-work-table :is(th,td){padding:4px 6px;font-size:12px;overflow-wrap:anywhere}.object-work-table tr{user-select:none}.object-work-table tr.selected{background:color-mix(in srgb,var(--work-accent) 18%,var(--work-panel))}.object-work-table td button{border:0;padding:0;background:transparent;color:var(--work-accent)}
.object-document-legend{display:flex;flex-wrap:wrap;gap:4px 16px;align-items:center;justify-content:flex-end;flex-shrink:0;max-height:90px;overflow:auto;padding:0 6px 5px}.object-document-legend>span{display:inline-flex;gap:6px;align-items:center}.object-document-legend small{font-size:11px;color:var(--work-muted)}.object-work-documents button{display:inline-flex;margin-right:7px;vertical-align:middle}.object-work-documents{vertical-align:middle}
.object-delivery{flex-shrink:0;max-height:100px;overflow:auto;font-size:11px}.object-delivery p{margin:4px 0}
:global(html.dark .object-overview-fields){background:color-mix(in srgb,var(--work-panel) 93%,white 7%)}
:global(html.dark .object-overview-fields p){color:#f8fafc}
@media(max-width:1000px){.object-overview-fields{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:700px){.object-overview-fields{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.object-overview-fields{grid-template-columns:1fr}}
</style>
