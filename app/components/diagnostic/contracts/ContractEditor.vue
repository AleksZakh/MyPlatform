<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import type { ContractPreview } from '~/utils/diagnostic/contracts-demo';
const props=defineProps<{contract:ContractPreview|null;contracts:ContractPreview[]}>();
const emit=defineEmits<{close:[];save:[ContractPreview]}>();
const tabs=['Карточка договора','Работы с договором','Перечень сооружений'];
const tab=ref(0),error=ref('');
const form=reactive<ContractPreview>({...props.contract,id:props.contract?.id||0,number:props.contract?.number||'',date:props.contract?.date||'',counterparty:props.contract?.counterparty||'',executor:props.contract?.executor||'',buildings:props.contract?.buildings||0,finish:props.contract?.finish||'',amount:props.contract?.amount||0,direction:props.contract?.direction||'INCOME',status:props.contract?.status||'PLANNED',start:props.contract?.start||'',projectType:props.contract?.projectType||'',supervisor:props.contract?.supervisor||'',stages:props.contract?.stages||1,hours:props.contract?.hours||0});
const projectTypes=['Плановая диагностика','Приёмочная диагностика (новая стройка)','Приёмочная диагностика (ремонт)','Специальное обследование','Предпроектное обследование','Мониторинг','Сопровождение АИС ИССО-Н','Внутренний проект'];
const incomeContracts=computed(()=>props.contracts.filter(c=>c.direction==='INCOME'&&c.id!==form.id));
const auxiliary=ref<'documents'|'summary'|null>(null);
const summaryColumns=[
 ['305','АИС конструктив + проезжая часть + GPS'],['306','АИС маломоб.+ПОС'],
 ['307','АИС гарантийный паспорт'],['308','АИС ведомость дефектов'],
 ['309','АИС стройподъёмы'],['310','АИС прочность бетона'],['311','АИС Фото'],
 ['312','АИС Чертежи'],['313','АИС Расчёты ГП'],['314','АИС Книга ИССО'],
 ['315','АИС Видео'],['316','АИС Оценка состояния'],['317','АИС Финиш'],
 ['318','АИС Проверка'],['320','АИС Проверка класса ГП']
];
form.relatedContractId=props.contract?.relatedContractId??null;
const initial=JSON.stringify(form);
const dirty=computed(()=>JSON.stringify(form)!==initial);
const confirmClose=ref(false);
function close(){if(dirty.value)confirmClose.value=true;else emit('close');}
function save(){error.value='';if(form.relatedContractId!=null&&!incomeContracts.value.some(c=>c.id===form.relatedContractId)){tab.value=0;error.value='Выберите доступный доходный договор или очистите связь.';return;}if(!form.number.trim()||!form.date||!form.counterparty.trim()){tab.value=0;error.value='Укажите номер, дату договора и контрагента.';return;}if(form.start&&form.finish&&form.start>form.finish){tab.value=0;error.value='Окончание работ не может быть раньше начала.';return;}if([form.amount,form.buildings,form.stages,form.hours].some(v=>typeof v!=='number'||!Number.isFinite(v)||v<0)||!Number.isInteger(form.stages)||!Number.isInteger(form.buildings)){tab.value=0;error.value='Проверьте числа: они должны быть неотрицательными, количество этапов и сооружений — целым.';return;}emit('save',{...form,number:form.number.trim(),counterparty:form.counterparty.trim()});}
function moveTab(event:KeyboardEvent,index:number,step:number){tab.value=(index+step+3)%3;const buttons=(event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]');buttons?.[tab.value]?.focus();}
</script>
<template>
 <UModal :open="true" :title="contract?'Карточка договора':'Новый договор'" :ui="{content:'diagnostic-contract-modal w-[96vw] sm:max-w-none h-[90dvh]',body:'contract-modal-body',footer:'contract-modal-footer'}" @update:open="value=>{if(!value)close()}">
  <template #body>
   <div class="contract-editor-tabs" role="tablist" aria-label="Карточка договора"><button v-for="(label,i) in tabs" :id="`contract-editor-tab-${i}`" :key="label" role="tab" :aria-selected="tab===i" :tabindex="tab===i?0:-1" aria-controls="contract-editor-panel" @click="tab=i" @keydown.right.prevent="moveTab($event,i,1)" @keydown.left.prevent="moveTab($event,i,-1)">{{ label }}</button></div>
   <div id="contract-editor-panel" class="contract-editor-panel" role="tabpanel" :aria-labelledby="`contract-editor-tab-${tab}`">
    <form v-show="tab===0" id="diagnostic-contract-form" novalidate @submit.prevent="save">
     <h2>Реквизиты договора</h2>
     <p v-if="error" role="alert" class="contract-error">{{ error }}</p>
     <div class="contract-fields-row">
      <label class="contract-field-wide">Номер договора *<input v-model="form.number" maxlength="150" required /></label>
      <label>Дата заключения договора *<input v-model="form.date" type="date" required /></label>
      <label>Контрагент/Заказчик *<input v-model="form.counterparty" maxlength="255" required /></label>
      <label>Исполнитель<input v-model="form.executor" maxlength="255" /></label>
      <label>Сумма договора (с НДС), ₽<input v-model.number="form.amount" type="number" min="0" step="0.01" /></label>
     </div>
     <div class="contract-fields-row">
      <label>Начало работ<input v-model="form.start" type="date" /></label>
      <label>Окончание работ<input v-model="form.finish" type="date" /></label>
      <label class="contract-field-wide">Тип проекта<select v-model="form.projectType"><option value="">Не выбран</option><option v-if="form.projectType && !projectTypes.includes(form.projectType)" :value="form.projectType">{{ form.projectType }}</option><option v-for="type in projectTypes" :key="type" :value="type">{{ type }}</option></select></label>
      <label>Руководитель проекта<input v-model="form.supervisor" maxlength="255" /></label>
      <label>Тип договора<select v-model="form.direction"><option value="INCOME">Доходный</option><option value="EXPENSE">Расходный</option></select></label>
     </div>
     <div class="contract-related"><label>Доходный договор<select v-model="form.relatedContractId"><option :value="null">Не связан</option><option v-for="item in incomeContracts" :key="item.id" :value="item.id">{{ item.number }} · {{ item.counterparty }}</option></select></label><small>Связанный доходный договор. Текущий договор исключён из списка.</small></div>
     <h2>Дополнительная информация по договору</h2>
     <div class="contract-extra"><label>Количество этапов<input v-model.number="form.stages" type="number" min="0" step="1" /></label><label>Количество сооружений<input v-model.number="form.buildings" type="number" min="0" step="1" /></label><label>Количество чел./часов<input v-model.number="form.hours" type="number" min="0" step="0.01" /></label></div>
    </form>
    <section v-if="tab===1"><header class="contract-section-head"><h2>Перечень работ с договором</h2><button disabled title="Подключим справочник работ отдельным этапом">Добавить работы</button></header><div class="contract-detail-table"><table><thead><tr><th rowspan="2">#</th><th rowspan="2">Работа</th><th colspan="3">План</th><th colspan="3">Факт</th><th rowspan="2">Примечания</th></tr><tr><th>Дата нач.</th><th>Дата оконч.</th><th>Исполнитель</th><th>Дата нач.</th><th>Дата оконч.</th><th>Исполнитель</th></tr></thead><tbody><tr><td colspan="9">Работы с договором не найдены. Справочник ещё не подключён.</td></tr></tbody></table></div></section>
    <section v-if="tab===2"><header class="contract-section-head"><h2>Перечень сооружений</h2><div><button disabled title="Следующий этап">Добавить сооружения</button><button disabled title="Следующий этап">Добавить работы</button></div></header><div class="contract-detail-table"><table><thead><tr><th>#</th><th>Код ИССО</th><th>Сооружение</th><th>Название автодороги</th><th>Место, км</th><th>Доп. инф.</th><th>Название осн. препятствия</th><th>Район расположения</th></tr></thead><tbody><tr><td colspan="8">Сооружения не найдены. Справочник ещё не подключён.</td></tr></tbody></table></div></section>
   </div>
  </template>
  <template #footer><div class="contract-footer-content"><div class="contract-secondary-actions"><button type="button" @click="auxiliary='documents'"><Icon name="lucide:folder-open" />Документы к договору</button><button type="button" @click="auxiliary='summary'"><Icon name="lucide:table-2" />Сводная таблица работ</button></div><small>Макет: сохранение только до обновления страницы, без записи в БД.</small><div v-if="confirmClose" class="contract-discard" role="alert">Отменить несохранённые изменения?<button @click="emit('close')">Да, закрыть</button><button @click="confirmClose=false">Продолжить</button></div><div class="contract-footer-actions"><button class="contract-save" type="submit" form="diagnostic-contract-form">Сохранить</button><button @click="close">Отменить</button></div></div></template>
 </UModal>
 <UModal v-if="auxiliary" :open="true" :title="auxiliary==='documents'?'Документы к договору':'Сводная таблица работ'" :description="form.number || 'Новый договор'" :ui="{content:'diagnostic-contract-modal w-[96vw] sm:max-w-none h-[90dvh]',body:'contract-modal-body',footer:'contract-modal-footer'}" @update:open="value=>{if(!value)auxiliary=null}">
  <template #body>
   <section v-if="auxiliary==='documents'" class="contract-editor-panel">
    <p>Хранилище документов договора ещё не подключено. Загрузка и просмотр файлов появятся после подключения сохранения договоров.</p>
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
