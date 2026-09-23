<script setup lang="ts">
import { watch } from 'vue'
import type { AccessActionName, AccessRow, AccessSnapshot, AccessSubjectKind } from '~~/shared/types/access-management'
import { useAccessMatrix } from '~/composables/useAccessMatrix'

const props = defineProps<{ kind: AccessSubjectKind; subjectId: number }>()
const emit = defineEmits<{ updated: [snapshot: AccessSnapshot] }>()
// Parent keys this component by subject: in-flight responses never update another subject.
const { snapshot, loading, saving, error, notice, needsReload, search, onlyAssigned,
  group, groups, rows, labels, load, toggle, toggleAll, selected, canSet, dirtyCount, apply, reset } = useAccessMatrix(props.kind, props.subjectId)
watch(snapshot, value => { if (value) emit('updated', value) })

function sourceText(row: AccessRow, action: AccessActionName): string {
  const cell = row.actions[action]
  if (cell.blockedBy === 'USER_INACTIVE') return props.kind === 'user' ? 'Сотрудник неактивен' : 'Получатель отключён'
  if (cell.blockedBy === 'RESOURCE_INACTIVE') return 'Ресурс отключён'
  if (cell.blockedBy === 'ADMIN_REQUIRED') return 'Только системный администратор'
  if (!cell.effectiveGranted) return 'Нет доступа'
  if (props.kind === 'spaceGroup') return 'Для участников группы Space'
  if (props.kind === 'department') return 'Для сотрудников отдела'
  if (props.kind === 'domainGroup') return 'Для участников группы AD'
  const parts = []
  if (cell.systemGranted) parts.push('Системный администратор')
  if (cell.directGranted) parts.push('Лично')
  if (cell.inheritedGranted) parts.push(`Отдел: ${snapshot.value?.subject.department?.name ?? ''}`)
  if (cell.spaceGroups?.length) parts.push(`Группы Space: ${cell.spaceGroups.map(g => g.name).join(', ')}`)
  if (cell.domainGroups?.length) parts.push(`Группы AD: ${cell.domainGroups.map(g => g.name).join(', ')}`)
  return parts.join(' + ')
}

function disabled(row: AccessRow, action: AccessActionName): boolean {
  return loading.value || saving.value || needsReload.value || !canSet(row, action, !selected(row, action))
}

function changePermission(row: AccessRow, action: AccessActionName, event: Event) {
  const input = event.target as HTMLInputElement
  const granted = input.checked
  input.checked = selected(row, action)
  void toggle({ resourceId: row.id, action, granted })
}
function allSelected(row: AccessRow) {
  return snapshot.value!.actions.every(action => selected(row, action))
}
function someSelected(row: AccessRow) {
  return snapshot.value!.actions.some(action => selected(row, action)) && !allSelected(row)
}
function allDisabled(row: AccessRow) {
  return loading.value || saving.value || needsReload.value
    || snapshot.value!.actions.some(action => !canSet(row, action, !allSelected(row)))
}
</script>

