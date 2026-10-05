export interface StorageReference { model: string; entity: string; id: number; field: string; path: string; type: string; number: string; date: string | null; samplingId: number | null; object: string; location: string; deleted: boolean }
export interface StorageItem { name: string; path: string; folder: boolean; size: number | null; modified: string | null; state: string; references: StorageReference[]; url?: string }
export function useStorageManager() {
  const mode = ref<'folders' | 'documents'>('folders'), directory = ref(''), query = ref(''), type = ref(''), page = ref(1)
  const items = ref<StorageItem[]>([]), total = ref(0), busy = ref(false), error = ref(''), selected = ref<StorageItem | null>(null), checked = ref<string[]>([])
  let request = 0
  async function refresh() {
    const token = ++request; busy.value = true; error.value = ''
    try {
      const data = await $fetch<{ items: StorageItem[]; total: number }>('/api/admin/files', { query: { mode: mode.value, path: directory.value, q: query.value, type: type.value, page: page.value } })
      if (token !== request) return
      items.value = data.items; total.value = data.total; checked.value = []
      selected.value = data.items.find(x => x.path === selected.value?.path) || null
    } catch (e: any) { if (token === request) error.value = e.data?.message || e.message || 'Ошибка загрузки' }
    finally { if (token === request) busy.value = false }
  }
  function open(item: StorageItem) {
    if (item.folder) { directory.value = item.path; page.value = 1; refresh() }
    else selected.value = item
  }
  watch(mode, () => { page.value = 1; selected.value = null; refresh() })
  async function mutate(body: Record<string, unknown>) {
    await $fetch('/api/admin/files/mutate', { method: 'POST', body })
    await refresh()
  }
  async function upload(file: File, samplingId: string, purpose: string, replacePath = '') {
    const form = new FormData()
    form.append('file', file); form.append('samplingId', samplingId); form.append('type', purpose)
    if (replacePath) form.append('replacePath', replacePath)
    await $fetch('/api/admin/files/upload', { method: 'POST', body: form })
    await refresh()
  }
  return { mode, directory, query, type, page, items, total, busy, error, selected, checked, refresh, open, mutate, upload }
}
