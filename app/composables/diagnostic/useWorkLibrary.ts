import { computed, ref, onMounted, watch } from 'vue';
import type { WorkRecord, WorkInput, WorkCatalog, WorkCategory } from '~~/shared/types/diagnostic-works';
import { parseWork } from '~~/shared/utils/diagnostic-works';
const headers = { 'x-space-diagnostic': '1', 'Content-Type': 'application/json' };
export function workError(e: unknown): string {
  const value = e as { data?: { data?: { message?: string }; message?: string }; message?: string };
  return value?.data?.data?.message || value?.data?.message || value?.message || 'Не удалось выполнить действие.';
}
export function useWorkLibrary() {
  const rows = ref<WorkRecord[]>([]);
  const catalog = ref<WorkCatalog>({ groups: [], categories: [] });
  const permissions = ref({ create: false, update: false, delete: false });
  const loading = ref(false), busy = ref(false), loadError = ref('');
  const search = ref(''), category = ref(0), group = ref(0);
  const sortKey = ref<'code' | 'name' | 'hours'>('code'), descending = ref(false);
  const filterCategories = computed(() => catalog.value.categories.filter(c => !group.value || c.groupId === group.value));
  watch(group, () => { if (!filterCategories.value.some(c => c.id === category.value)) category.value = 0; });
  const filtered = computed(() => {
    const q = search.value.trim().toLocaleLowerCase('ru-RU');
    return rows.value.filter(r => (!category.value || r.categoryId === category.value) && (!group.value || r.groupId === group.value) &&
      [r.code, r.name, r.group, r.category, r.hours, r.criteria, r.note].join(' ').toLocaleLowerCase('ru-RU').includes(q))
      .sort((a, b) => {
        const n = sortKey.value === 'code' ? a.groupId - b.groupId || a.sequence - b.sequence :
          sortKey.value === 'hours' ? Number(a.hours) - Number(b.hours) : a.name.localeCompare(b.name, 'ru');
        return (descending.value ? -1 : 1) * n;
      });
  });
  function sort(key: typeof sortKey.value) { if (key === sortKey.value) descending.value = !descending.value; else { sortKey.value = key; descending.value = false; } }
  async function refresh() {
    if (loading.value) return;
    loading.value = true; loadError.value = '';
    try {
      const [list, options, ...grants] = await Promise.all([
        $fetch<WorkRecord[]>('/api/diagnostic/works'),
        $fetch<WorkCatalog>('/api/diagnostic/works/catalog'),
        ...(['CREATE', 'UPDATE', 'DELETE'] as const).map(action =>
          $fetch<{ allowed: boolean }>('/api/access/check', { query: { resource: 'diagnostic.works', action } })),
      ]);
      rows.value = list; catalog.value = options;
      permissions.value = { create: !!grants[0]?.allowed, update: !!grants[1]?.allowed, delete: !!grants[2]?.allowed };
    } catch (e) { rows.value = []; catalog.value = { groups: [], categories: [] }; permissions.value = { create: false, update: false, delete: false }; loadError.value = workError(e); }
    finally { loading.value = false; }
  }
  async function save(value: WorkInput & { id?: number; version?: number }) {
    if (busy.value) throw new Error('Дождитесь завершения сохранения.');
    const input = parseWork(value); busy.value = true;
    try {
      const row = await $fetch<WorkRecord>(value.id ? `/api/diagnostic/works/${value.id}` : '/api/diagnostic/works',
        { method: value.id ? 'PUT' : 'POST', headers, body: { ...input, ...(value.id ? { version: value.version } : {}) } });
      const index = rows.value.findIndex(r => r.id === row.id);
      if (index < 0) rows.value.push(row); else rows.value[index] = row;
      return row;
    } finally { busy.value = false; }
  }
  async function addCategory(groupId: number, name: string) {
    if (busy.value) throw new Error('Дождитесь завершения операции.');
    busy.value = true;
    try {
      const row = await $fetch<WorkCategory>('/api/diagnostic/works/categories', { method: 'POST', headers, body: { groupId, name } });
      catalog.value.categories.push(row); return row;
    } finally { busy.value = false; }
  }
  async function remove(row: WorkRecord, reason: string) {
    if (busy.value) throw new Error('Дождитесь завершения операции.');
    busy.value = true;
    try {
      await $fetch(`/api/diagnostic/works/${row.id}`, { method: 'DELETE', headers, body: { version: row.version, reason } });
      rows.value = rows.value.filter(r => r.id !== row.id);
    } finally { busy.value = false; }
  }
  onMounted(refresh);
  return { rows, catalog, permissions, loading, busy, loadError, search, category, group, filtered, filterCategories,
    sortKey, descending, sort, refresh, save, addCategory, remove };
}

