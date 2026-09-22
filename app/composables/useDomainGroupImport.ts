import { ref, onBeforeUnmount } from 'vue'
import type { AccessSubjectOption } from '~~/shared/types/access-management'
interface DirectoryGroup { directoryObjectId: string; name: string; distinguishedName: string }
export function useDomainGroupImport(onImported: (item: AccessSubjectOption) => void) {
  const query = ref(''), items = ref<DirectoryGroup[]>([]), busy = ref(false), error = ref(''), hasMore = ref(false)
  let disposed = false
  onBeforeUnmount(() => { disposed = true })
  const fail = (e: any) => { error.value = e?.data?.data?.message || 'Не удалось обратиться к каталогу AD. Проверьте настройки и повторите.' }
  async function search() {
    if (busy.value || query.value.trim().length < 2) return
    busy.value = true; error.value = ''; items.value = []
    try {
      const result = await $fetch<{ items: DirectoryGroup[]; hasMore: boolean }>('/api/admin/domain-groups/search', { query: { search: query.value.trim() } })
      if (!disposed) { items.value = result.items; hasMore.value = result.hasMore }
    } catch (e) { if (!disposed) fail(e) } finally { if (!disposed) busy.value = false }
  }
  async function add(item: DirectoryGroup) {
    if (busy.value) return
    busy.value = true; error.value = ''
    try {
      const result = await $fetch<{ item: AccessSubjectOption }>('/api/admin/domain-groups', {
        method: 'POST', headers: { 'x-space-access-change': '1' }, body: { directoryObjectId: item.directoryObjectId },
      })
      if (!disposed) { onImported(result.item); items.value = []; query.value = '' }
    } catch (e) { if (!disposed) fail(e) } finally { if (!disposed) busy.value = false }
  }
  return { query, items, busy, error, hasMore, search, add }
}
