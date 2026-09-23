import { ref, computed, watch, onMounted, onBeforeUnmount, type Ref } from 'vue'
import type { StructureMember } from '~~/shared/types/structure-member'
export const memberKey = (m: StructureMember) => m.cachedOnly ? `ad:${m.directoryObjectId || m.cacheLogin}` : `user:${m.id}`
export function useDepartmentMemberPicker(members: Ref<StructureMember[]>, busy: Ref<boolean>) {
  const rows = ref<StructureMember[]>([]), selected = ref(new Set<string>())
  const department = ref(''), departmentSearch = ref(''), search = ref('')
  const loading = ref(false), error = ref(''), warning = ref('')
  const included = (m: StructureMember) => members.value.some(x => (!m.cachedOnly && x.id === m.id)
    || (!!m.directoryObjectId && x.directoryObjectId === m.directoryObjectId))
  const departments = computed(() => [...new Set(rows.value.map(m => m.departmentName || 'Без отдела'))].sort((a,b) => a.localeCompare(b,'ru')))
  const visibleDepartments = computed(() => departments.value.filter(d => d.toLocaleLowerCase('ru').includes(departmentSearch.value.toLocaleLowerCase('ru'))))
  const departmentRows = (d: string) => rows.value.filter(m => (m.departmentName || 'Без отдела') === d)
  const visibleRows = computed(() => departmentRows(department.value).filter(m => `${m.name} ${m.detail}`.toLocaleLowerCase('ru').includes(search.value.toLocaleLowerCase('ru'))))
  const checked = (m: StructureMember) => included(m) || selected.value.has(memberKey(m))
  const state = (items: StructureMember[]) => ({ all: items.length > 0 && items.every(checked), some: items.some(checked) && !items.every(checked) })
  function toggle(items: StructureMember[], value: boolean) {
    if (busy.value || loading.value) return
    const next = new Set(selected.value)
    for (const m of items) if (!included(m)) { if (value) next.add(memberKey(m)); else next.delete(memberKey(m)) }
    selected.value = next
  }
  const chosen = computed(() => rows.value.filter(m => selected.value.has(memberKey(m)) && !included(m)))
  let alive = true, sequence = 0
  async function load() {
    const seq = ++sequence; loading.value = true; error.value = ''
    try {
      const r = await $fetch<{ items: StructureMember[]; warning?: string }>('/api/admin/directory-users/browse')
      if (!alive || seq !== sequence) return
      rows.value = r.items; warning.value = r.warning || ''
      selected.value = new Set([...selected.value].filter(k => r.items.some(m => memberKey(m) === k)))
      if (!departments.value.includes(department.value)) department.value = departments.value[0] || ''
    } catch { if (alive && seq === sequence) error.value = 'Не удалось загрузить сотрудников. Повторите обновление списка.' }
    finally { if (alive && seq === sequence) loading.value = false }
  }
  watch(members, () => { selected.value = new Set([...selected.value].filter(k => !rows.value.some(m => memberKey(m) === k && included(m)))) }, { deep: true })
  onMounted(() => { void load(); window.addEventListener('space-ad-cache-updated', load) })
  onBeforeUnmount(() => { alive = false; sequence++; window.removeEventListener('space-ad-cache-updated', load) })
  return { rows, selected, department, departmentSearch, search, loading, error, warning, visibleDepartments, departmentRows,
    visibleRows, included, checked, state, toggle, chosen, load }
}
