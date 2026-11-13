<script setup lang="ts">
import {computed,reactive,ref,watch,onBeforeUnmount,onMounted} from 'vue';
import type {ContractDetailCounts} from '~~/shared/types/diagnostic-contract-details';
import CreatableNameSelect from '../../common/CreatableNameSelect.vue';
import ContractWorks from './ContractWorks.vue';
import ContractStructures from './ContractStructures.vue';
import {contractDateTime} from '~~/shared/utils/diagnostic-contract-search';
import type {ContractRecord,ContractInput,DiagnosticCatalog} from '~~/shared/types/diagnostic-contracts';
import {contractStatus} from '~~/shared/utils/diagnostic-contracts';
const props=defineProps<{contract:ContractRecord|null;catalog:DiagnosticCatalog;readOnly:boolean;canCreate:boolean;canEdit:boolean}>();
const emit=defineEmits<{close:[];edit:[];save:[ContractRecord]}>();
const tabs=['Карточка договора','Работы с договором','Перечень сооружений'];
const tab=ref(0),error=ref(''),saving=ref(false),confirmClose=ref(false);
const startTabKey='space:diagnostic:contract-card:start-tab:v1';
const pinnedTab=ref<number|null>(null),pinError=ref('');
onMounted(()=>{
 try{
  const stored=localStorage.getItem(startTabKey);
  if(stored!==null && /^[0-2]$/.test(stored)){
   pinnedTab.value=Number(stored);
   if(props.contract && props.readOnly)tab.value=pinnedTab.value;
  }
 }catch{/* The card remains usable when browser storage is unavailable. */}
});
function pinStartTab(){
 pinError.value='';
 try{
  if(pinnedTab.value===tab.value){localStorage.removeItem(startTabKey);pinnedTab.value=null;}
  else{localStorage.setItem(startTabKey,String(tab.value));pinnedTab.value=tab.value;}
 }catch{pinError.value='Не удалось сохранить закрепление вкладки в браузере.';}
}
const counts=reactive<{works:number|null;structures:number|null}>({works:null,structures:null});
const countsError=ref('');
let countsRequest=0;
async function loadCounts(){
 const request=++countsRequest,contractId=props.contract?.id;
 counts.works=null;counts.structures=null;countsError.value='';
 if(!contractId){counts.works=0;counts.structures=0;return;}
 try{
  const data=await $fetch<ContractDetailCounts>('/api/diagnostic/contracts/'+contractId+'/summary');
  if(request===countsRequest){counts.works=data.works;counts.structures=data.structures;}
 }catch(e:any){if(request===countsRequest)countsError.value=e?.data?.message||'Не удалось загрузить количество работ и сооружений.';}
}
watch(()=>props.contract?.id,()=>void loadCounts(),{immediate:true});
onBeforeUnmount(()=>{countsRequest++;});

type Draft=Omit<ContractInput,'counterpartyId'|'direction'> & {counterpartyId:number|null;direction:ContractInput['direction']|''};
const c=props.contract;
const form=reactive<Draft>({number:c?.number??'',date:c?.date??'',counterpartyId:c?.counterpartyId??null,direction:c?.direction??'',executor:c?.executor??null,start:c?.start??null,finish:c?.finish??null,stages:c?.stages??null,hours:c?.hours??null,amount:c?.amount??null,note:c?.note??null,projectTypeId:c?.projectTypeId??null,supervisorId:c?.supervisorId??null,relatedContractId:c?.relatedContractId??null});
const counterparties=ref([...props.catalog.counterparties]),projectTypes=ref([...props.catalog.projectTypes]);
const catalogBusy=ref(false);
const counterpartyName=ref(c?.counterparty??''),projectTypeName=ref(c?.projectType??'');
function chooseName(kind:'counterparties'|'project-types',value:string){
 if(props.readOnly||saving.value||catalogBusy.value)return;
 const list=kind==='counterparties'?counterparties.value:projectTypes.value;
 const item=list.find(i=>i.name.toLocaleLowerCase('ru-RU')===value.trim().toLocaleLowerCase('ru-RU'));
 if(!item&&value.trim()&&!props.canCreate)return;
 if(kind==='counterparties'){counterpartyName.value=item?.name||value;form.counterpartyId=item?.id??null;}
 else{projectTypeName.value=item?.name||value;form.projectTypeId=item?.id??null;}
}

