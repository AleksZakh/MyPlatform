import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { AccessActionName, AccessChange, AccessSnapshot, AccessSubjectKind, AccessRow } from '~~/shared/types/access-management'

export function useAccessMatrix(kind: AccessSubjectKind, id: number) {
  // Nuxt state keeps each subject's draft across tab/card changes, isolated per app session.
  const snapshot = useState<AccessSnapshot | null>(`access-snapshot:${kind}:${id}`, () => null)
  const draft = useState<Record<string, boolean>>(`access-draft:${kind}:${id}`, () => ({}))
  const changes = computed<AccessChange[]>(() => (snapshot.value?.data ?? []).flatMap(row =>
    (snapshot.value?.actions ?? []).filter(action => selected(row, action) !== row.actions[action].directGranted)
      .map(action => ({ resourceId: row.id, action, granted: selected(row, action) }))))
  const dirtyCount = computed(() => changes.value.length)
  function selected(row: AccessRow, action: AccessActionName): boolean {
    return draft.value[`${row.id}:${action}`] ?? row.actions[action].directGranted
  }
  function reset() {
    if (saving.value) return
    draft.value = {}
    notice.value = ''
  }
  function canSet(row: AccessRow, action: AccessActionName, granted: boolean): boolean {
    const cell = row.actions[action]
    return granted === cell.directGranted || (granted ? cell.canGrant : cell.canRevoke)
  }
  function setRow(row: AccessRow, actions: AccessActionName[], granted: boolean) {
    if (saving.value || loading.value || needsReload.value) return
    if (actions.some(action => !canSet(row, action, granted))) {
      error.value = 'Изменение недоступно: проверьте разрешения на все связанные действия.'
      return
    }
    for (const action of actions) draft.value[`${row.id}:${action}`] = granted
    error.value = ''
    notice.value = ''
  }
  function toggle(change: AccessChange) {
    const row = snapshot.value?.data.find(item => item.id === change.resourceId)
    if (!row) return
    const actions: AccessActionName[] = change.action === 'VIEW' && !change.granted
      ? ['VIEW', 'CREATE', 'UPDATE', 'DELETE']
      : change.action !== 'VIEW' && change.granted ? ['VIEW', change.action] : [change.action]
    setRow(row, actions, change.granted)
  }
  function toggleAll(row: AccessRow, granted: boolean) {
    setRow(row, ['VIEW', 'CREATE', 'UPDATE', 'DELETE'], granted)
  }
  const loading = ref(false)
  const saving = useState<boolean>(`access-saving:${kind}:${id}`, () => false)
  const error = ref('')
  const notice = ref('')
  const needsReload = useState<boolean>(`access-reload:${kind}:${id}`, () => false)
  const search = ref('')
  const onlyAssigned = ref(false)
  const group = ref('')
  let generation = 0
  let disposed = false
  const endpoint = kind === 'user' ? `/api/admin/users/${id}/access` : kind === 'spaceGroup' ? `/api/admin/space-groups/${id}/permissions` : kind === 'domainGroup' ? `/api/admin/domain-groups/${id}/permissions` : `/api/admin/departments/${id}/permissions`
  const labels: Record<AccessActionName, string> = {
    VIEW: 'Просмотр', CREATE: 'Создание', UPDATE: 'Изменение', DELETE: 'Удаление',
  }
  function message(value: unknown, fallback: string): string {
    const e = value as { data?: { data?: { message?: string }; message?: string }; message?: string }
    return e?.data?.data?.message || e?.data?.message || fallback
  }
  async function load() {
    if (saving.value) return
    if (dirtyCount.value && !window.confirm('Обновить права с сервера и сбросить несохранённые изменения?')) return
    const current = ++generation
    loading.value = true
    error.value = ''
    notice.value = ''
    try {
      const response = await $fetch<AccessSnapshot>(endpoint)
      if (disposed || current !== generation) return
      snapshot.value = response
      draft.value = {}
      needsReload.value = false
    } catch (e) {
      if (disposed || current !== generation) return
      error.value = message(e, 'Не удалось загрузить права. Повторите загрузку.')
      needsReload.value = true
    } finally {
      if (!disposed && current === generation) loading.value = false
    }
  }
  async function apply() {
    if (!snapshot.value || saving.value || loading.value || needsReload.value || !dirtyCount.value) return
    if (dirtyCount.value > 200) {
      error.value = 'За одно применение можно изменить до 200 прав. Уменьшите количество изменений.'
      return
    }
    // Only edited rows are validated; unrelated legacy assignments remain untouched.
    const editedIds = new Set(changes.value.map(change => change.resourceId))
    const invalid = snapshot.value.data.find(row => editedIds.has(row.id)
      && !selected(row, 'VIEW')
      && (['CREATE', 'UPDATE', 'DELETE'] as AccessActionName[]).some(action => selected(row, action)))
    if (invalid) {
      error.value = `«${invalid.name}»: для создания, изменения и удаления включите просмотр.`
      return
    }
    saving.value = true
    error.value = ''
    notice.value = ''
    const count = dirtyCount.value
    try {
      const response = await $fetch<AccessSnapshot>(endpoint, {
        method: 'PUT', headers: { 'x-space-access-change': '1' },
        body: { revision: snapshot.value.revision, changes: changes.value },
      })
      // Update retained state even when the administrator switched cards during saving.
      snapshot.value = response
      draft.value = {}
      needsReload.value = false
      notice.value = `Изменения сохранены: ${count}. Итоговый доступ обновлён.`
    } catch (e) {
      error.value = message(e, 'Не удалось подтвердить сохранение. Обновите матрицу перед повторной попыткой.')
      needsReload.value = true
    } finally {
      saving.value = false
    }
  }
  const groups = computed(() => [...new Set(snapshot.value?.data.map(row => row.group) ?? [])].sort())
  const rows = computed(() => {
    const q = search.value.trim().toLocaleLowerCase('ru')
    return (snapshot.value?.data ?? []).filter(row =>
      (!group.value || row.group === group.value)
      && (!q || `${row.name} ${row.key} ${row.description ?? ''}`.toLocaleLowerCase('ru').includes(q))
      && (!onlyAssigned.value || Object.values(row.actions).some(cell => cell.directGranted || cell.effectiveGranted)))
  })
  function beforeUnload(event: BeforeUnloadEvent) {
    if (dirtyCount.value || saving.value) { event.preventDefault(); event.returnValue = '' }
  }
  onMounted(() => {
    window.addEventListener('beforeunload', beforeUnload)
    if (!dirtyCount.value) void load()
    else notice.value = 'Восстановлены несохранённые изменения для этого получателя.'
  })
  onBeforeUnmount(() => { disposed = true; generation++; window.removeEventListener('beforeunload', beforeUnload) })
  return { snapshot, loading, saving, error, notice, needsReload, search, onlyAssigned, group, groups, rows, labels, load, toggle, toggleAll, selected, canSet, dirtyCount, apply, reset }
}
