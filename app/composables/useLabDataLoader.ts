// app/composables/useLabDataLoader.ts

export interface IncomingControlReference {
  id: number
  name: string
}

export interface IncomingControlRecord {
  id: number

  samplingActNumber: string
  samplingDate: string
  samplingDocumentPath: string | null
  note: string | null

  plpId: number
  inspectorId: number
  testLocationId: number
  receiptMaterialId: number
  testProtocolId: number | null

  businessRulesVersion: number
  importSource: string | null
  importRowNumber: number | null

  createdAt: string
  editedAt: string | null
  authorEmail: string | null
  editorEmail: string | null

  plp: IncomingControlReference
  inspector: IncomingControlReference

  testLocation: IncomingControlReference & {
    testObject: IncomingControlReference
  }

  receiptMaterial: {
    id: number
    receiptDate: string
    qualityDocumentDate: string | null
    qualityDocumentNumber: string | null
    qualityDocumentPath: string | null
    note: string | null
    materialId: number
    manufacturerId: number | null

    material: IncomingControlReference
    manufacturer: IncomingControlReference | null
  }

  testProtocol: {
    id: number
    protocolNumber: string | null
    protocolDate: string | null
    protocolDocumentPath: string | null
    testResult: string | null
    note: string | null
  } | null
}

interface IncomingControlListResponse {
  success: boolean
  data: IncomingControlRecord[]
  error?: string
  pagination: {
    currentPage: number
    pageSize: number
    totalCount: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export const useLabDataLoader = () => {
  const loading = ref(false)
  const isLoading = ref(false)

  const originalData = ref<IncomingControlRecord[]>([])

  const totalCount = ref(0)
  const totalPages = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(25)

  const search = ref('')

  const loadingToastId = ref<string | number | null>(null)

  const {
    showTost,
    removeToast,
  } = useAppToasts()


  const loadData = async (
    page: number = currentPage.value,
    size: number = pageSize.value,
  ) => {
    if (isLoading.value) {
      return
    }

    isLoading.value = true
    loading.value = true

    const toastId = showTost(
      '📥 Загрузка данных...',
      'Пожалуйста, подождите',
      'info',
      'heroicons:arrow-path-rounded-square-solid',
      1000,
    )

    loadingToastId.value = toastId.id

    try {
      const result =
        await $fetch<IncomingControlListResponse>(
          '/api/incoming-control',
          {
            query: {
              page,
              pageSize: size,
              search:
                search.value.trim() || undefined,
            },
          },
        )

      if (!result.success) {
        throw new Error(
          result.error ||
          'Не удалось загрузить данные',
        )
      }

      originalData.value = result.data

      totalCount.value =
        result.pagination.totalCount

      totalPages.value =
        result.pagination.totalPages

      currentPage.value =
        result.pagination.currentPage

      pageSize.value =
        result.pagination.pageSize

      return {
        success: true,
        data: originalData.value,
        totalCount: totalCount.value,
        totalPages: totalPages.value,
        currentPage: currentPage.value,
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Неизвестная ошибка'

      console.error(
        '[useLabDataLoader] Ошибка загрузки:',
        error,
      )

      showTost(
        '❌ Ошибка загрузки',
        message,
        'error',
        'i-heroicons-exclamation-triangle',
        5000,
      )

      return {
        success: false,
        error: message,
      }
    } finally {
      if (loadingToastId.value !== null) {
        removeToast(loadingToastId.value)
      }

      loadingToastId.value = null
      loading.value = false
      isLoading.value = false
    }
  }


  const changePage = async (
    page: number,
  ) => {
    if (
      page < 1 ||
      page > totalPages.value
    ) {
      return
    }

    return await loadData(
      page,
      pageSize.value,
    )
  }


  const changePageSize = async (
    size: number,
  ) => {
    if (size < 1) {
      return
    }

    return await loadData(
      1,
      size,
    )
  }


  const reloadCurrentPage = async () => {
    return await loadData(
      currentPage.value,
      pageSize.value,
    )
  }


  return {
    loading,
    originalData,

    totalCount,
    totalPages,
    currentPage,
    pageSize,

    search,

    loadData,
    changePage,
    changePageSize,
    reloadCurrentPage,
  }
}
