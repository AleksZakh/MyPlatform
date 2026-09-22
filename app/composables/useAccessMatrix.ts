import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import type { AccessActionName, AccessChange, AccessSnapshot, AccessSubjectKind } from '~~/shared/types/access-management'

export function useAccessMatrix(kind: AccessSubjectKind, id: number) {
  const snapshot = ref<AccessSnapshot | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const notice = ref('')
  const needsReload = ref(false)
  const search = ref('')
  const onlyAssigned = ref(false)
  const group = ref('')
  let generation = 0
  let disposed = false
  const endpoint = kind === 'user' ? `/api/admin/users/${id}/access` : kind === 'domainGroup' ? `/api/admin/domain-groups/${id}/permissions` : `/api/admin/departments/${id}/permissions`
  const labels: Record<AccessActionName, string> = {
    VIEW: 'Просмотр', CREATE: 'Создание', UPDATE: 'Изменение', DELETE: 'Удаление',
  }
  function message(value: unknown, fallback: string): string {
    const e = value as { data?: { data?: { message?: string }; message?: string }; message?: string }
    return e?.data?.data?.message || e?.data?.message || fallback
  }
  async function load() {
    if (saving.value) return
    const current = ++generation
    loading.value = true
    error.value = ''
    notice.value = ''
    try {
      const response = await $fetch<AccessSnapshot>(endpoint)
      if (disposed || current !== generation) return
      snapshot.value = response
      needsReload.value = false
    } catch (e) {
      if (disposed || current !== generation) return
      error.value = message(e, 'Не удалось загрузить права. Повторите загрузку.')
      needsReload.value = true
    } finally {
      if (!disposed && current === generation) loading.value = false
    }
  }
  async function toggle(change: AccessChange) {
    if (!snapshot.value || saving.value || loading.value || needsReload.value) return
    const cell = snapshot.value.data.find(row => row.id === change.resourceId)?.actions[change.action]
    if (!cell || (change.granted ? !cell.canGrant : !cell.canRevoke)) return
    saving.value = true
    error.value = ''
    notice.value = ''
    const revision = snapshot.value.revision
    try {
      const response = await $fetch<AccessSnapshot>(endpoint, {
        method: 'PUT', headers: { 'x-space-access-change': '1' }, body: { revision, changes: [change] },
      })
      if (disposed) return
      snapshot.value = response
      const updated = response.data.find(row => row.id === change.resourceId)?.actions[change.action]
      const remains = !change.granted && updated?.effectiveGranted
      notice.value = `${labels[change.action]}: ${change.granted ? 'право назначено' : 'назначение отозвано'}.`
        + (remains ? updated.systemGranted
          ? ' Доступ остаётся: системный администратор.'
          : ' Доступ остаётся через отдел или доменные группы; источник указан под правом.' : '')
    } catch (e) {
      if (disposed) return
      error.value = message(e, 'Не удалось подтвердить сохранение. Обновите матрицу перед повторной попыткой.')
      // A failed response may follow a committed transaction: do not guess the server state.
      needsReload.value = true
    } finally {
      if (!disposed) saving.value = false
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
  onMounted(load)
  onBeforeUnmount(() => { disposed = true; generation++ })
  return { snapshot, loading, saving, error, notice, needsReload, search, onlyAssigned, group, groups, rows, labels, load, toggle }
}