<template>
  <section class="access-matrix" aria-label="Назначение прав" :aria-busy="loading || saving">
    <header class="matrix-heading">
      <div>
        <h3>{{ kind === 'user' ? 'Личные и итоговые права' : kind === 'spaceGroup' ? 'Группа Space' : kind === 'domainGroup' ? 'Права доменной группы' : 'Права подразделения' }}</h3>
        <p v-if="snapshot">{{ snapshot.subject.name }}</p>
      </div>
      <button type="button" class="matrix-button" :disabled="loading || saving" @click="load">Обновить</button>
    </header>
    <p v-if="loading" role="status">Загрузка прав…</p>
    <div v-if="error" class="matrix-error" role="alert">{{ error }} Нажмите «Обновить».</div>
    <p v-if="notice" class="matrix-notice" role="status">{{ notice }}</p>
    <template v-if="snapshot && !loading">
      <p v-if="!snapshot.canManage" class="matrix-hint">Режим просмотра. Назначать права пока может только системный администратор.</p>
      <p v-else class="matrix-hint">
        {{ kind === 'user' ? 'Галочки — личные назначения. Подписи — сохранённый доступ и его источник.' : kind === 'spaceGroup' ? 'Права наследуют прямые участники и участники включённых групп AD.' : kind === 'domainGroup' ? 'Права наследуют участники группы безопасности AD, включая вложенные группы.' : `Назначения действуют для всех участников отдела (${snapshot.subject.memberCount}), включая будущих.` }}
        Для сохранения нажмите «Применить».
      </p>
      <p v-if="!snapshot.subject.isActive" class="matrix-hint">Получатель неактивен. Назначения сохранены, но не дают доступа. Их можно отозвать.</p>
      <p v-if="snapshot.subject.department && !snapshot.subject.department.isActive" class="matrix-hint">Отдел отключён: его права не наследуются.</p>
      <p v-if="snapshot.directoryWarning" class="matrix-error" role="status">{{ snapshot.directoryWarning }}</p>
      <div class="matrix-filters">
        <label>Поиск ресурса<input v-model="search" type="search" placeholder="Название или ключ" /></label>
        <label>Раздел ресурсов<select v-model="group"><option value="">Все разделы</option><option v-for="item in groups" :key="item">{{ item }}</option></select></label>
        <label class="assigned-filter"><input v-model="onlyAssigned" type="checkbox" /> Только с назначениями или доступом</label>
      </div>
      <div class="matrix-toolbar">
        <button class="matrix-button primary" type="button" :disabled="!dirtyCount || loading || saving || needsReload || !snapshot.canManage" @click="apply">{{ saving ? 'Применение…' : 'Применить' }}</button>
        <button class="matrix-button" type="button" :disabled="!dirtyCount || saving" @click="reset">Сбросить изменения</button>
        <span role="status">{{ dirtyCount ? `Несохранённых изменений: ${dirtyCount}` : 'Нет несохранённых изменений' }}</span>
      </div>
      <p class="matrix-count">Ресурсов: {{ snapshot.summary.totalResources }} · Прямых назначений: {{ snapshot.summary.directPermissions }} · Действующих прав: {{ snapshot.summary.effectivePermissions }}<span v-if="saving"> · Сохранение…</span></p>
      <div class="matrix-table-wrap" tabindex="0" role="region" aria-label="Список прав пользователя или группы">
        <table>
          <caption class="sr-only">Ресурсы и действия. Галочки показывают прямое назначение, подписи — итоговый доступ.</caption>
          <thead><tr><th scope="col">Ресурс</th><th v-for="action in snapshot.actions" :key="action" scope="col">{{ labels[action] }}</th><th scope="col">Полные права</th></tr></thead>
          <tbody>
            <tr v-for="row in rows" :key="row.id">
              <th scope="row"><span class="resource-title">{{ row.name }}</span><small>{{ row.group }}</small><small>{{ row.key }}</small><small v-if="!row.isActive">Отключён</small></th>
              <td v-for="action in snapshot.actions" :key="action">
                <label class="grant-control" :title="action === 'VIEW' ? 'Остальные действия требуют просмотра. Снятие просмотра снимает все прямые права строки; наследование сохраняется.' : 'При назначении также включается просмотр'">
                  <input type="checkbox" :checked="selected(row, action)" :disabled="disabled(row, action)"
                    :aria-label="`${row.name}: ${labels[action]}, ${kind === 'user' ? 'личное назначение' : kind === 'spaceGroup' ? 'Группа Space' : kind === 'domainGroup' ? 'назначение группе AD' : 'назначение отделу'}`"
                    @change="changePermission(row, action, $event)" />
                  <span>{{ kind === 'user' ? 'Лично' : kind === 'spaceGroup' ? 'Группа Space' : kind === 'domainGroup' ? 'Группе AD' : 'Отделу' }}</span>
                </label>
                <small v-if="selected(row, action) !== row.actions[action].directGranted" class="pending-state">{{ selected(row, action) ? 'Будет назначено' : 'Будет снято' }}</small>
                <small class="effective-state" :class="{ granted: row.actions[action].effectiveGranted }">{{ sourceText(row, action) }}</small>
                <small v-if="!row.actions[action].canGrant && !row.actions[action].directGranted && snapshot.canManage && snapshot.subject.isActive && row.isActive">Назначение недоступно</small>
              </td>
              <td><label class="grant-control"><input type="checkbox" :checked="allSelected(row)" :indeterminate="someSelected(row)" :disabled="allDisabled(row)" :aria-label="`${row.name}: полные прямые права`" @change="toggleAll(row, ($event.target as HTMLInputElement).checked)" /><span>Все</span></label><small>Все 4 действия</small></td>
            </tr>
            <tr v-if="!rows.length"><td colspan="6">Ресурсы по этому фильтру не найдены.</td></tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
