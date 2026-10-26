<script setup lang="ts">
import DiagnosticModuleTabs from '../DiagnosticModuleTabs.vue';
import { computed, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import { useWorkLibrary, workError } from '~/composables/diagnostic/useWorkLibrary';
import type { WorkRecord, WorkInput } from '~~/shared/types/diagnostic-works';
const { rows, catalog, permissions, loading, busy, loadError, search, category, group, filtered, filterCategories,
  sortKey, descending, sort, refresh, save, addCategory, remove } = useWorkLibrary();
type Draft = WorkInput & { id: number; version: number; code: string };
const opened = ref(false), mode = ref<'view'|'edit'|'create'>('create'), error = ref(''), notice = ref('');
const newCategory = ref(''), creatingCategory = ref(false), deleting = ref(false), deleteReason = ref('');
const blank = (): Draft => ({ id: 0, version: 0, code: '', name: '', groupId: group.value || catalog.value.groups[0]?.id || 0,
  categoryId: 0, hours: '', criteria: '', note: '' });
const draft = ref<Draft>(blank()); let original = '';
const selected = ref<WorkRecord | null>(null);
const dirty = computed(() => opened.value && (newCategory.value.trim() !== '' || deleteReason.value.trim() !== '' ||
  (mode.value !== 'view' && JSON.stringify(draft.value) !== original)));
const title = computed(() => mode.value === 'create' ? 'Новая работа' : mode.value === 'edit' ? 'Редактирование работы' : 'Карточка работы');
const categories = computed(() => catalog.value.categories.filter(c => c.groupId === draft.value.groupId));
const similar = computed(() => { const q = draft.value.name.trim().toLocaleLowerCase('ru-RU');
  return q.length < 3 ? [] : rows.value.filter(r => r.id !== draft.value.id && r.name.toLocaleLowerCase('ru-RU').includes(q)).slice(0, 4); });
function open(row?: WorkRecord, copy = false) {
  selected.value = row && !copy ? row : null;
  draft.value = row ? { ...row, ...(copy ? { id: 0, version: 0, code: '', name: row.name + ' — копия' } : {}) } : blank();
  mode.value = row && !copy ? 'view' : 'create'; original = JSON.stringify(draft.value);
  error.value = ''; creatingCategory.value = false; newCategory.value = ''; deleting.value = false; deleteReason.value = ''; opened.value = true;
}
function close() { if (busy.value || (dirty.value && !window.confirm('Закрыть форму без сохранения изменений?'))) return; opened.value = false; }
function changeGroup() { draft.value.categoryId = 0; newCategory.value = ''; creatingCategory.value = false; }
async function submit(again = false) {
  error.value = '';
  try {
    const row = await save(draft.value);
    notice.value = `Работа ${row.code} сохранена.`;
    if (again) open(); else opened.value = false;
  } catch (e) { error.value = workError(e); }
}
async function createCategory() {
  error.value = '';
  try { const row = await addCategory(draft.value.groupId, newCategory.value); draft.value.categoryId = row.id; newCategory.value = ''; creatingCategory.value = false; }
  catch (e) { error.value = workError(e); }
}
async function deleteCurrent() {
  if (!selected.value || !deleteReason.value.trim()) { error.value = 'Укажите причину удаления.'; return; }
  if (!window.confirm(`Удалить работу ${selected.value.code} из справочника?`)) return;
  error.value = '';
  try { await remove(selected.value, deleteReason.value); opened.value = false; notice.value = 'Работа удалена из активного справочника. История сохранена.'; }
  catch (e) { error.value = workError(e); }
}
onBeforeRouteLeave(() => !busy.value && (!dirty.value || window.confirm('Уйти без сохранения изменений формы?')));
</script>
<template>
<section class="work-library">
  <DiagnosticModuleTabs active="works"/>
  <div class="wl-content">
    <div class="wl-tabs"><strong>Список работ</strong><button disabled title="Следующий этап">Наборы работ · позже</button></div>
    <div class="wl-toolbar">
      <label class="wl-search"><Icon name="lucide:search"/><input v-model="search" aria-label="Поиск работ" type="search" placeholder="Поиск по шифру, названию и описанию"/></label>
      <select v-model="group" aria-label="Группа"><option :value="0">Все группы</option><option v-for="g in catalog.groups" :key="g.id" :value="g.id">{{ g.name }}</option></select>
      <select v-model="category" aria-label="Категория"><option :value="0">Все категории</option><option v-for="c in filterCategories" :key="c.id" :value="c.id">{{ c.name }}{{ !group ? ' · '+catalog.groups.find(g=>g.id===c.groupId)?.name : '' }}</option></select>
      <button :disabled="loading||busy" @click="refresh">Обновить</button>
      <button v-if="permissions.create" class="wl-primary" :disabled="loading||busy" @click="open()">+ Работа</button>
    </div>
    <p v-if="notice" role="status" class="wl-notice">{{ notice }} <button aria-label="Закрыть уведомление" @click="notice=''">×</button></p>
    <p v-if="loadError" role="alert" class="wl-error">{{ loadError }}</p>
    <div class="wl-table" tabindex="0" aria-label="Справочник работ" :aria-busy="loading">
      <table><thead><tr>
        <th v-for="c in ([{key:'code',label:'Шифр'},{key:'name',label:'Наименование'}] as const)" :key="c.key" :aria-sort="sortKey===c.key?(descending?'descending':'ascending'):'none'"><button @click="sort(c.key)">{{ c.label }} {{ sortKey===c.key?(descending?'↓':'↑'):'' }}</button></th>
        <th>Категория</th><th>Группа</th>
        <th :aria-sort="sortKey==='hours'?(descending?'descending':'ascending'):'none'"><button @click="sort('hours')">Трудоёмкость, чел·ч {{ sortKey==='hours'?(descending?'↓':'↑'):'' }}</button></th>
        <th><span class="sr-only">Действия</span></th>
      </tr></thead><tbody>
        <tr v-if="loading"><td colspan="6" class="wl-empty" role="status">Загрузка работ…</td></tr>
        <template v-else>
          <tr v-for="r in filtered" :key="r.id" @click="open(r)">
            <td>{{ r.code }}</td><td><button class="wl-name" @click.stop="open(r)">{{ r.name }}</button></td>
            <td>{{ r.category }}</td><td>{{ r.group }}</td><td>{{ Number(r.hours).toLocaleString('ru-RU',{maximumFractionDigits:4}) }}</td>
            <td><button v-if="permissions.create" :aria-label="`Создать копию: ${r.name}`" title="Создать копию" @click.stop="open(r,true)"><Icon name="lucide:copy"/></button></td>
          </tr>
          <tr v-if="!filtered.length&&!loadError"><td colspan="6" class="wl-empty">{{ rows.length?'Работы не найдены.':'В справочнике пока нет работ.' }} <button v-if="rows.length" @click="search='';category=0;group=0">Сбросить фильтры</button></td></tr>
        </template>
      </tbody></table>
    </div>
    <footer>Показано {{ filtered.length }} из {{ rows.length }} работ</footer>
  </div>
  <USlideover :open="opened" :title="title" description="Карточка типовой работы" :ui="{content:'wl-panel w-full sm:max-w-xl',body:'overflow-y-auto',footer:'shrink-0'}" @update:open="v=>{if(!v)close()}">
    <template #body>
      <form id="work-library-form" class="wl-form" @submit.prevent="submit()">
        <p class="wl-info">{{ draft.code?'Шифр: '+draft.code:'Шифр будет присвоен при сохранении.' }}</p>
        <fieldset :disabled="mode==='view'||busy">
          <label>Группа *<select v-model="draft.groupId" required :disabled="mode!=='create'" @change="changeGroup"><option v-for="g in catalog.groups" :key="g.id" :value="g.id">{{ g.name }}</option></select></label>
          <label>Категория *<select v-model="draft.categoryId" required><option :value="0" disabled>Выберите категорию</option><option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option></select></label>
          <button v-if="mode!=='view'&&permissions.create&&!creatingCategory" type="button" @click="creatingCategory=true">+ Категория в выбранной группе</button>
          <div v-if="creatingCategory" class="wl-category-create">
            <label>Новая категория<input v-model="newCategory" maxlength="250" placeholder="Название категории"/></label>
            <button type="button" :disabled="!newCategory.trim()||busy" @click="createCategory">Добавить категорию</button>
            <button type="button" @click="creatingCategory=false;newCategory=''">Отмена</button>
          </div>
          <label>Наименование *<input v-model="draft.name" required maxlength="300" placeholder="Например, Консультация"/></label>
          <p v-if="similar.length&&mode!=='view'" class="wl-info">Похожие работы: {{ similar.map(r=>r.code+' — '+r.name).join('; ') }}</p>
          <label>Трудоёмкость одного выполнения, чел·ч *<input v-model="draft.hours" required inputmode="decimal" maxlength="13" placeholder="Например, 1,5"/></label>
          <label>Критерий приёмки *<textarea v-model="draft.criteria" required rows="3" maxlength="2000" placeholder="Что должно быть выполнено?"/></label>
          <label>Примечание<textarea v-model="draft.note" rows="3" maxlength="4000"/></label>
        </fieldset>
        <p v-if="selected" class="wl-info wl-author">Создал: {{ selected.creator }} · {{ new Date(selected.createdAt).toLocaleString('ru-RU') }}<br/>Изменил: {{ selected.editor }} · {{ new Date(selected.updatedAt).toLocaleString('ru-RU') }}</p>
        <div v-if="deleting"><label>Причина удаления *<textarea v-model="deleteReason" maxlength="1000" rows="3" :disabled="busy"/></label><button type="button" :disabled="busy||!deleteReason.trim()" @click="deleteCurrent">Подтвердить удаление</button><button type="button" :disabled="busy" @click="deleting=false;deleteReason=''">Отмена</button></div>
        <p v-if="error" role="alert" class="wl-error">{{ error }}</p>
      </form>
    </template>
    <template #footer><div class="wl-footer">
      <template v-if="mode==='view'">
        <button v-if="permissions.delete" :disabled="busy" @click="deleting=true">Удалить</button>
        <button v-if="permissions.create" :disabled="busy" @click="selected && open(selected,true)">Создать копию</button>
        <button v-if="permissions.update" class="wl-primary" :disabled="busy" @click="mode='edit';deleting=false;deleteReason=''">Редактировать</button>
      </template>
      <template v-else>
        <button :disabled="busy" @click="close">Отмена</button>
        <button v-if="mode==='create'" :disabled="busy" @click="submit(true)">Сохранить и ещё</button>
        <button type="submit" form="work-library-form" class="wl-primary" :disabled="busy">{{ busy?'Сохранение…':'Сохранить' }}</button>
      </template>
    </div></template>
  </USlideover>
</section>
</template>
<style src="~/assets/css/diagnostic-work-library.css"></style>
<style scoped>
.wl-author{margin-top:18px}.wl-category-create{display:grid;gap:8px}.work-library button:disabled,.wl-footer button:disabled{cursor:default;opacity:.5}
</style>

