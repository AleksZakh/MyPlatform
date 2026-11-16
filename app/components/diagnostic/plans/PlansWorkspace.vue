<script setup lang="ts">
import {ref} from 'vue';
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
const tab=ref<'staff'|'external'>('staff');
const tabs=[{id:'staff',label:'Список работ'},{id:'external',label:'Работы внешних исполнителей'}] as const;
function moveTab(event:KeyboardEvent){tab.value=tab.value==='staff'?'external':'staff';(event.currentTarget as HTMLElement).parentElement?.querySelector<HTMLButtonElement>(`#odis-plans-tab-${tab.value}`)?.focus();}
</script>
<template>
 <section class="odis-plans">
  <DiagnosticModuleTabs active="plans"><label class="opr-search"><Icon name="lucide:search" aria-hidden="true"/><input type="search" placeholder="Поиск работ" aria-label="Поиск работ" disabled title="Поиск станет доступен после подключения списка планов"/></label></DiagnosticModuleTabs>
  <header class="opr-title"><h1>Планы и отчёты</h1></header>
  <div class="opr-layout">
   <nav class="opr-sections" aria-label="Подразделы планов и отчётов">
    <button type="button" aria-current="page"><Icon name="lucide:calendar-days" aria-hidden="true"/>Планы</button>
    <button type="button" disabled title="Раздел будет доступен позже"><Icon name="lucide:file-chart-column" aria-hidden="true"/>Отчёты</button>
    <button type="button" disabled title="Раздел будет доступен позже"><Icon name="lucide:chart-no-axes-combined" aria-hidden="true"/>Ход работ</button>
   </nav>
   <div class="opr-content">
    <div class="opr-topline">
     <div class="opr-tabs" role="tablist" aria-label="Планы работ">
      <button v-for="item in tabs" :id="`odis-plans-tab-${item.id}`" :key="item.id" type="button" role="tab" :aria-selected="tab===item.id" aria-controls="odis-plans-panel" :tabindex="tab===item.id?0:-1" @click="tab=item.id" @keydown.right.prevent="moveTab" @keydown.left.prevent="moveTab">{{item.label}}</button>
     </div>
     <button class="opr-button opr-plan-button" type="button" disabled title="Планирование работ станет доступно на следующем этапе"><Icon name="lucide:calendar-plus" aria-hidden="true"/>Запланировать работы</button>
    </div>
    <div id="odis-plans-panel" class="opr-panel" role="tabpanel" :aria-labelledby="`odis-plans-tab-${tab}`" tabindex="0">
     <div class="opr-toolbar">
      <div class="opr-list-heading"><h2>{{tab==='staff'?'Перечень работ':'Работы внешних исполнителей'}}</h2><button class="opr-button opr-filter" type="button" disabled aria-label="Фильтры списка работ" title="Фильтры станут доступны после подключения списка планов"><Icon name="lucide:filter" aria-hidden="true"/></button></div>
      <label class="opr-employee"><span>{{tab==='staff'?'Сотрудник':'Исполнитель'}}</span><select disabled :aria-label="tab==='staff'?'Сотрудник':'Внешний исполнитель'"><option>Не выбран</option></select></label>
      <div class="opr-completion">
       <span>Факт. даты</span>
       <div class="opr-date"><input type="text" placeholder="дд.мм.гггг" aria-label="Фактическая дата начала" disabled/><Icon name="lucide:calendar-days" aria-hidden="true"/></div>
       <div class="opr-date"><input type="text" placeholder="дд.мм.гггг" aria-label="Фактическая дата окончания" disabled/><Icon name="lucide:calendar-days" aria-hidden="true"/></div>
       <label class="opr-hours">Затр. время, чел·ч<input type="text" inputmode="decimal" aria-label="Фактические человеко-часы" disabled/></label>
       <button class="opr-button" type="button" disabled title="Завершение работ станет доступно на следующем этапе"><Icon name="lucide:clipboard-check" aria-hidden="true"/>Завершить</button>
      </div>
     </div>
     <div class="opr-table-scroll" role="region" aria-label="Таблица планов" tabindex="0">
      <table>
       <caption class="opr-sr-only">{{tab==='staff'?'Планы сотрудников':'Планы внешних исполнителей'}}</caption>
       <colgroup><col class="opr-col-marker"/><col class="opr-col-person"/><col class="opr-col-contract"/><col class="opr-col-type"/><col class="opr-col-code"/><col class="opr-col-location"/><col class="opr-col-work"/><col class="opr-col-time"/><col class="opr-col-period"/><col class="opr-col-note"/><col class="opr-col-marker"/></colgroup>
       <thead><tr><th scope="col">Р/Ц</th><th scope="col">{{tab==='staff'?'ФИО':'Исполнитель'}}</th><th scope="col">№ договора</th><th scope="col">Тип</th><th scope="col">Код ИССО</th><th scope="col">км+м</th><th scope="col">Название работ</th><th scope="col" aria-label="Трудоёмкость, человеко-часы" title="Трудоёмкость, чел·ч"><Icon name="lucide:timer" aria-hidden="true"/></th><th scope="col">Срок выполнения</th><th scope="col">Примечания</th><th scope="col" aria-label="Отметка" title="Отметка"><svg class="opr-marker-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><path d="m12 3 9 9-9 9-9-9 9-9Z"/><path d="M12 8v5m0 3h.01"/></svg></th></tr></thead>
       <tbody><tr><td colspan="11" class="opr-empty"><p>Список планов пока недоступен.</p><span>Планирование и завершение работ будут доступны позже.</span></td></tr></tbody>
      </table>
     </div>
    </div>
   </div>
  </div>
 </section>
</template>
<style src="~/assets/css/diagnostic-plans.css"></style>
