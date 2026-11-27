<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
import StructureRemovalDialog from './StructureRemovalDialog.vue';
import StructureEditor from './StructureEditor.vue';
import StructureFields from './StructureFields.vue';
import StructuresImportPreview from './StructuresImportPreview.vue';
import { useStructures,structureRequestError } from '~/composables/diagnostic/useStructures';
import type {StructureListRow,StructureRemovalMode,SavedStructure} from '~~/shared/types/diagnostic-structures-api';
import { structureColumns, structureGroups, type StructureRecord } from '~~/shared/types/diagnostic-structures';
import '~/assets/css/diagnostic-structures.css';
const {filters,sortKey,descending,page,pageSize,pageCount,pageRows,selectedId,selected,options,rangeError,matched,total,activeFilters,loading,loadError,catalogError,detailLoading,detailError,sort,reset,refresh,retryDetail}=useStructures();
const managementSearch=ref(''),regionSearch=ref(''),detailTab=ref('main'),detailsOpen=ref(true),filtersOpen=ref(false),importOpen=ref(false),card=ref<{id?:number;edit?:boolean}|null>(null),notice=ref('');
const managementOptions=computed(()=>options.value.management.filter(value=>value.toLocaleLowerCase('ru-RU').includes(managementSearch.value.trim().toLocaleLowerCase('ru-RU'))));
const regionOptions=computed(()=>options.value.regions.filter(value=>value.toLocaleLowerCase('ru-RU').includes(regionSearch.value.trim().toLocaleLowerCase('ru-RU'))));
const canEdit=ref(false),canCreate=ref(false);
onMounted(async()=>{
 const grant=async(action:string)=>(await $fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.structures',action}})).allowed;
 const values=await Promise.allSettled([grant('CREATE'),grant('UPDATE')]);canCreate.value=values[0]?.status==='fulfilled'&&values[0].value;canEdit.value=values[1]?.status==='fulfilled'&&values[1].value;
});
async function saved(row:SavedStructure){
 await refresh();
 if(pageRows.value.some(item=>item.id===row.id))selectedId.value=row.id;
}
function shortRoad(name:string){return name.match(/^[А-ЯA-Z]+[-–]\d+(?:\s+[«"][^«»"]+[»"])?/iu)?.[0] || name;}
const canRemove=ref(false), removal=ref<StructureListRow|null>(null);
onMounted(async()=>{
  try {
    const permission=await $fetch<{allowed:boolean}>('/api/access/check',{query:{resource:'diagnostic.structures',action:'DELETE'}});
    canRemove.value=permission.allowed;
  } catch {canRemove.value=false;}
});
async function removed(mode:StructureRemovalMode){
  const code=removal.value?.issoCode;
  removal.value=null;
  card.value=null;
  notice.value='Сооружение '+code+(mode==='decommission'?' выведено из эксплуатации.':' удалено.');
  await refresh();
}

const first=computed(()=>pageRows.value.length?(page.value-1)*pageSize.value+1:0);
const last=computed(()=>pageRows.value.length?first.value+pageRows.value.length-1:0);
function resetFilters(){reset();managementSearch.value='';regionSearch.value='';}
function openCard(row:StructureListRow){selectedId.value=row.id;card.value={id:Number(row.id)};}
const dateLabel=(value:string)=>new Date(value).toLocaleString('ru-RU');
function moveDetailTab(event:KeyboardEvent,index:number){
  let next=index;
  if(event.key==='ArrowRight')next=(index+1)%structureGroups.length;
  else if(event.key==='ArrowLeft')next=(index+structureGroups.length-1)%structureGroups.length;
  else if(event.key==='Home')next=0;
  else if(event.key==='End')next=structureGroups.length-1;
  else return;
  event.preventDefault();detailTab.value=structureGroups[next]!.key;
  (event.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus();
}
</script>
<template>
<section class="structures-workspace">
  <DiagnosticModuleTabs active="structures"/>
  <div class="st-page">
    <header class="st-heading"><h1>Сооружения</h1><div class="st-heading-actions"><button v-if="canCreate" @click="card={}"><Icon name="lucide:plus"/>Создать сооружение</button><button class="st-filters-toggle" :aria-expanded="filtersOpen" aria-controls="st-filters" @click="filtersOpen=!filtersOpen"><Icon name="lucide:sliders-horizontal"/>Фильтры{{ activeFilters?' ('+activeFilters+')':'' }}</button><button :disabled="loading" @click="refresh"><Icon name="lucide:refresh-cw"/>Обновить</button><button class="st-primary" :disabled="loading||!!loadError" @click="importOpen=true"><Icon name="lucide:file-up"/>Импорт Excel</button></div></header>
    <div v-if="notice" class="st-notice" role="status"><span>{{ notice }}</span><button aria-label="Закрыть уведомление" @click="notice=''">×</button></div>
    <div v-if="loadError||catalogError" class="st-notice st-error" role="alert"><span>{{ loadError||catalogError }}</span><button :disabled="loading" @click="refresh">Повторить</button></div>
    <div class="st-layout">
      <aside id="st-filters" class="st-filters" :class="{'st-filters-open':filtersOpen}" aria-label="Фильтры сооружений">
        <div class="st-filter-heading"><h2>Поиск и фильтры</h2><button type="button" class="st-link" @click="resetFilters">Сбросить</button></div>
        <label>Поиск<input v-model="filters.search" type="search" placeholder="Код, дорога, идентификатор…"/></label>
        <label>Автодорога<select v-model="filters.road"><option value="">Все автодороги</option><option v-for="road in options.roads" :key="road" :value="road">{{ road }}</option></select></label>
        <label>Код ИССО<input v-model="filters.code" type="search" placeholder="Полный код или часть"/></label>
        <fieldset class="st-range"><legend>Расположение, км+м</legend><div><label>От<input v-model="filters.locationFrom" placeholder="16+000" :aria-invalid="!!rangeError" :aria-describedby="rangeError?'st-range-error':undefined"/></label><label>До<input v-model="filters.locationTo" placeholder="58+999" :aria-invalid="!!rangeError" :aria-describedby="rangeError?'st-range-error':undefined"/></label></div><p v-if="rangeError" id="st-range-error" class="st-filter-error" role="alert">{{ rangeError }}</p></fieldset>
        <label>Сооружение<select v-model="filters.kind"><option value="">Все виды</option><option v-for="kind in options.kinds" :key="kind">{{ kind }}</option></select></label>
        <label>Тип ИССО<select v-model="filters.issoType"><option value="">Все типы</option><option v-for="kind in options.types" :key="kind">{{ kind }}</option></select></label>
        <fieldset class="st-check-group"><legend>Управления / рег. центры</legend><button class="st-link" :aria-pressed="!filters.management.length" @click="filters.management=[]">Все управления</button><input v-model="managementSearch" type="search" aria-label="Найти управление в фильтре" placeholder="Найти управление"/><div class="st-check-list"><label v-for="name in managementOptions" :key="name"><input v-model="filters.management" type="checkbox" :value="name"/><span>{{ name }}</span></label><p v-if="!managementOptions.length" class="st-muted">Не найдено</p></div></fieldset>
        <fieldset class="st-check-group"><legend>Регионы</legend><button class="st-link" :aria-pressed="!filters.regions.length" @click="filters.regions=[]">Все регионы</button><input v-model="regionSearch" type="search" aria-label="Найти регион в фильтре" placeholder="Найти регион"/><div class="st-check-list"><label v-for="name in regionOptions" :key="name"><input v-model="filters.regions" type="checkbox" :value="name"/><span>{{ name }}</span></label><p v-if="!regionOptions.length" class="st-muted">Не найдено</p></div></fieldset>
        <label class="st-checkbox"><input v-model="filters.withWorks" type="checkbox"/>С запланированными работами</label>
        <p class="st-muted">Нет отмеченных значений — показаны все. Поиск и фильтры применяются совместно.</p>
      </aside>
      <div class="st-results">
        <section class="st-register" aria-label="Список сооружений" :aria-busy="loading">
          <header><p role="status"><template v-if="loading">Загрузка сооружений…</template><template v-else-if="loadError">Список не загружен</template><template v-else>Найдено <strong>{{ matched }}</strong> из {{ total }}</template></p><label>На странице<select v-model.number="pageSize"><option :value="25">25</option><option :value="50">50</option><option :value="100">100</option></select></label></header>
          <div class="st-table-scroll" tabindex="0" aria-label="Таблица сооружений">
            <table><caption class="sr-only">Справочник сооружений. Выберите код ИССО для просмотра сведений.</caption><thead><tr><th scope="col" class="st-number">№</th><th v-for="column in structureColumns" :key="column.key" scope="col" :aria-sort="sortKey===column.key?(descending?'descending':'ascending'):'none'"><button @click="sort(column.key)">{{ column.label }}<Icon :name="sortKey===column.key?(descending?'lucide:arrow-down':'lucide:arrow-up'):'lucide:arrow-up-down'" aria-hidden="true"/></button></th></tr></thead>
            <tbody><tr v-for="(row,index) in pageRows" :key="row.id" :class="{'is-selected':row.id===selectedId}" @click="selectedId=row.id" @dblclick="openCard(row)"><td class="st-number">{{ first+index }}</td><td class="st-road" :title="row.roadName">{{ row.roadName }}</td><td>{{ row.structureName }}<small :title="row.additionalId">{{ row.additionalId || row.issoType }}</small></td><td><button class="st-code" :aria-pressed="selectedId===row.id" :aria-label="`Показать сооружение ${row.issoCode}`" @click.stop="selectedId=row.id">{{ row.issoCode || 'Без ИССО' }}</button></td><td class="st-location">{{ row.location }}</td><td>{{ row.region || '—' }}</td><td>{{ row.management || '—' }}</td></tr>
            <tr v-if="!pageRows.length"><td colspan="7" class="st-empty"><Icon name="lucide:search-x"/><p>{{ loading?'Загрузка сооружений…':loadError?'Не удалось загрузить список.':rangeError?'Исправьте диапазон расположения в фильтрах.':total===0?'В справочнике пока нет сооружений.':'По выбранным условиям сооружения не найдены.' }}</p><button v-if="!loading&&!loadError" @click="resetFilters">Сбросить фильтры</button></td></tr></tbody></table>
          </div>
          <footer><span>{{ first }}–{{ last }} из {{ matched }}</span><nav aria-label="Страницы сооружений"><button :disabled="loading||page<=1" aria-label="Первая страница" @click="page=1">«</button><button :disabled="loading||page<=1" aria-label="Предыдущая страница" @click="page--">‹</button><label>Страница<select v-model.number="page" :disabled="loading"><option v-for="number in pageCount" :key="number" :value="number">{{ number }}</option></select><span>из {{ pageCount }}</span></label><button :disabled="loading||page>=pageCount" aria-label="Следующая страница" @click="page++">›</button><button :disabled="loading||page>=pageCount" aria-label="Последняя страница" @click="page=pageCount">»</button></nav></footer>
        </section>
        <section class="st-details" :class="{'st-details-collapsed':!detailsOpen}" aria-label="Сведения о выбранном сооружении">
          <header><button class="st-detail-toggle" :aria-expanded="detailsOpen" aria-controls="st-detail-body" @click="detailsOpen=!detailsOpen"><Icon :name="detailsOpen?'lucide:chevron-down':'lucide:chevron-up'"/><strong>{{ selected?'Сооружение '+(selected.issoCode || 'без ИССО'):'О сооружении' }}</strong><span v-if="selected">{{ selected.location }} (км+м) · <span :title="selected.roadName">а/д {{shortRoad(selected.roadName)}}</span></span></button><div v-if="selected" class="st-selection-actions"><button v-if="canEdit" @click="card={id:Number(selected.id),edit:true}">Редактировать</button><button v-if="canRemove" type="button" @click="removal=selected"><Icon name="lucide:trash-2"/>Удалить</button><button @click="openCard(selected)"><Icon name="lucide:expand"/>Карточка</button></div></header>
          <div v-if="detailsOpen" id="st-detail-body" class="st-detail-body" :aria-busy="detailLoading"><p v-if="detailLoading" role="status">Загрузка карточки…</p><div v-else-if="detailError" class="st-error" role="alert">{{ detailError }} <button @click="retryDetail">Повторить</button></div><template v-else-if="selected">
            <div class="st-detail-tabs" role="tablist" aria-label="Сведения о сооружении"><button v-for="(group,index) in structureGroups" :id="'st-tab-'+group.key" :key="group.key" role="tab" :aria-selected="detailTab===group.key" :tabindex="detailTab===group.key?0:-1" aria-controls="st-tab-panel" @click="detailTab=group.key" @keydown="moveDetailTab($event,index)">{{ group.label }}</button></div>
            <div id="st-tab-panel" role="tabpanel" :aria-labelledby="'st-tab-'+detailTab" tabindex="0"><StructureFields :record="selected" :contracts="selected.contracts" :group="detailTab" legacy/><small class="st-source"><span v-if="selected.importedAt">Импорт · {{selected.importers.join(', ')}} · {{dateLabel(selected.importedAt)}} · {{selected.sourceFile}}<br/></span>Изменено · {{selected.editor}} · {{dateLabel(selected.updatedAt)}}</small><p v-if="detailTab==='work'" class="st-source">Договоры и исполнители приведены из старой базы. Их перечни не задают соответствие исполнителей отдельным договорам.</p></div>
          </template><p v-else class="st-muted">Выберите сооружение в таблице.</p></div>
        </section>
      </div>
    </div>
  </div>
  <StructureEditor v-if="card" :key="card.id ?? 'new'" :structure-id="card.id" :start-editing="card.edit" :roads="options.roads"
    :allow-remove="canRemove" @close="card=null" @saved="saved" @remove="row=>removal=row"/>
  <StructureRemovalDialog v-if="removal" :key="removal.id" :structure="removal" @close="removal=null" @removed="removed"/>
  <StructuresImportPreview v-model:open="importOpen" @imported="refresh"/>
</section>
</template>

<style scoped>
.st-selection-actions{display:flex;align-items:center;gap:8px}
</style>
