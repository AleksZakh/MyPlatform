import { computed, onScopeDispose, ref, watch, type WatchSource } from 'vue'
import type { ITableFilter } from '../../types/tableFilter'
import { emptyLabFacetOptions, labFilterDateError, normalizeLabFilters, type LabFacetOptions } from '../../shared/utils/lab-filter-values'

type FacetResult = { total: number; options: LabFacetOptions }
export function useLabFilterFacets(source: WatchSource<ITableFilter>) {
  const options = ref(emptyLabFacetOptions())
  const total = ref<number | null>(null)
  const loading = ref(false)
  const error = ref('')
  let sequence = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let controller: AbortController | undefined
  let draft: ITableFilter = normalizeLabFilters()

  async function fetchOptions(snapshot: ITableFilter, current: number) {
    const abort = new AbortController()
    controller = abort
    try {
      const result = await $fetch<FacetResult>('/api/incoming-control/filter-options', {
        method: 'POST', body: { filters: snapshot }, signal: abort.signal,
      })
      if (current !== sequence) return
      options.value = result.options
      total.value = result.total
    } catch {
      if (current !== sequence || abort.signal.aborted) return
      error.value = 'Не удалось обновить списки. Повторите загрузку.'
    } finally {
      if (current === sequence) loading.value = false
    }
  }
  function refresh(value = draft) {
    draft = normalizeLabFilters(value)
    const current = ++sequence
    clearTimeout(timer)
    controller?.abort()
    options.value = emptyLabFacetOptions()
    total.value = null
    error.value = labFilterDateError(draft)
    loading.value = !error.value
    if (error.value) return
    const snapshot = normalizeLabFilters(draft)
    timer = setTimeout(() => { void fetchOptions(snapshot, current) }, 200)
  }
  watch(source, value => refresh(value), { immediate: true, deep: true, flush: 'sync' })
  onScopeDispose(() => { sequence++; clearTimeout(timer); controller?.abort() })
  return { options, total, loading, error, refresh: () => refresh(), hasNoMatches: computed(() => !loading.value && !error.value && total.value === 0) }
}
