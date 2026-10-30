<script setup lang="ts">
import {computed,reactive,ref,watch,onBeforeUnmount} from 'vue';
import type {ContractStructureListItem} from '~~/shared/types/diagnostic-contract-structures';
import CreatableNameSelect from '../../common/CreatableNameSelect.vue';
import {contractDateTime} from '~~/shared/utils/diagnostic-contract-search';
import type {ContractRecord,ContractInput,DiagnosticCatalog} from '~~/shared/types/diagnostic-contracts';
import {contractStatus} from '~~/shared/utils/diagnostic-contracts';
const props=defineProps<{contract:ContractRecord|null;catalog:DiagnosticCatalog;readOnly:boolean;canCreate:boolean;canEdit:boolean}>();
const emit=defineEmits<{close:[];edit:[];save:[ContractRecord]}>();
const tabs=['Карточка договора','Работы с договором','Перечень сооружений'];
const tab=ref(0),error=ref(''),saving=ref(false),confirmClose=ref(false);
const structures=ref<ContractStructureListItem[]>([]);
const structuresLoading=ref(false),structuresError=ref('');
let structuresRequest=0;
async function loadStructures(){
 const request=++structuresRequest,contractId=props.contract?.id;
 structures.value=[];structuresError.value='';structuresLoading.value=false;
 if(!contractId)return;
 structuresLoading.value=true;
 try{
  const rows=await $fetch<ContractStructureListItem[]>('/api/diagnostic/contracts/'+contractId+'/structures');
  if(request===structuresRequest)structures.value=rows;
 }catch(e:any){
  if(request===structuresRequest)structuresError.value=e?.data?.message||'Не удалось загрузить сооружения. Повторите попытку.';
 }finally{if(request===structuresRequest)structuresLoading.value=false;}
}
watch(()=>[tab.value,props.contract?.id] as const,()=>{
 if(tab.value===2)void loadStructures();
 else {structuresRequest++;structuresLoading.value=false;}
});
onBeforeUnmount(()=>{structuresRequest++;});

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
function moveTab(event:KeyboardEvent,index:number,step:number){tab.value=(index+step+3)%3;const buttons=(event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]');buttons?.[tab.value]?.focus();}
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
 <UModal :open="true" :title="contract?(readOnly?'Просмотр договора':'Редактирование договора'):'Новый договор'" :ui="{content:'diagnostic-contract-modal w-[96vw] sm:max-w-none h-[90dvh]',body:'contract-modal-body',footer:'contract-modal-footer'}" @update:open="value=>{if(!value)close()}">
  <template #body>
   <div class="contract-editor-tabs" role="tablist" aria-label="Карточка договора"><button v-for="(label,i) in tabs" :id="`contract-editor-tab-${i}`" :key="label" role="tab" :aria-selected="tab===i" :tabindex="tab===i?0:-1" aria-controls="contract-editor-panel" @click="tab=i" @keydown.right.prevent="moveTab($event,i,1)" @keydown.left.prevent="moveTab($event,i,-1)">{{ label }}</button></div>
   <div id="contract-editor-panel" class="contract-editor-panel" role="tabpanel" :aria-labelledby="`contract-editor-tab-${tab}`">
    <form v-show="tab===0" id="diagnostic-contract-form" novalidate @submit.prevent="save">
     <h2>Реквизиты договора <small>· {{ statusLabel }}</small></h2>
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
    <section v-if="tab===1"><header class="contract-section-head"><h2>Перечень работ с договором</h2><button disabled title="Подключим справочник работ отдельным этапом">Добавить работы</button></header><div class="contract-detail-table"><table><thead><tr><th rowspan="2">#</th><th rowspan="2">Работа</th><th colspan="3">План</th><th colspan="3">Факт</th><th rowspan="2">Примечания</th></tr><tr><th>Дата нач.</th><th>Дата оконч.</th><th>Исполнитель</th><th>Дата нач.</th><th>Дата оконч.</th><th>Исполнитель</th></tr></thead><tbody><tr><td colspan="9">Работы с договором не найдены. Справочник ещё не подключён.</td></tr></tbody></table></div></section>
    <section v-if="tab===2"><header class="contract-section-head"><h2>Перечень сооружений</h2><div><button disabled title="Следующий этап">Добавить сооружения</button><button disabled title="Следующий этап">Добавить работы</button></div></header><div class="contract-detail-table"><table><thead><tr><th>#</th><th>Код ИССО</th><th>Сооружение</th><th>Название автодороги</th><th>Место, км</th><th>Доп. инф.</th><th>Название осн. препятствия</th><th>Район расположения</th></tr></thead><tbody>
<tr v-if="structuresLoading"><td colspan="8" role="status"><span class="animate-pulse motion-reduce:animate-none">Загрузка сооружений…</span></td></tr>
<tr v-else-if="structuresError"><td colspan="8" role="alert">{{ structuresError }} <button type="button" @click="loadStructures">Повторить загрузку</button></td></tr>
<tr v-else-if="!contract"><td colspan="8">Сохраните договор, чтобы просмотреть связанные сооружения.</td></tr>
<tr v-else-if="!structures.length"><td colspan="8">К этому договору пока не привязаны сооружения.</td></tr>
<template v-else><tr v-for="(structure,index) in structures" :key="structure.id">
<td>{{ index+1 }}</td><td>{{ structure.code }}</td><td>{{ structure.structureName }}</td><td>{{ structure.roadName }}</td><td>{{ structure.location }}</td><td>{{ structure.additionalId }}</td><td>{{ structure.obstacleName }}</td><td>{{ structure.district }}</td>
</tr></template>
</tbody></table></div></section>
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
