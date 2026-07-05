// composables/useFilters.ts

// ======= ИНТЕРФЕЙС ФИЛЬТРОВ =======
export interface Filters {
  // Текстовые поля
  plp: string
  objectName: string
  samplingActNumber: string
  samplingPlace: string
  personProvidedSample: string
  materialName: string
  qualityDocument: string
  manufacturer: string
  protocolNumber: string
  note: string
  
  // Даты (диапазоны)
  samplingDateFrom: string
  samplingDateTo: string
  materialReceiptDateFrom: string
  materialReceiptDateTo: string
  protocolDateFrom: string
  protocolDateTo: string
  
  // Выпадающие списки
  testResult: string
}

// ======= НАЧАЛЬНОЕ СОСТОЯНИЕ ФИЛЬТРОВ =======
const defaultFilters: Filters = {
  plp: '',
  objectName: '',
  samplingActNumber: '',
  samplingPlace: '',
  personProvidedSample: '',
  materialName: '',
  qualityDocument: '',
  manufacturer: '',
  protocolNumber: '',
  note: '',
  samplingDateFrom: '',
  samplingDateTo: '',
  materialReceiptDateFrom: '',
  materialReceiptDateTo: '',
  protocolDateFrom: '',
  protocolDateTo: '',
  testResult: ''
}

// ======= КОМПОЗАБЛ =======
export const useFilters = () => {
  // ======= СОСТОЯНИЯ =======
  const filters = ref<Filters>({ ...defaultFilters })
  const isFilterActive = ref(false)
  const activeFiltersCount = computed(() => {
    return Object.values(filters.value).filter(v => v !== '' && v !== null && v !== undefined).length
  })
  
  const hasActiveFilters = computed(() => {
    return activeFiltersCount.value > 0
  })

  // ======= МЕТОДЫ =======
  // ======= МЕТОДЫ УПРАВЛЕНИЯ ПАНЕЛЬЮ =======
  function openFilterPanel() {
    isFilterActive.value = true
  }
  
  function closeFilterPanel() {
    isFilterActive.value = false
  }
  
  function toggleFilterPanel() {
    isFilterActive.value = !isFilterActive.value
  }
  
  // Применение фильтров
  function applyFilters(newFilters?: Partial<Filters>) {
    if (newFilters) {
      filters.value = { ...filters.value, ...newFilters }
    }
    isFilterActive.value = true
    console.log('✅ Фильтры применены:', filters.value)
  }

  // Сброс всех фильтров
  function resetFilters() {
    filters.value = { ...defaultFilters }
    isFilterActive.value = false
    console.log('🔄 Фильтры сброшены')
  }

  // Обновление конкретного фильтра
  function updateFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    filters.value[key] = value
  }

  // Проверка, активен ли конкретный фильтр
  function isFilterActiveForKey<K extends keyof Filters>(key: K): boolean {
    const value = filters.value[key]
    return value !== '' && value !== null && value !== undefined
  }

  // Получение параметров для запроса к API
  function getFilterParams(): URLSearchParams {
    const params = new URLSearchParams()
    const f = filters.value
    
    // Добавляем только непустые значения
    Object.entries(f).forEach(([key, value]) => {
      if (value && value !== '' && value !== null && value !== undefined) {
        params.append(key, value.toString())
      }
    })
    
    return params
  }

  // Получение объекта фильтров для отправки на сервер
  function getFilterObject(): Record<string, string> {
    const result: Record<string, string> = {}
    const f = filters.value
    
    Object.entries(f).forEach(([key, value]) => {
      if (value && value !== '' && value !== null && value !== undefined) {
        result[key] = value.toString()
      }
    })
    
    return result
  }

  // Описание активных фильтров для отображения (например, в toast)
  function getActiveFiltersDescription(): string {
    const active = Object.entries(filters.value)
      .filter(([_, value]) => value && value !== '' && value !== null && value !== undefined)
    
    if (active.length === 0) return 'Нет активных фильтров'
    
    // Маппинг названий полей для красивого отображения
    const fieldLabels: Record<string, string> = {
      plp: 'ПЛП',
      objectName: 'Объект',
      samplingActNumber: '№ акта',
      samplingPlace: 'Место отбора',
      personProvidedSample: 'Кто предоставил',
      materialName: 'Материал',
      qualityDocument: 'Документ',
      manufacturer: 'Изготовитель',
      protocolNumber: '№ протокола',
      note: 'Примечание',
      samplingDateFrom: 'Дата отбора (с)',
      samplingDateTo: 'Дата отбора (по)',
      materialReceiptDateFrom: 'Дата поступления (с)',
      materialReceiptDateTo: 'Дата поступления (по)',
      protocolDateFrom: 'Дата протокола (с)',
      protocolDateTo: 'Дата протокола (по)',
      testResult: 'Результат'
    }
    
    return active
      .map(([key, value]) => `${fieldLabels[key] || key}: "${value}"`)
      .join(', ')
  }

  // ======= ВОЗВРАЩАЕМ ПУБЛИЧНЫЙ API =======
  return {
    // Состояния (только для чтения)
    filters: readonly(filters),
    isFilterActive: readonly(isFilterActive),
    hasActiveFilters,
    activeFiltersCount,
    
    // Методы
    applyFilters,
    resetFilters,
    updateFilter,
    isFilterActiveForKey,
    getFilterParams,
    getFilterObject,
    getActiveFiltersDescription,
    openFilterPanel,    // 👈 Добавляем
    closeFilterPanel,   // 👈 Добавляем
    toggleFilterPanel,

  }
}