const snapshot=()=>JSON.stringify({form,counterparty:counterpartyName.value,projectType:projectTypeName.value});
const initial=snapshot(),dirty=computed(()=>snapshot()!==initial);
const incomeContracts=computed(()=>props.catalog.incomeContracts.filter(r=>r.id!==c?.id));
const auxiliary=ref<'documents'|'summary'|null>(null);
const statusLabel=computed(()=>!form.date?'Не определён':({PLANNED:'Планируемый',ACTIVE:'Выполняемый',COMPLETED:'Завершённый'}[contractStatus(form.date,form.finish||null)]));
function message(e:any){return e?.data?.data?.message||e?.data?.message||'Не удалось сохранить. Проверьте соединение и обновите данные.';}
function close(){if(saving.value||catalogBusy.value)return;if(dirty.value&&!props.readOnly)confirmClose.value=true;else emit('close');}
async function resolveNames(){
 for(const kind of ['counterparties','project-types'] as const){
  const name=kind==='counterparties'?counterpartyName.value:projectTypeName.value;
  const id=kind==='counterparties'?form.counterpartyId:form.projectTypeId;
  if(id||!name.trim())continue;
  if(!props.canCreate)throw {data:{message:'Нет права добавлять новые значения.'}};
  const item=await $fetch<{id:number;name:string}>('/api/diagnostic/'+kind,{method:'POST',headers:{'x-space-diagnostic':'1'},body:{name}});
  const list=kind==='counterparties'?counterparties:projectTypes;if(!list.value.some(i=>i.id===item.id))list.value.push(item);
  if(kind==='counterparties'){form.counterpartyId=item.id;counterpartyName.value=item.name;}
  else{form.projectTypeId=item.id;projectTypeName.value=item.name;}
 }
}
async function save(){
 if(props.readOnly||saving.value)return;error.value='';
 if(!form.number.trim()||!form.date||!counterpartyName.value.trim()||!form.direction){tab.value=0;error.value='Укажите номер, дату заключения, контрагента и тип договора.';return;}
 if(form.finish&&(form.finish<form.date||(form.start&&form.finish<form.start))){tab.value=0;error.value='Окончание работ не может быть раньше заключения договора или начала работ.';return;}
 saving.value=true;
 try{await resolveNames();const saved=await $fetch<ContractRecord>('/api/diagnostic/contracts'+(c?'/'+c.id:''),{method:c?'PUT':'POST',headers:{'x-space-diagnostic':'1'},body:{...form,version:c?.version}});emit('save',saved);}
 catch(e){error.value=message(e);tab.value=0;}finally{saving.value=false;}
}
function moveTab(event:KeyboardEvent,index:number,step:number){tab.value=(index+step+3)%3;const buttons=(event.currentTarget as HTMLElement).closest('[role=tablist]')?.querySelectorAll<HTMLButtonElement>('[role=tab]');buttons?.[tab.value]?.focus();}
const summaryColumns=[
 ['305','АИС конструктив + проезжая часть + GPS'],['306','АИС маломоб.+ПОС'],
 ['307','АИС гарантийный паспорт'],['308','АИС ведомость дефектов'],
 ['309','АИС стройподъёмы'],['310','АИС прочность бетона'],['311','АИС Фото'],
 ['312','АИС Чертежи'],['313','АИС Расчёты ГП'],['314','АИС Книга ИССО'],
 ['315','АИС Видео'],['316','АИС Оценка состояния'],['317','АИС Финиш'],
 ['318','АИС Проверка'],['320','АИС Проверка класса ГП']
];
</script>
<template>
 <UModal :open="true" :title="contract?(readOnly?'Просмотр договора':'Редактирование договора'):'Новый договор'" :ui="{content:'diagnostic-contract-modal odis-contract-editor w-[96vw] sm:max-w-none h-[90dvh]',header:'contract-modal-header',body:'contract-modal-body',footer:'contract-modal-footer'}" @update:open="value=>{if(!value)close()}">
  <template #body>
   <div class="contract-editor-tabs" role="tablist" aria-label="Карточка договора">
    <div v-for="(label,i) in tabs" :key="label" class="contract-editor-tab" :class="{'is-active':tab===i}" role="presentation">
     <button :id="`contract-editor-tab-${i}`" type="button" role="tab" :aria-selected="tab===i" :tabindex="tab===i?0:-1" aria-controls="contract-editor-panel" @click="tab=i" @keydown.right.prevent="moveTab($event,i,1)" @keydown.left.prevent="moveTab($event,i,-1)"><span>{{ label }}</span><small v-if="i===1" class="contract-tab-count">Всего работ: {{ counts.works ?? (countsError ? '—' : '…') }}</small><small v-if="i===2" class="contract-tab-count">Всего сооружений: {{ counts.structures ?? (countsError ? '—' : '…') }}</small></button>
     <button v-if="contract&&readOnly" v-show="tab===i" type="button" class="contract-tab-pin" :class="{'is-pinned':pinnedTab===i}" :aria-pressed="pinnedTab===i" :aria-label="pinnedTab===i?'Открепить стартовую вкладку':'Открывать эту вкладку при просмотре договора'" :title="pinnedTab===i?'Открепить стартовую вкладку':'Открывать эту вкладку при просмотре договора'" @click="pinStartTab"><Icon name="emojione-monotone:pushpin" aria-hidden="true" /></button>
    </div>
   </div>
   <p v-if="pinError" class="contract-count-error" role="alert">{{ pinError }}</p>
   <p v-if="countsError" class="contract-count-error" role="alert">{{ countsError }} <button type="button" @click="loadCounts">Повторить</button></p>
   <div id="contract-editor-panel" class="contract-editor-panel" :class="{'contract-editor-panel--tables':tab!==0}" role="tabpanel" :aria-labelledby="`contract-editor-tab-${tab}`">
    <form v-show="tab===0" id="diagnostic-contract-form" novalidate @submit.prevent="save">
     <h2 class="contract-requisites-heading">Реквизиты договора <small>· {{ statusLabel }}</small></h2>
     <p v-if="error" role="alert" class="contract-error">{{ error }}</p>
     <fieldset :disabled="readOnly||saving||catalogBusy" class="contract-fields-row">
      <label class="contract-field-wide">Номер договора *<input v-model="form.number" maxlength="150" required /></label>
      <label>Дата заключения договора *<input v-model="form.date" type="date" required /></label>
      <label>Контрагент/Заказчик *<CreatableNameSelect :model-value="counterpartyName" :items="counterparties.map(i=>i.name)" :disabled="readOnly||saving" :can-create="canCreate" placeholder="Выберите или создайте контрагента" @update:model-value="chooseName('counterparties',$event)" /></label>
      <label>Исполнитель<select v-model="form.executor"><option :value="null">Не указан</option><option value="ОДИС">ОДИС</option><option value="Автодор Инжиниринг">Автодор Инжиниринг — организация в целом</option></select></label>
      <label>Сумма договора (с НДС), ₽<input v-model="form.amount" type="number" min="0" step="0.01" /></label>
     </fieldset>
     <fieldset :disabled="readOnly||saving||catalogBusy" class="contract-fields-row">
      <label>Начало работ<input v-model="form.start" type="date" /></label>
      <label>Окончание работ<input v-model="form.finish" type="date" /></label>
      <label class="contract-field-wide">Тип проекта<CreatableNameSelect :model-value="projectTypeName" :items="projectTypes.map(i=>i.name)" :disabled="readOnly||saving" :can-create="canCreate" placeholder="Выберите или создайте тип проекта" @update:model-value="chooseName('project-types',$event)" /></label>
      <label>Руководитель проекта<select v-model="form.supervisorId"><option :value="null">Не назначен</option><option v-if="contract?.supervisorId && !catalog.supervisors.some(u=>u.id===contract?.supervisorId)" :value="contract.supervisorId" disabled>{{ contract.supervisor }} — недоступен, выберите другого</option><option v-for="item in catalog.supervisors" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
      <label>Тип договора *<select v-model="form.direction" required><option value="">Не выбран</option><option value="INCOME">Доходный</option><option value="EXPENSE">Расходный</option><option value="INTERNAL">Внутренний</option></select></label>
     </fieldset>
     <div class="contract-related"><label>Доходный договор<select v-model="form.relatedContractId" :disabled="readOnly||saving"><option :value="null">Не связан</option><option v-for="item in incomeContracts" :key="item.id" :value="item.id">{{ item.number }} · {{ item.counterparty }}</option></select></label></div>
     <h2>Дополнительная информация по договору</h2>
     <fieldset class="contract-extra" :disabled="readOnly||saving"><label>Количество этапов<input v-model.number="form.stages" type="number" min="0" step="1" /></label><label>Количество сооружений<input :value="contract?.buildings??0" readonly title="Рассчитывается по связанным сооружениям" /></label><label>Количество чел./часов<input v-model="form.hours" type="number" min="0" step="0.01" /></label></fieldset>
     <label class="contract-note">Примечание<textarea v-model="form.note" :disabled="readOnly||saving" maxlength="10000" rows="4" /></label>
     <p v-if="catalog.supervisorWarning" role="status">{{ catalog.supervisorWarning }}</p>

     <div v-if="contract" class="contract-authorship">
      <span><strong>Создано:</strong> {{ contract.creator }} · {{ contractDateTime(contract.createdAt) }}</span>
      <span><strong>Обновлено:</strong> {{ contract.editor }} · {{ contractDateTime(contract.updatedAt) }}</span>
     </div>
    </form>
    <ContractWorks v-if="tab===1" :contract-id="contract?.id??null" @count="counts.works=$event" />
    <ContractStructures v-if="tab===2" :contract-id="contract?.id??null" @count="counts.structures=$event" />
   </div>
  </template>
  <template #footer><div class="contract-footer-content"><div class="contract-secondary-actions"><button type="button" @click="auxiliary='documents'"><Icon name="lucide:folder-open" />Документы к договору</button><button type="button" @click="auxiliary='summary'"><Icon name="lucide:table-2" />Сводная таблица работ</button></div><small>{{ readOnly?'Режим просмотра':'Поля со звёздочкой обязательны. Остальные можно заполнить позже.' }}</small><div v-if="confirmClose" class="contract-discard" role="alert">Отменить несохранённые изменения?<button :disabled="saving" @click="emit('close')">Да, закрыть</button><button @click="confirmClose=false">Продолжить</button></div><div class="contract-footer-actions"><button v-if="contract&&readOnly&&canEdit" type="button" @click="emit('edit')"><Icon name="lucide:pencil" />Редактировать</button><button v-if="!readOnly" :disabled="saving||catalogBusy" class="contract-save" type="submit" form="diagnostic-contract-form">{{ saving?'Сохранение…':'Сохранить' }}</button><button @click="close">{{ readOnly?'Закрыть':'Отменить' }}</button></div></div></template>
 </UModal>
 <UModal v-if="auxiliary" :open="true" :title="auxiliary==='documents'?'Документы к договору':'Сводная таблица работ'" :description="form.number || 'Новый договор'" :ui="{content:'diagnostic-contract-modal w-[96vw] sm:max-w-none h-[90dvh]',body:'contract-modal-body',footer:'contract-modal-footer'}" @update:open="value=>{if(!value)auxiliary=null}">
  <template #body>
   <section v-if="auxiliary==='documents'" class="contract-editor-panel">
    <p>Хранилище документов договора ещё не подключено. Загрузка и просмотр файлов появятся на этапе работы с документами.</p>
    <div class="contract-detail-table"><table><thead><tr><th>Документ</th><th>Размер</th><th>Добавлен</th><th>Автор</th></tr></thead><tbody><tr><td colspan="4">Документы пока недоступны.</td></tr></tbody></table></div>
   </section>
   <section v-else class="contract-editor-panel">
    <p>Строки — сооружения договора, столбцы — виды работ. Данные будут доступны после подключения сооружений и работ.</p>
    <div class="contract-detail-table contract-summary-table"><table><thead><tr><th rowspan="2">№ п/п</th><th rowspan="2">Код ИССО</th><th rowspan="2">Название дороги</th><th rowspan="2">Км+м</th><th rowspan="2">Доп. идентиф.</th><th v-for="column in summaryColumns" :key="column[0]">{{ column[0] }}</th></tr><tr><th v-for="column in summaryColumns" :key="column[0]">{{ column[1] }}</th></tr></thead><tbody><tr><td :colspan="summaryColumns.length+5">Нет подключённых данных о сооружениях и работах.</td></tr></tbody></table></div>
   </section>
  </template>
  <template #footer><div class="contract-footer-content"><button v-if="auxiliary==='summary'" disabled title="Экспорт станет доступен после подключения данных">Экспорт в Excel</button><div class="contract-footer-actions"><button @click="auxiliary=null">Закрыть</button></div></div></template>
 </UModal>
