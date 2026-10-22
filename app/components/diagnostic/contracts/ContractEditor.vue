<script setup lang="ts">
import {computed,reactive,ref} from 'vue';
import type {ContractRecord,ContractInput,DiagnosticCatalog} from '~~/shared/types/diagnostic-contracts';
import {contractStatus} from '~~/shared/utils/diagnostic-contracts';
const props=defineProps<{contract:ContractRecord|null;catalog:DiagnosticCatalog;readOnly:boolean;canCreate:boolean}>();
const emit=defineEmits<{close:[];save:[ContractRecord]}>();
const tabs=['Карточка договора','Работы с договором','Перечень сооружений'];
const tab=ref(0),error=ref(''),saving=ref(false),confirmClose=ref(false);
type Draft=Omit<ContractInput,'counterpartyId'|'direction'> & {counterpartyId:number|null;direction:ContractInput['direction']|''};
const c=props.contract;
const form=reactive<Draft>({number:c?.number??'',date:c?.date??'',counterpartyId:c?.counterpartyId??null,direction:c?.direction??'',executor:c?.executor??null,start:c?.start??null,finish:c?.finish??null,stages:c?.stages??null,hours:c?.hours??null,amount:c?.amount??null,note:c?.note??null,projectTypeId:c?.projectTypeId??null,supervisorId:c?.supervisorId??null,relatedContractId:c?.relatedContractId??null});
const counterparties=ref([...props.catalog.counterparties]),projectTypes=ref([...props.catalog.projectTypes]);
const adding=ref<'counterparties'|'project-types'|null>(null),newName=ref(''),catalogBusy=ref(false);
const initial=JSON.stringify(form),dirty=computed(()=>JSON.stringify(form)!==initial);
const incomeContracts=computed(()=>props.catalog.incomeContracts.filter(r=>r.id!==c?.id));
const auxiliary=ref<'documents'|'summary'|null>(null);
const statusLabel=computed(()=>!form.date?'Не определён':({PLANNED:'Планируемый',ACTIVE:'Выполняемый',COMPLETED:'Завершённый'}[contractStatus(form.date,form.finish||null)]));
function message(e:any){return e?.data?.data?.message||e?.data?.message||'Не удалось сохранить. Проверьте соединение и обновите данные.';}
function close(){if(saving.value||catalogBusy.value)return;if(dirty.value&&!props.readOnly)confirmClose.value=true;else emit('close');}
async function addName(){
 if(!adding.value||catalogBusy.value||!newName.value.trim())return;catalogBusy.value=true;error.value='';
 try{const item=await $fetch<{id:number;name:string}>('/api/diagnostic/'+adding.value,{method:'POST',headers:{'x-space-diagnostic':'1'},body:{name:newName.value}});
 const list=adding.value==='counterparties'?counterparties:projectTypes;if(!list.value.some(i=>i.id===item.id))list.value.push(item);
 if(adding.value==='counterparties')form.counterpartyId=item.id;else form.projectTypeId=item.id;adding.value=null;newName.value='';
 }catch(e){error.value=message(e);}finally{catalogBusy.value=false;}
}
async function save(){
 if(props.readOnly||saving.value)return;error.value='';
 if(!form.number.trim()||!form.date||!form.counterpartyId||!form.direction){tab.value=0;error.value='Укажите номер, дату заключения, контрагента и тип договора.';return;}
 if(form.finish&&(form.finish<form.date||(form.start&&form.finish<form.start))){tab.value=0;error.value='Окончание работ не может быть раньше заключения договора или начала работ.';return;}
 saving.value=true;
 try{const saved=await $fetch<ContractRecord>('/api/diagnostic/contracts'+(c?'/'+c.id:''),{method:c?'PUT':'POST',headers:{'x-space-diagnostic':'1'},body:{...form,version:c?.version}});emit('save',saved);}
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
 <UModal :open="true" :title="contract?'Карточка договора':'Новый договор'" :ui="{content:'diagnostic-contract-modal w-[96vw] sm:max-w-none h-[90dvh]',body:'contract-modal-body',footer:'contract-modal-footer'}" @update:open="value=>{if(!value)close()}">
  <template #body>
   <div class="contract-editor-tabs" role="tablist" aria-label="Карточка договора"><button v-for="(label,i) in tabs" :id="`contract-editor-tab-${i}`" :key="label" role="tab" :aria-selected="tab===i" :tabindex="tab===i?0:-1" aria-controls="contract-editor-panel" @click="tab=i" @keydown.right.prevent="moveTab($event,i,1)" @keydown.left.prevent="moveTab($event,i,-1)">{{ label }}</button></div>
   <div id="contract-editor-panel" class="contract-editor-panel" role="tabpanel" :aria-labelledby="`contract-editor-tab-${tab}`">
    <form v-show="tab===0" id="diagnostic-contract-form" novalidate @submit.prevent="save">
     <h2>Реквизиты договора <small>· {{ statusLabel }}</small></h2>
     <p v-if="error" role="alert" class="contract-error">{{ error }}</p>
     <fieldset :disabled="readOnly||saving||catalogBusy" class="contract-fields-row">
      <label class="contract-field-wide">Номер договора *<input v-model="form.number" maxlength="150" required /></label>
      <label>Дата заключения договора *<input v-model="form.date" type="date" required /></label>
      <label>Контрагент/Заказчик *<select v-model="form.counterpartyId" required><option :value="null">Выберите контрагента</option><option v-for="item in counterparties" :key="item.id" :value="item.id">{{ item.name }}</option></select><button v-if="canCreate" type="button" @click="adding='counterparties';newName=''">+ Новое название</button></label>
      <label>Исполнитель<select v-model="form.executor"><option :value="null">Не указан</option><option value="ОДИС">ОДИС</option><option value="Автодор Инжиниринг">Автодор Инжиниринг — организация в целом</option></select></label>
      <label>Сумма договора (с НДС), ₽<input v-model="form.amount" type="number" min="0" step="0.01" /></label>
     </fieldset>
     <fieldset :disabled="readOnly||saving||catalogBusy" class="contract-fields-row">
      <label>Начало работ<input v-model="form.start" type="date" /></label>
      <label>Окончание работ<input v-model="form.finish" type="date" /></label>
      <label class="contract-field-wide">Тип проекта<select v-model="form.projectTypeId"><option :value="null">Не выбран</option><option v-for="item in projectTypes" :key="item.id" :value="item.id">{{ item.name }}</option></select><button v-if="canCreate" type="button" @click="adding='project-types';newName=''">+ Новый тип</button></label>
      <label>Руководитель проекта<select v-model="form.supervisorId"><option :value="null">Не назначен</option><option v-if="contract?.supervisorId && !catalog.supervisors.some(u=>u.id===contract?.supervisorId)" :value="contract.supervisorId" disabled>{{ contract.supervisor }} — недоступен, выберите другого</option><option v-for="item in catalog.supervisors" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
      <label>Тип договора *<select v-model="form.direction" required><option value="">Не выбран</option><option value="INCOME">Доходный</option><option value="EXPENSE">Расходный</option><option value="INTERNAL">Внутренний</option></select></label>
     </fieldset>
     <div class="contract-related"><label>Доходный договор<select v-model="form.relatedContractId" :disabled="readOnly||saving"><option :value="null">Не связан</option><option v-for="item in incomeContracts" :key="item.id" :value="item.id">{{ item.number }} · {{ item.counterparty }}</option></select></label><small>Связанный доходный договор. Текущий договор исключён из списка.</small></div>
     <h2>Дополнительная информация по договору</h2>
     <fieldset class="contract-extra" :disabled="readOnly||saving"><label>Количество этапов<input v-model.number="form.stages" type="number" min="0" step="1" /></label><label>Количество сооружений<input :value="contract?.buildings??0" readonly title="Рассчитывается по связанным сооружениям" /></label><label>Количество чел./часов<input v-model="form.hours" type="number" min="0" step="0.01" /></label></fieldset>
     <label class="contract-note">Примечание<textarea v-model="form.note" :disabled="readOnly||saving" maxlength="10000" rows="4" /></label>
     <p v-if="catalog.supervisorWarning" role="status">{{ catalog.supervisorWarning }}</p>
     <div v-if="adding" class="contract-catalog-add"><label>{{ adding==='counterparties'?'Новое название контрагента':'Новый тип проекта' }}<input v-model="newName" maxlength="255" :disabled="catalogBusy" @keydown.enter.prevent="addName" /></label><button type="button" :disabled="catalogBusy||!newName.trim()" @click="addName">Добавить в справочник</button><button type="button" :disabled="catalogBusy" @click="adding=null">Отмена</button></div>
    </form>
    <section v-if="tab===1"><header class="contract-section-head"><h2>Перечень работ с договором</h2><button disabled title="Подключим справочник работ отдельным этапом">Добавить работы</button></header><div class="contract-detail-table"><table><thead><tr><th rowspan="2">#</th><th rowspan="2">Работа</th><th colspan="3">План</th><th colspan="3">Факт</th><th rowspan="2">Примечания</th></tr><tr><th>Дата нач.</th><th>Дата оконч.</th><th>Исполнитель</th><th>Дата нач.</th><th>Дата оконч.</th><th>Исполнитель</th></tr></thead><tbody><tr><td colspan="9">Работы с договором не найдены. Справочник ещё не подключён.</td></tr></tbody></table></div></section>
    <section v-if="tab===2"><header class="contract-section-head"><h2>Перечень сооружений</h2><div><button disabled title="Следующий этап">Добавить сооружения</button><button disabled title="Следующий этап">Добавить работы</button></div></header><div class="contract-detail-table"><table><thead><tr><th>#</th><th>Код ИССО</th><th>Сооружение</th><th>Название автодороги</th><th>Место, км</th><th>Доп. инф.</th><th>Название осн. препятствия</th><th>Район расположения</th></tr></thead><tbody><tr><td colspan="8">Сооружения не найдены. Справочник ещё не подключён.</td></tr></tbody></table></div></section>
   </div>
  </template>
  <template #footer><div class="contract-footer-content"><div class="contract-secondary-actions"><button type="button" @click="auxiliary='documents'"><Icon name="lucide:folder-open" />Документы к договору</button><button type="button" @click="auxiliary='summary'"><Icon name="lucide:table-2" />Сводная таблица работ</button></div><small>{{ readOnly?'Режим просмотра':'Поля со звёздочкой обязательны. Остальные можно заполнить позже.' }}</small><div v-if="confirmClose" class="contract-discard" role="alert">Отменить несохранённые изменения?<button :disabled="saving" @click="emit('close')">Да, закрыть</button><button @click="confirmClose=false">Продолжить</button></div><div class="contract-footer-actions"><button v-if="!readOnly" :disabled="saving||catalogBusy" class="contract-save" type="submit" form="diagnostic-contract-form">{{ saving?'Сохранение…':'Сохранить' }}</button><button @click="close">Отменить</button></div></div></template>
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
