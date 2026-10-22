<script setup lang="ts">
import ContractEditor from './ContractEditor.vue';
import { ref } from 'vue';
import { useContractsPreview } from '~/composables/diagnostic/useContractsPreview';
import { contractStatuses,directionLabels,type ContractRecord as ContractPreview } from '~~/shared/types/diagnostic-contracts';
const {catalog,rights,loading,error,trash,load,message,contracts,savePreview,status,search,selectedId,selected,sortKey,descending,rows,counts,formatDate,money,sort,reset}=useContractsPreview();
const modules=['Договоры','Библиотека работ','Сооружения','Календарный план','Командировки','Планы и отчёты'];
const notice=ref('');
const editorOpen=ref(false),editing=ref<ContractPreview|null>(null);
function create(){editing.value=null;editorOpen.value=true;}
function saved(row:ContractPreview){savePreview(row);status.value=row.status;search.value='';editorOpen.value=false;notice.value='Договор сохранён.';void load();}
const columns:{key:keyof ContractPreview;label:string}[]=[{key:'direction',label:'Д/Р'},{key:'number',label:'Номер дог-ра'},{key:'date',label:'Дата закл. дог.'},{key:'counterparty',label:'Контрагент'},{key:'executor',label:'Исполнитель'},{key:'buildings',label:'Кол-во соор-ий'},{key:'finish',label:'Окончание работ'},{key:'amount',label:'Стоимость с НДС, ₽'}];
function moveTab(event:KeyboardEvent,index:number,step:number){const next=(index+step+3)%3;status.value=contractStatuses[next]!.key;const buttons=(event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]');buttons?.[next]?.focus();}
async function open(){if(!selected.value||trash.value)return;try{editing.value=await $fetch<ContractPreview>('/api/diagnostic/contracts/'+selected.value.id);editorOpen.value=true;}catch(e){error.value=message(e);}}
async function remove(){const row=selected.value;if(!row||!rights.value.DELETE)return;if(!window.confirm(trash.value?'Восстановить договор '+row.number+'?':'Переместить договор '+row.number+' в корзину?'))return;try{await $fetch('/api/diagnostic/contracts/'+row.id+(trash.value?'/restore':''),{method:trash.value?'POST':'DELETE',headers:{'x-space-diagnostic':'1'},body:{version:row.version}});await load();}catch(e){error.value=message(e);}}
</script>
<template>
 <section class="diagnostic-contracts">
  <nav class="diagnostic-modules" aria-label="Модули диагностики">
   <div class="diagnostic-module-links"><button v-for="module in modules" :key="module" :aria-current="module==='Договоры'?'page':undefined" @click="notice=module==='Договоры'?'':`Раздел «${module}» будет перенесён на следующем этапе.`">{{ module }}</button></div>
   <UDropdownMenu :items="[{label:'Сбросить поиск и сортировку',onSelect:reset}]"><button class="diagnostic-quick">Быстрые действия <Icon name="lucide:chevron-down" /></button></UDropdownMenu>
   <label class="diagnostic-search"><span class="sr-only">Поиск договоров</span><input v-model="search" type="search" placeholder="Поиск договоров"/><Icon name="lucide:search" aria-hidden="true"/></label>
  </nav>
  <div class="diagnostic-content">
   <p v-if="loading" role="status">Загрузка договоров…</p><p v-if="error" class="contract-error" role="alert">{{ error }} <button @click="load">Повторить</button></p><p v-if="trash">Корзина договоров</p>
   <p v-if="notice" class="diagnostic-notice" role="status">{{ notice }} <button aria-label="Закрыть сообщение" @click="notice=''">×</button></p>
   <div class="diagnostic-register">
    <div class="diagnostic-register-main">
     <div v-if="!trash" class="diagnostic-status-tabs" role="tablist" aria-label="Статус договоров"><button v-for="(tab,i) in contractStatuses" :id="`contract-tab-${tab.key}`" :key="tab.key" role="tab" :aria-selected="status===tab.key" aria-controls="contract-panel" :tabindex="status===tab.key?0:-1" @click="status=tab.key" @keydown.right.prevent="moveTab($event,i,1)" @keydown.left.prevent="moveTab($event,i,-1)">{{ tab.label }} <small>{{ counts[tab.key] }}</small></button></div>
     <div id="contract-panel" role="tabpanel" :aria-labelledby="`contract-tab-${status}`" class="diagnostic-table-scroll" tabindex="0">
      <table class="space-data-table"><caption class="sr-only">Договоры — {{ contractStatuses.find(t=>t.key===status)?.label }}</caption><thead><tr><th v-for="column in columns" :key="column.key" scope="col" :aria-sort="sortKey===column.key?(descending?'descending':'ascending'):'none'"><button @click="sort(column.key)">{{ column.label }} <span v-if="sortKey===column.key" aria-hidden="true">{{ descending?'↓':'↑' }}</span></button></th></tr></thead>
       <tbody><tr v-for="row in rows" :key="row.id" :class="{'is-selected':selectedId===row.id}" @click="selectedId=row.id" @dblclick="selectedId=row.id;open()"><td><span :class="row.direction==='INCOME'?'diagnostic-income':'diagnostic-expense'">{{ directionLabels[row.direction] }}</span></td><td><button :aria-pressed="selectedId===row.id" @click.stop="selectedId=row.id">{{ row.number }}</button></td><td>{{ formatDate(row.date) }}</td><td>{{ row.counterparty }}</td><td>{{ row.executor }}</td><td class="numeric">{{ row.buildings }}</td><td>{{ formatDate(row.finish) }}</td><td class="numeric">{{ money(row.amount) }}</td></tr>
       <tr v-if="!rows.length"><td colspan="8" class="diagnostic-empty">Договоры не найдены. <button @click="search=''">Сбросить поиск</button></td></tr></tbody>
      </table>
     </div>
     <footer class="diagnostic-summary">Показано: {{ rows.length }} <span v-if="selected">· Выбран: {{ selected.number }}</span></footer>
    </div>
    <aside class="diagnostic-actions" aria-label="Действия с договором"><button :disabled="loading||!rights.CREATE||trash" @click="create"><Icon name="lucide:file-plus-2"/>Новый договор</button><button :disabled="loading||!selected||trash" @click="open"><Icon name="lucide:pencil"/>Открыть договор</button><button :disabled="loading||!selected||!rights.DELETE" @click="remove"><Icon name="lucide:trash-2"/>{{ trash?'Восстановить':'Удалить договор' }}</button><button :disabled="loading" @click="load">Обновить</button><button :disabled="loading" @click="trash=!trash">{{ trash?'Вернуться к договорам':'Корзина' }}</button></aside>
   </div>
  </div>
  <ContractEditor v-if="editorOpen" :contract="editing" :catalog="catalog" :read-only="editing ? !rights.UPDATE : !rights.CREATE" :can-create="rights.CREATE" @close="editorOpen=false" @save="saved"/>
 </section>
</template>
<style src="~/assets/css/diagnostic-contracts.css"></style>
