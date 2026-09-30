import { onScopeDispose, ref, watch } from 'vue'
import type { IncomingControlRecord } from '~/composables/useLabDataLoader'

type RegistryResponse =
  | {
      success: true
      data: IncomingControlRecord[]
      pagination: {
        currentPage: number
        pageSize: number
        totalCount: number
        totalPages: number
      }
    }
  | { success: false; error?: string }

/** Server-side registry search, pagination and latest-request-only updates. */
export function useIncomingControlRegistryLoader() {
  const loading = ref(false)
  const errorMessage = ref('')
  const originalData = ref<IncomingControlRecord[]>([])
  const totalCount = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(25)
  const search = ref('')

  let requestId = 0
  let disposed = false
  let controller: AbortController | null = null
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  function cancelPending(): void {
    requestId++
    controller?.abort()
    controller = null
    if (searchTimer !== null) clearTimeout(searchTimer)
    searchTimer = null
  }

  async function loadData(page = currentPage.value, size = pageSize.value): Promise<void> {
    if (disposed) return
    cancelPending()
    const activeId = requestId
    const activeController = new AbortController()
    controller = activeController
    loading.value = true
    errorMessage.value = ''
    currentPage.value = Math.max(1, Math.trunc(page) || 1)
    pageSize.value = Math.min(100, Math.max(1, Math.trunc(size) || 25))

    const params = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(pageSize.value),
      search: search.value.trim(),
      sortKey: 'createdAt',
      sortOrder: 'desc',
    })

    try {
      const response = await fetch(`/api/incoming-control?${params}`, {
        credentials: 'same-origin',
        headers: { Accept: 'application/json' },
        signal: activeController.signal,
      })
      if (!response.ok) throw new Error(`Не удалось загрузить реестр (HTTP ${response.status})`)
      const result = await response.json() as RegistryResponse
      if (activeId !== requestId || disposed) return
      if (!result.success) throw new Error(result.error || 'Не удалось загрузить реестр')
      originalData.value = result.data
      totalCount.value = result.pagination.totalCount
      totalPages.value = result.pagination.totalPages
      currentPage.value = result.pagination.currentPage
      pageSize.value = result.pagination.pageSize
    } catch (error) {
      if (activeId !== requestId || disposed || activeController.signal.aborted) return
      originalData.value = []
      totalCount.value = 0
      totalPages.value = 0
      errorMessage.value = error instanceof Error ? error.message : 'Ошибка загрузки реестра'
    } finally {
      if (activeId === requestId && !disposed) {
        loading.value = false
        controller = null
      }
    }
  }

  watch(search, () => {
    // Invalidate even before the debounce expires, so old results cannot flash.
    cancelPending()
    currentPage.value = 1
    loading.value = true
    errorMessage.value = ''
    if (!search.value.trim()) {
      void loadData(1, pageSize.value)
      return
    }
    searchTimer = setTimeout(() => {
      searchTimer = null
      void loadData(1, pageSize.value)
    }, 350)
  }, { flush: 'sync' })

  function clearSearch(): void {
    if (search.value !== '') search.value = ''
  }

  async function applySearch(): Promise<void> {
    await loadData(1, pageSize.value)
  }

  async function changePage(page: number): Promise<void> {
    if (searchTimer !== null) return applySearch()
    if (page < 1 || page > totalPages.value) return
    await loadData(page, pageSize.value)
  }

  async function changePageSize(size: number): Promise<void> {
    await loadData(1, size)
  }

  async function reloadCurrentPage(): Promise<void> {
    await loadData(searchTimer !== null ? 1 : currentPage.value, pageSize.value)
  }

  onScopeDispose(() => {
    disposed = true
    cancelPending()
  })

  return {
    loading, errorMessage, originalData, totalCount, totalPages,
    currentPage, pageSize, search, loadData, changePage, changePageSize,
    reloadCurrentPage, clearSearch, applySearch,
  }
}
