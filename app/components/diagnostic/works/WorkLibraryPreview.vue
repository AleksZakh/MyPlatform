<script setup lang="ts">
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
import {computed,ref} from 'vue';
import {onBeforeRouteLeave} from 'vue-router';
import {useWorkLibraryPreview,workCategories,workGroups,type WorkExample} from '~/composables/diagnostic/useWorkLibraryPreview';
const {rows,search,category,group,filtered,sort,sortKey,descending,save}=useWorkLibraryPreview();
const modules=['Сооружения','Календарный план','Командировки','Планы и отчёты'];
const opened=ref(false),mode=ref<'view'|'edit'|'create'>('create'),error=ref(''),notice=ref('');
const blank=():WorkExample=>({id:0,code:'',name:'',category:category.value||workCategories[0]!,group:group.value||workGroups[0]!,hours:null,criteria:'',note:''});
const draft=ref<WorkExample>(blank());let original='';
const dirty=computed(()=>opened.value&&mode.value!=='view'&&JSON.stringify(draft.value)!==original);
const title=computed(()=>mode.value==='create'?'Новая работа':mode.value==='edit'?'Редактирование работы':'Карточка работы');
const similar=computed(()=>{const q=draft.value.name.trim().toLocaleLowerCase('ru-RU');return q.length<3?[]:rows.value.filter(r=>r.id!==draft.value.id&&r.name.toLocaleLowerCase('ru-RU').includes(q)).slice(0,4)});
function open(row?:WorkExample,copy=false){draft.value=row?{...row,...(copy?{id:0,code:'',name:row.name+' — копия'}:{})}:blank();mode.value=row&&!copy?'view':'create';original=JSON.stringify(draft.value);error.value='';opened.value=true}
function close(){if(dirty.value&&!window.confirm('Закрыть форму без сохранения изменений?'))return;opened.value=false}
function submit(again=false){try{save({...draft.value,hours:draft.value.hours===null||String(draft.value.hours)===''?null:Number(draft.value.hours)});notice.value='Работа сохранена в тестовом списке.';if(again)open();else opened.value=false}catch(e){error.value=e instanceof Error?e.message:'Не удалось сохранить работу.'}}
onBeforeRouteLeave(()=>!dirty.value||window.confirm('Уйти без сохранения изменений формы?'));
</script>
<template>
<section class="work-library">
 <DiagnosticModuleTabs active="works"/>
 <div class="wl-content">
 <p class="wl-demo">Тестовый интерфейс · Примеры работ · Изменения исчезнут при перезагрузке или выходе из раздела. БД не изменяется.</p>
 <div class="wl-tabs"><strong>Список работ</strong><button disabled title="Следующий этап">Наборы работ · позже</button></div>
 <div class="wl-toolbar"><label class="wl-search"><Icon name="lucide:search"/><input v-model="search" aria-label="Поиск работ" type="search" placeholder="Поиск по шифру, названию и описанию"/></label><select v-model="category" aria-label="Категория"><option value="">Все категории</option><option v-for="v in workCategories" :key="v">{{ v }}</option></select><select v-model="group" aria-label="Группа"><option value="">Все группы</option><option v-for="v in workGroups" :key="v">{{ v }}</option></select><button class="wl-primary" @click="open()">+ Работа</button></div>
 <p v-if="notice" role="status" class="wl-notice">{{ notice }} <button aria-label="Закрыть уведомление" @click="notice=''">×</button></p>
 <div class="wl-table" tabindex="0" aria-label="Справочник работ"><table><thead><tr><th v-for="c in ([{key:'code',label:'Шифр'},{key:'name',label:'Наименование'}] as const)" :key="c.key" :aria-sort="sortKey===c.key?(descending?'descending':'ascending'):'none'"><button @click="sort(c.key)">{{ c.label }} {{ sortKey===c.key?(descending?'↓':'↑'):'' }}</button></th><th>Категория</th><th>Группа</th><th :aria-sort="sortKey==='hours'?(descending?'descending':'ascending'):'none'"><button @click="sort('hours')">Трудоёмкость, чел·ч {{ sortKey==='hours'?(descending?'↓':'↑'):'' }}</button></th><th><span class="sr-only">Действия</span></th></tr></thead><tbody><tr v-for="r in filtered" :key="r.id" @click="open(r)"><td>{{ r.code }}</td><td><button class="wl-name" @click.stop="open(r)">{{ r.name }}</button></td><td>{{ r.category }}</td><td>{{ r.group }}</td><td>{{ r.hours===null?'—':r.hours.toLocaleString('ru-RU') }}</td><td><button :aria-label="`Создать копию: ${r.name}`" title="Создать копию" @click.stop="open(r,true)"><Icon name="lucide:copy"/></button></td></tr><tr v-if="!filtered.length"><td colspan="6" class="wl-empty">Работы не найдены. <button @click="search='';category='';group=''">Сбросить фильтры</button></td></tr></tbody></table></div>
 <footer>Показано {{ filtered.length }} из {{ rows.length }} работ</footer>
 </div>
 <USlideover :open="opened" :title="title" description="Карточка типовой работы. Тестовые данные." :ui="{content:'wl-panel w-full sm:max-w-xl',body:'overflow-y-auto',footer:'shrink-0'}" @update:open="v=>{if(!v)close()}">
 <template #body><form id="work-example-form" class="wl-form" @submit.prevent="submit()">
 <p class="wl-info">{{ draft.code?`Шифр: ${draft.code}`:'Тестовый шифр DEMO будет присвоен при сохранении.' }}</p>
 <fieldset :disabled="mode==='view'"><label>Категория<select v-model="draft.category"><option v-for="v in workCategories" :key="v">{{ v }}</option></select></label><label>Группа<select v-model="draft.group"><option v-for="v in workGroups" :key="v">{{ v }}</option></select></label><label>Наименование *<input v-model="draft.name" required maxlength="300" placeholder="Например, Консультация"/></label><p v-if="similar.length&&mode!=='view'" class="wl-info">Похожие работы: {{ similar.map(r=>`${r.code} — ${r.name}`).join('; ') }}</p><label>Плановая трудоёмкость, чел·ч<input v-model="draft.hours" type="number" min="0" step="0.01" placeholder="Не указана"/></label><label>Критерий приёмки<textarea v-model="draft.criteria" rows="3" maxlength="2000" placeholder="Что должно быть выполнено?"/></label><label>Примечание<textarea v-model="draft.note" rows="3" maxlength="4000" placeholder="Дополнительная информация"/></label></fieldset>
 <p v-if="error" role="alert" class="wl-error">{{ error }}</p></form></template>
 <template #footer><div class="wl-footer"><template v-if="mode==='view'"><button @click="open(draft,true)">Создать копию</button><button class="wl-primary" @click="mode='edit'">Редактировать</button></template><template v-else><button @click="close">Отмена</button><button v-if="mode==='create'" @click="submit(true)">Сохранить и ещё</button><button type="submit" form="work-example-form" class="wl-primary">Сохранить</button></template></div></template>
 </USlideover>
</section>
</template>
<style src="~/assets/css/diagnostic-work-library.css"></style>