</template>

<style>
/* Local contract chrome: matches the UPTS work card, without changing table colours. */
.diagnostic-contract-modal.odis-contract-editor{--odis-contract-chrome:#e8e8ea;--odis-contract-body:#fff;background:var(--odis-contract-body)!important}
html.dark .diagnostic-contract-modal.odis-contract-editor{--odis-contract-chrome:#465765;--odis-contract-body:#293b4a}
.odis-contract-editor>.contract-modal-header,.odis-contract-editor>.contract-modal-footer{background:var(--odis-contract-chrome)!important;color:var(--contract-text)}
.odis-contract-editor>.contract-modal-body{background:var(--odis-contract-body)}
.odis-contract-editor .contract-detail-table{background:var(--contract-bg)}
.odis-contract-editor .contract-editor-panel--tables .contract-section-head{background:var(--contract-panel);padding:6px 10px;border-bottom:1px solid var(--contract-line)}
.odis-contract-editor .contract-editor-panel--tables .contract-section-head h2{padding:0;border-bottom:0;margin:0}

/* Keep section bars and tables adjacent; retain the original table surfaces. */
.odis-contract-editor .contract-editor-panel{padding-top:0}
.odis-contract-editor .contract-editor-panel--tables .contract-section-head{margin:0}
.odis-contract-editor .contract-structures-workspace{row-gap:0}
.odis-contract-editor .contract-requisites-heading{background:var(--contract-panel);margin:0 -12px;padding:12px;border-bottom:1px solid var(--contract-line)}
.odis-contract-editor .contract-editor-tabs{gap:14px}
.odis-contract-editor .contract-editor-tab{position:relative;display:flex;flex:none;border:1px solid var(--contract-line);border-bottom:0;border-radius:5px 5px 0 0}
.odis-contract-editor .contract-editor-tab.is-active{background:var(--contract-panel);box-shadow:inset 0 3px #2996b7}
.odis-contract-editor .contract-editor-tab [role=tab]{border:0;background:transparent;box-shadow:none;padding:10px 38px 8px 14px;white-space:nowrap}
.odis-contract-editor .contract-editor-tabs .contract-tab-pin{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;padding:4px;border:0;border-radius:4px;background:transparent;color:var(--contract-text);cursor:pointer}
.odis-contract-editor .contract-tab-pin .iconify{transition:transform .15s}
.odis-contract-editor .contract-tab-pin.is-pinned{color:#117995}
.odis-contract-editor .contract-tab-pin.is-pinned .iconify{transform:rotate(-45deg)}
.odis-contract-editor .contract-tab-pin:hover{background:var(--contract-line)}
html.dark .odis-contract-editor .contract-tab-pin.is-pinned{color:#78d6ea}
.odis-contract-editor .contract-editor-tabs button:focus-visible{outline:2px solid #2996b7;outline-offset:-3px}
.odis-contract-editor .odis-work-heading-tools{display:flex;align-items:center;justify-content:flex-end;gap:12px;min-width:0;margin-left:auto;overflow-x:auto}
.odis-contract-editor .odis-work-heading-tools>.odis-work-legend{margin:0;flex-wrap:nowrap}
.odis-contract-editor .odis-work-heading-tools>button{flex:none;margin:0;white-space:nowrap}
.odis-contract-editor .cs-work-heading{margin-bottom:0;padding:4px 0}
.odis-contract-editor .contract-works .contract-section-head h2,.odis-contract-editor .cs-work-heading h3{flex:0 1 auto}
.odis-contract-editor .contract-footer-content button{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;background:#fff;border:1px solid #91a5b9;color:#203d56;font-weight:500;box-shadow:0 1px 2px #18364b1a;cursor:pointer;transition:background-color .15s,border-color .15s,box-shadow .15s}
.odis-contract-editor .contract-footer-content button:hover:not(:disabled){background:#dcecf7;border-color:#347b9c;box-shadow:0 2px 4px #18364b26}
.odis-contract-editor .contract-footer-content button:focus-visible{outline:2px solid #2996b7;outline-offset:2px}
.odis-contract-editor .contract-footer-content button:disabled{opacity:.5;cursor:default;box-shadow:none}
.odis-contract-editor .contract-footer-content .contract-save{background:#176b88;border-color:#176b88;color:#fff}
.odis-contract-editor .contract-footer-content .contract-save:hover:not(:disabled){background:#10536b;border-color:#10536b}
html.dark .odis-contract-editor .contract-footer-content button:not(.contract-save){background:#cbd5e1;border-color:#94a3b8;color:#172b3a}
html.dark .odis-contract-editor .contract-footer-content button:not(.contract-save):hover:not(:disabled){background:#e2e8f0;border-color:#78d6ea}
@media(max-width:900px){
 .odis-contract-editor .contract-section-head,.odis-contract-editor .cs-work-heading{flex-wrap:wrap}
 .odis-contract-editor .odis-work-heading-tools{flex:1 1 100%;justify-content:flex-start}
}
</style>