.access-matrix { color: #172b4d; min-width: 0; font-size: 14px; }
.matrix-heading { display: flex; justify-content: space-between; gap: 12px; align-items: start; flex-wrap: wrap; }
h3 { font-size: 18px; margin: 0 0 5px; font-weight: 650; } p { margin: 6px 0 12px; }
.matrix-heading p, .matrix-hint, .matrix-count { color: #52637a; line-height: 1.5; }
.matrix-button { background: #fff; border: 1px solid #b9c6d6; padding: 8px 12px; border-radius: 7px; color: #25486d; cursor: pointer; }
.matrix-button:disabled { opacity: .55; cursor: default; }
.matrix-error { background: #fff1f0; color: #962c25; padding: 12px; border-radius: 7px; margin: 10px 0; }
.matrix-notice { background: #eef8f4; color: #175c43; padding: 12px; border-radius: 7px; }
.matrix-filters { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin: 18px 0 10px; }
.matrix-filters label { display: flex; flex-direction: column; gap: 5px; flex: 1 1 180px; }
.matrix-filters input[type=search], select { border: 1px solid #becada; background: white; color: inherit; border-radius: 7px; padding: 8px 10px; min-width: 0; width: 100%; box-sizing: border-box; }
.matrix-filters .assigned-filter { flex-direction: row; align-items: center; padding: 8px 0; }
.matrix-table-wrap { overflow-x: auto; border: 1px solid #dce4ed; border-radius: 9px; }
table { width: 100%; border-collapse: collapse; min-width: 660px; text-align: left; }
th, td { padding: 13px 12px; vertical-align: top; border-bottom: 1px solid #e4eaf1; }
thead { background: #f3f6fa; } thead th { font-weight: 600; font-size: 12px; }
tbody th { width: 28%; font-weight: normal; } tbody tr:last-child > * { border-bottom: 0; }
.resource-title { display: block; font-weight: 600; margin-bottom: 5px; }
small { display: block; color: #63758b; font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.grant-control { display: flex; gap: 7px; align-items: center; margin-bottom: 7px; }
input[type=checkbox] { accent-color: #2563b8; width: 17px; height: 17px; flex-shrink: 0; }
.effective-state.granted { color: #126148; font-weight: 550; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
.access-matrix { display: flex; flex-direction: column; min-height: 0; overflow: hidden; font-size: 13px; }
.access-matrix > :not(.matrix-table-wrap) { flex-shrink: 0; }
.matrix-heading { align-items: center; }
h3 { font-size: 16px; margin: 0; }
p { margin: 4px 0 6px; }
.matrix-heading p { font-size: 12px; margin-bottom: 0; }
.matrix-hint, .matrix-count { font-size: 12px; }
.matrix-filters { gap: 8px; margin: 8px 0 4px; }
.matrix-filters label { gap: 3px; flex-basis: 150px; }
.matrix-filters input[type=search], select, .matrix-button { padding: 6px 8px; }
.matrix-table-wrap { flex: 1 1 0; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
thead th { position: sticky; top: 0; z-index: 1; background: #f3f6fa; box-shadow: 0 1px #dce4ed; }
th, td { padding: 10px; }
.resource-title, .grant-control { margin-bottom: 4px; }
.matrix-notice, .matrix-error { padding: 6px 8px; margin: 4px 0; }
.access-matrix { font-size: 15px; }
h3 { font-size: 18px; }
.matrix-heading p, .matrix-hint, .matrix-count, thead th { font-size: 14px; }
small { font-size: 13px; }
button, input, select { font: inherit; }
table { min-width: 850px; }
.matrix-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 8px 0; }
.primary { background: #2563b8; border-color: #2563b8; color: white; }
.pending-state { color: #925800; font-weight: 600; }
</style>
