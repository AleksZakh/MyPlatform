<script setup lang="ts">
import { toRef } from 'vue'
import type { StructureMember } from '~~/shared/types/structure-member'
import { useDepartmentMemberPicker, memberKey } from '~/composables/useDepartmentMemberPicker'
const props = defineProps<{ members: StructureMember[]; busy: boolean; progress: string }>()
const emit = defineEmits<{ add: [items: StructureMember[]] }>()
const { rows, selected, department, departmentSearch, search, loading, error, warning, visibleDepartments,
  departmentRows, visibleRows, included, checked, state, toggle, chosen, load } = useDepartmentMemberPicker(toRef(props, 'members'), toRef(props, 'busy'))
</script>
<template>
  <div class="member-picker">
    <div class="picker-bar"><strong>Подбор сотрудников</strong><span>В каталоге: {{ rows.length }}</span><button :disabled="busy || loading" @click="load">Обновить список</button></div>
    <p>Отметьте сотрудников или весь отдел. Выбор отдела добавляет его текущих сотрудников; будущие сотрудники автоматически не включаются.</p>
    <p v-if="loading" role="status">Загрузка сотрудников…</p><p v-if="error" role="alert">{{ error }}</p><p v-if="warning" role="status">{{ warning }}</p>
    <div class="picker-columns">
      <section aria-label="Отделы для подбора"><label>Отделы<input v-model="departmentSearch" placeholder="Найти отдел" :disabled="busy" /></label>
        <div class="department-list"><div v-for="d in visibleDepartments" :key="d" class="department-row" :class="{ current: department === d }">
          <input type="checkbox" :aria-label="`Выбрать сотрудников отдела ${d}`" :checked="state(departmentRows(d)).all" :indeterminate="state(departmentRows(d)).some" :disabled="busy || loading" @change="toggle(departmentRows(d), ($event.target as HTMLInputElement).checked)" />
          <button :disabled="busy" :aria-pressed="department === d" @click="department = d">{{ d }} <small>{{ departmentRows(d).length }}</small></button>
        </div><p v-if="!visibleDepartments.length && !loading">Отделы не найдены.</p></div>
      </section>
      <section aria-label="Сотрудники отдела"><label>Сотрудники — {{ department || 'выберите отдел' }}<input v-model="search" placeholder="Фамилия или логин в выбранном отделе" :disabled="busy" /></label>
        <div class="employee-list"><table><thead><tr><th><input type="checkbox" aria-label="Выбрать всех найденных сотрудников отдела" :checked="state(visibleRows).all" :indeterminate="state(visibleRows).some" :disabled="busy || loading || !visibleRows.length" @change="toggle(visibleRows, ($event.target as HTMLInputElement).checked)" /></th><th>Сотрудник / логин</th><th>Состояние</th></tr></thead><tbody>
          <tr v-for="m in visibleRows" :key="memberKey(m)"><td><input type="checkbox" :aria-label="`Выбрать ${m.name}`" :checked="checked(m)" :disabled="busy || loading || included(m)" @change="toggle([m], ($event.target as HTMLInputElement).checked)" /></td><td>{{ m.name }}<small>{{ m.detail }}</small></td><td>{{ included(m) ? 'Уже в составе' : m.cachedOnly ? 'Только кэш AD' : m.status === 'ACTIVE' ? 'Активен' : 'Вход не разрешён' }}</td></tr>
        </tbody></table><p v-if="!visibleRows.length && !loading">Сотрудники не найдены.</p></div>
      </section>
    </div>
    <div class="picker-bar"><span>Выбрано новых: {{ chosen.length }}</span><button :disabled="busy || !chosen.length" @click="selected = new Set()">Снять выбор</button><button class="primary" :disabled="busy || loading || !chosen.length" @click="emit('add', [...chosen])">Добавить выбранных ({{ chosen.length }})</button><span role="status">{{ progress }}</span></div>
    <p>Для сотрудников из кэша сразу создаются записи Space без разрешения входа. Затем сохраните состав группы. Созданные записи останутся и при отмене редактирования.</p>
  </div>
</template>
<style scoped>
.member-picker { margin:14px 0; border:1px solid #dce4ed; border-radius:8px; padding:12px; font-size:13px; }
.picker-bar { display:flex; flex-wrap:wrap; align-items:center; gap:10px; } p { color:#607089; margin:8px 0; line-height:1.4; }
.picker-columns { display:grid; grid-template-columns:minmax(180px, .8fr) minmax(300px, 1.8fr); gap:12px; }section { min-width:0; }
label { display:flex; flex-direction:column; gap:6px; margin:8px 0; } input:not([type=checkbox]) { padding:7px; width:100%; min-width:0; border:1px solid #bdcada; border-radius:5px; font:inherit; }
.department-list,.employee-list { height:330px; overflow:auto; border:1px solid #dce4ed; border-radius:5px; }
.department-row { display:flex; align-items:center; padding:5px 8px; gap:8px; border-bottom:1px solid #edf1f6; }.department-row.current { background:#eaf2ff; }.department-row button { flex:1; border:0; background:transparent; text-align:left; overflow-wrap:anywhere; }
button { font:inherit; padding:6px 9px; border:1px solid #bdcada; border-radius:5px; color:#25486d; background:white; cursor:pointer; }button:disabled { opacity:.5; cursor:default; }.primary { background:#2563b8; color:white; }
table { width:100%; border-collapse:collapse; text-align:left; }th,td { padding:7px; border-bottom:1px solid #e4eaf1; }thead { position:sticky; top:0; background:#f3f6fb; }small { display:block; color:#64748b; font-size:12px; overflow-wrap:anywhere; }
@media(max-width:650px) { .picker-columns { grid-template-columns:1fr; }.department-list { height:170px; }.employee-list { height:280px; } }
</style>
