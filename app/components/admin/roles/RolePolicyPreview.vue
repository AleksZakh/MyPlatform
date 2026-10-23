<script setup lang="ts">
import {computed,nextTick,onBeforeUnmount,ref,watch} from 'vue';
import {onBeforeRouteLeave} from 'vue-router';
import {useDepartmentRoleDraft} from '~/composables/useDepartmentRoleDraft';
import {roles,capabilities,type Role} from '~~/shared/access/department-role-draft';
const {catalog,loading,error,notice,scopeKey,scope,dirty,selected,search,groupFilter,roleFilter,focusUser,role,copyFrom,currentGroup,filtered,focused,assignment,selectedUsers,allSelected,rights,assign,bulkAssign,copy,toggle,toggleAll,override,template,save,reset,exportDraft,load}=useDepartmentRoleDraft();
const dialog=ref<HTMLElement|null>(null);
let returnFocus:HTMLElement|null=null;
watch(focusUser,async value=>{
 if(value!==null){returnFocus=document.activeElement as HTMLElement;await nextTick();dialog.value?.querySelector<HTMLButtonElement>('button')?.focus();}
 else {returnFocus?.focus();returnFocus=null;}
});
function trapFocus(event:KeyboardEvent){
 if(event.key!=='Tab'||!dialog.value)return;
 const items=Array.from(dialog.value.querySelectorAll<HTMLElement>('button:not([disabled]),select:not([disabled])'));
 const first=items[0],last=items.at(-1);
 if(event.shiftKey && document.activeElement===first){event.preventDefault();last?.focus();}
 else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first?.focus();}
}
onBeforeUnmount(()=>{returnFocus=null;});
const scopeInfo=computed(()=>catalog.value?.scopes.find(s=>s.key===scopeKey.value));
const templateInfo=computed(()=>roles.find(r=>r.key===role.value)!);
const assignedCount=computed(()=>catalog.value?.users.filter(u=>scope.value?.assignments[u.id]).length||0);
const sourceUsers=computed(()=>catalog.value?.users.filter(u=>scope.value?.assignments[u.id])||[]);
const roleLabel=(value:Role|undefined)=>roles.find(r=>r.key===value)?.label||'Не назначена';
onBeforeRouteLeave(()=>!dirty.value||window.confirm('Выйти без сохранения изменений тестового черновика?'));
</script>
<template>
 <main class="role-preview" :aria-busy="loading">
  <header class="rp-header"><div><NuxtLink to="/admin" class="rp-back">← Центр администрирования</NuxtLink><h1>Роли подразделений <span class="rp-badge">Тестовая методика</span></h1></div>
   <div v-if="catalog" class="rp-actions"><button @click="exportDraft"><Icon name="lucide:download"/> JSON</button><button class="rp-primary" :disabled="!dirty" @click="save"><Icon name="lucide:save"/> Сохранить черновик</button></div>
  </header>
  <div class="rp-banner"><Icon name="lucide:flask-conical"/><div><strong>Проверяем будущую политику доступа.</strong> Все настройки ниже — модель, а не действующие права. Черновик хранится только в этом браузере для вашей учётной записи. <NuxtLink to="/admin/access">Действующие права →</NuxtLink></div></div>
  <p v-if="notice" class="rp-notice" role="status">{{ notice }}</p>
  <p v-if="loading" class="rp-empty">Загружаем сотрудников и ресурсы…</p>
  <div v-else-if="error" class="rp-error" role="alert">{{ error }} <button @click="load">Повторить</button></div>
  <template v-else-if="catalog && scope">
   <section class="rp-card rp-scope">
    <label>Ресурсы подразделения<select v-model="scopeKey" data-test="scope"><option v-for="s in catalog.scopes" :key="s.key" :value="s.key">{{ s.name }}</option></select></label>
    <div><strong>{{ scopeInfo?.resources.length }} ресурсов</strong><span>Единая роль для всего раздела</span></div>
    <div><strong>{{ assignedCount }} сотрудников</strong><span>Получили роль в черновике</span></div>
    <div><strong>{{ dirty ? 'Есть изменения' : 'Черновик сохранён / исходный' }}</strong><span>Рабочие назначения не меняются</span></div>
    <details><summary>Состав раздела</summary><ul><li v-for="r in scopeInfo?.resources" :key="r.key">{{ r.name }} <small>{{ r.key }}</small></li></ul><p v-if="!scopeInfo?.resources.length">Ресурсы ещё не зарегистрированы.</p><p>Состав взят из активных ресурсов Space. Общие сервисы и администрирование Space сюда не включены.</p></details>
   </section>
   <section class="rp-roles" aria-label="Шаблоны ролей">
    <button v-for="r in roles" :key="r.key" :data-role="r.key" :aria-pressed="role===r.key" @click="role=r.key"><span class="rp-role-icon"><Icon :name="r.icon"/></span><strong>{{ r.label }}</strong><small>{{ r.description }}</small></button>
   </section>
   <section class="rp-card rp-template">
    <header><div><h2>Шаблон: {{ templateInfo.label }}</h2><p>Изменения шаблона учитываются у всех сотрудников с этой ролью в выбранном разделе. Персональные исключения сохраняются.</p></div><button class="rp-quiet" @click="reset">Сбросить раздел</button></header>
    <div class="rp-capabilities"><label v-for="cap in capabilities" :key="cap.key" :title="cap.description"><input type="checkbox" :data-cap="cap.key" :checked="scope.templates[role][cap.key]" @change="template(cap.key,($event.target as HTMLInputElement).checked)"/><span>{{ cap.label }}</span></label></div>
   </section>
   <section class="rp-card rp-team">
    <header><div><h2>Сотрудники и назначения</h2><p>Выберите получателей, затем назначьте роль или скопируйте настройки коллеги.</p></div><span class="rp-badge">Найдено: {{ filtered.length }}</span></header>
    <div class="rp-filters">
     <label class="rp-search"><span>Поиск сотрудника</span><div><Icon name="lucide:search"/><input v-model="search" type="search" placeholder="Имя, логин или отдел"/></div></label>
     <label>Состав команды<select v-model="groupFilter" data-test="group"><option value="">Все активные сотрудники</option><optgroup label="Прямые участники групп Space"><option v-for="g in catalog.groups" :key="g.id" :value="`group:${g.id}`">{{ g.name }}</option></optgroup><optgroup label="Подразделения"><option v-for="d in catalog.departments" :key="d.id" :value="`department:${d.id}`">{{ d.name }}</option></optgroup></select></label>
     <label>Роль в черновике<select v-model="roleFilter"><option value="">Все роли</option><option value="none">Без назначения</option><option v-for="r in roles" :key="r.key" :value="r.key">{{ r.label }}</option></select></label>
    </div>
    <p v-if="currentGroup?.domainGroupCount" class="rp-notice">В группе есть связи с AD. Этот фильтр показывает только прямых участников Space. Остальных сотрудников выберите через «Все активные сотрудники».</p>
    <div class="rp-bulk"><label><input type="checkbox" :checked="allSelected" :disabled="!filtered.length" @change="toggleAll"/> Все найденные</label><strong>Выбрано: {{ selected.length }}</strong>
     <button class="rp-primary" :disabled="!selected.length" data-test="assign" @click="bulkAssign">Назначить «{{ templateInfo.label }}»</button>
     <select v-model="copyFrom" aria-label="Скопировать настройки сотрудника"><option value="">Шаблон сотрудника…</option><option v-for="u in sourceUsers" :key="u.id" :value="String(u.id)">{{ u.name }}</option></select><button :disabled="!selected.length||!copyFrom" data-test="copy" @click="copy">Скопировать</button>
    </div>
    <p class="rp-hint">Назначение роли заменяет прежнюю тестовую роль и её исключения. Копирование переносит роль и персональные исключения. Для просмотра достаточно роли наблюдателя.</p>
    <div class="rp-table-scroll"><table><thead><tr><th aria-label="Выбор"></th><th>Сотрудник</th><th>Роль для всего подразделения</th><th v-for="cap in capabilities" :key="cap.key" :title="cap.description">{{ cap.label }}</th><th>Исключения</th></tr></thead><tbody>
     <tr v-for="u in filtered" :key="u.id" :class="{'rp-selected':selected.includes(u.id)}"><td><input type="checkbox" :aria-label="`Выбрать ${u.name}`" :checked="selected.includes(u.id)" @change="toggle(u.id)"/></td><td><strong>{{ u.name }}</strong><small>{{ u.login }}<template v-if="u.department"> · {{ u.department }}</template></small></td>
      <td><select :value="scope.assignments[u.id]?.role||''" :aria-label="`Роль: ${u.name}`" @change="assign(u.id,($event.target as HTMLSelectElement).value as Role|'')"><option value="">Не назначена</option><option v-for="r in roles" :key="r.key" :value="r.key">{{ r.label }}</option></select></td>
      <td v-for="cap in capabilities" :key="cap.key" class="rp-right"><span :class="rights(u.id)[cap.key]?'rp-yes':'rp-no'" :aria-label="rights(u.id)[cap.key]?'Разрешено в модели':'Нет доступа в модели'">{{ rights(u.id)[cap.key]?'✓':'—' }}</span><small v-if="scope.assignments[u.id]?.overrides[cap.key]!==undefined">{{ scope.assignments[u.id]?.overrides[cap.key]?'Лично +':'Запрет' }}</small></td>
      <td><button :disabled="!scope.assignments[u.id]" :aria-label="`Исключения: ${u.name}`" @click="focusUser=u.id">Настроить<span v-if="Object.keys(scope.assignments[u.id]?.overrides||{}).length"> · {{ Object.keys(scope.assignments[u.id]?.overrides||{}).length }}</span></button></td>
     </tr><tr v-if="!filtered.length"><td colspan="10" class="rp-empty">Нет сотрудников по выбранным условиям.</td></tr>
    </tbody></table></div>
   </section>
   <section v-if="selected.length>1" class="rp-card rp-compare"><h2>Сравнение выбранных сотрудников</h2><div class="rp-table-scroll"><table><thead><tr><th>Возможность</th><th v-for="u in selectedUsers" :key="u.id">{{ u.name }}<small>{{ roleLabel(scope.assignments[u.id]?.role) }}</small></th></tr></thead><tbody><tr v-for="cap in capabilities" :key="cap.key"><th>{{ cap.label }}</th><td v-for="u in selectedUsers" :key="u.id" :class="rights(u.id)[cap.key]?'rp-yes':'rp-no'">{{ rights(u.id)[cap.key]?'Разрешено':'Нет доступа' }}</td></tr></tbody></table></div></section>
   <p class="rp-hint">Права в модели действуют на весь раздел, а не на отдельные таблицы. Изменение включает записи коллег. Запрет просмотра закрывает остальные действия. Право управления отделом не даёт доступа к статистике, управлению учётными записями и настройкам всей системы.</p>
  </template>
  <div v-if="focused && assignment" class="rp-overlay" @click.self="focusUser=null" @keydown.esc="focusUser=null"><section ref="dialog" @keydown="trapFocus" role="dialog" aria-modal="true" aria-labelledby="rp-person-title" class="rp-dialog"><header><div><h2 id="rp-person-title">{{ focused.name }}</h2><p>{{ scopeInfo?.name }} · {{ roleLabel(assignment.role) }}</p></div><button aria-label="Закрыть персональные исключения" @click="focusUser=null">✕</button></header><p>Исключения действуют только для этого сотрудника в выбранном подразделении.</p><label v-for="cap in capabilities" :key="cap.key"><span>{{ cap.label }}<small>{{ cap.description }}</small></span><select :value="assignment.overrides[cap.key]===undefined?'inherit':assignment.overrides[cap.key]?'allow':'deny'" @change="override(cap.key,($event.target as HTMLSelectElement).value)"><option value="inherit">По роли</option><option value="allow">Разрешить лично</option><option value="deny">Запретить лично</option></select></label><p v-if="!rights(focused.id).view" class="rp-notice">Просмотр запрещён: остальные действия недоступны, даже если разрешены отдельно.</p><footer><button @click="assignment.overrides={}">Убрать исключения</button><button class="rp-primary" @click="focusUser=null">Готово</button></footer></section></div>
 </main>
</template>
<style scoped src="./role-policy-preview.css"></style>
