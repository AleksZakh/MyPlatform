<!-- Контент для первой вкладки -->
<template>
    <!-- 
     class="max-w-[1440px] "
    Родителю этого блока ОБЯЗАТЕЛЬНО задайте overflow-hidden и h-full (или max-h-screen) -->
    <div class="w-full max-h-[82vh] min-h-[80vh] flex flex-col overflow-hidden mx-auto bg-white p-3 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)]">
        <div class="flex flex-wrap gap-4 items-center justify-between py-1">
          <!-- ========================================================================================================================== -->
          <!-- ========================================================================================================================== -->
          <!-- Поиск -->
          <div class="flex-1 min-w-50">
              <input
                  v-model="searchQuery"
                  type="text"
                  placeholder="Поиск по всем полям..."
                  class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
          </div>
          <!-- _____ фильтр ______ -->
          <!-- Фильтр (ТЕПЕРЬ ЭТО КОМПОНЕНТ) -->
          <div class="flex align-baseline relative p-1 rounded-md">
            <UTooltip text="Фильтр записей" :kbds="['meta', 'Shift', 'F']">
              <UButton
                icon="streamline-freehand-color:filter"
                color="neutral"
                variant="outline"
                :ui="{ leadingIcon: 'text-primary' }"
                type="button" 
                class="flex bg-transparent hover:bg-gray-100 p-3"  
                @click.prevent.stop="toggleFilter"
              />
            </UTooltip>
            
            <Transition name="fade-slide">
              <FilterPanel 
                v-if="isFilterActive"
                v-model="filters"
                @apply="applyFilters"
                @reset="resetFilters"
              />
            </Transition>
          </div>
        
          <!-- Кнопка выбора столбцов -->
          <div class="relative">
            <UButton
              @click.stop.prevent="columnSelectorButtonClick"
              class="px-4 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              title="Выбор отображаемых столбцов"
            >
              <Icon :name="'streamline-freehand-color:form-validation-check-square-1'" size="24" />
              Выбрать столбцы
              <span>{{ showColumnSelector ? '▲' : '▼' }}</span>
            </UButton>
            
            <!-- Панель выбора столбцов -->
            <div
              v-if="showColumnSelector"
              class="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto custom-scrollbar"
            >
              <div class="p-3 border-b bg-gray-50 font-medium">Выберите столбцы для отображения</div>
              <div class="p-2">
                <label class="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" v-model="selectAll" @change="toggleAllColumns"  class="w-4 h-4">
                  <span class="font-medium">Выбрать все</span>
                </label>
                <hr class="my-1">
                <label
                  v-for="header in headers"
                  :key="header"
                  class="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
                  @click.stop
                >
                  <input
                    type="checkbox"
                    v-model="visibleColumns"
                    :value="header"
                    class="w-4 h-4"
                  >
                  <span>{{ getColumnLabel(header) }}</span>
                </label>
              </div>
            </div>
          </div>

          <!-- _____ добавление новой записи _______-->
          <div>
            <UTooltip text="Создать новую запись" :kbds="['Alt','Shift', 'N']">
              <UButton
                @click="open('create')"
                class="px-4 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              >
              <Icon :name="'streamline-freehand-color:edit-pen-write-paper'" size="24"/>
              Создать запись
              </UButton>
            </UTooltip>
          </div>
          
          <!-- Информация -->
          <!-- Информация о записях -->
          <div class="text-sm text-gray-500 flex items-center gap-4">
            <span>📊 Всего записей в БД: <strong>{{ totalCount }}</strong></span>
            <span v-if="isFilterActive || hasActiveFilters" class="text-blue-600">
              🔍 Отфильтровано: <strong>{{ originalData.length }}</strong>
            </span>
            <span v-if="hasActiveFilters" class="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              Фильтр активен
            </span>
          </div>
        <!-- ========================================================================================================================== -->
        <!-- ========================================================================================================================== -->
      </div>
      <!-- Таблица данных -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p class="mt-2 text-gray-600">Загрузка данных...</p>
    </div>
    
    <div v-else-if="filteredData.length === 0" class="text-center py-12 text-gray-500">
      <p>Нет данных, соответствующих критериям поиска</p>
    </div>

    <div v-else class="overflow-x-auto custom-scrollbar shadow-md rounded-lg overflow-y-auto" style="max-height: 70vh;">
      <table class="min-w-full bg-white border border-gray-200 text-sm">
        <thead class="bg-gray-100 sticky top-0">
          <tr>
            <th
              v-for="header in visibleHeaders"
              :key="header"
              @click="sortBy(header)"
              class="px-2
                    py-3 
                    text-left 
                    text-xs 
                    font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition select-none"
              :class="{ 'bg-blue-50': sortKey === header }"
            >
              <div class="flex items-center gap-2">
                {{ getColumnLabel(header) }}
                <span v-if="sortKey === header" class="text-lg">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
                <span v-else class="text-gray-300 text-md"><Icon :name="'marketeq:up-down-arrow-2'" size="16" /></span>
              </div>
            </th>
          </tr>
        </thead>
        <UContextMenu :items="items" :ui="{ content: 'w-48' }">
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="(row, index) in filteredData"
              :key="index"
              class="hover:bg-gray-50 transition"
              :class="{ 'bg-red-50': row['Результат испытаний'] === 'Не соответствует',
                'bg-green-50': isRowSelected(index),
                'hover:bg-gray-50': !isRowSelected(index)
              }"            
              @click="selectRow(index)"
              @dblclick.stop.prevent="handleDblClick(index, row)"
            >
              <td
                v-for="header in visibleHeaders"
                :key="header"
                class="px-2 py-1 text-gray-700 align-top"
                :class="{
                  'font-medium text-red-600': header === 'Результат испытаний' && row[header] === 'Не соответствует',
                  'font-medium text-green-600': header === 'Результат испытаний' && row[header] === 'Соответствует'
                }"
                :title="formatCellValue(row[header], header, 'title')"
              >
                {{ formatCellValue(row[header], header) }}
              </td>
            </tr>
          </tbody>
        </UContextMenu>
      </table>
    </div>

    <!-- Пагинация -->
    <div v-if="filteredData.length > 0" class="flex justify-between items-center mt-4">
      <div class="text-sm text-gray-600">
        Показано {{ startIndex }} - {{ endIndex }} из {{ totalCount }}
      </div>
      <div class="flex gap-2">
        <button
          @click="prevPage"
          :disabled="currentPage === 1"
          class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Назад
        </button>
        <select
          v-model="itemsPerPage"
          class="px-2 py-1 border border-gray-300 rounded"
        >
          <option :value="10">10</option>
          <option :value="25">25</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <span class="px-3 py-1">
          Страница {{ currentPage }} из {{ totalPages }}
        </span>
        <button
          @click="nextPage"
          :disabled="currentPage === totalPages"
          class="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Вперед →
        </button>
      </div>
    </div>
  </div>
    
</template>

<script setup lang="ts">

  import sortData from '../../../utils/dataSort';
  import  labModal  from '~/components/lab/labModal.vue';
  import type { ContextMenuItem } from '@nuxt/ui';
  import FilterPanel from '~/components/lab/FilterPanel.vue';
  import { onClickOutside } from '@vueuse/core';

  // ======= СОСТОЯНИЯ ФИЛЬТРА =======
  const isFilterActive = ref(false)
  const panelRef = ref<HTMLElement | null>(null)
  // 👇 НОВЫЙ ОБЪЕКТ ФИЛЬТРОВ (соответствует полям БД)
  const filters = ref({
    // Текстовые поля
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
    // Даты
    samplingDateFrom: '',
    samplingDateTo: '',
    materialReceiptDateFrom: '',
    materialReceiptDateTo: '',
    protocolDateFrom: '',
    protocolDateTo: '',
    // Выпадающий список
    testResult: ''
  })

  const count = ref(0);
  const toast = useToast();
  const overlay = useOverlay();
  const modal = overlay.create(labModal);
  const rowSelectedId = ref<number | null>(null);
  const totalCount = ref(0)      // Всего записей в БД
  const totalPages = ref(0)      // Всего страниц
  const loadingToastId = ref<string | number | null>(null)

  const items: ContextMenuItem[][] = [
    [
      {
        label: 'Открыть',
        icon: 'streamline-freehand-color:kindle-read-document-hold'
      },
      {
        label: 'Копировать',
        icon: 'streamline-freehand-color:layers-bring-backward'
      },
      {
        label: 'Изменить',
        icon: 'streamline-freehand-color:edit-pencil'
      }
    ],
    [
      {
        label: 'Удалить',
        color: 'error' as const,
        icon: 'streamline-freehand-color:delete-bin-2'
      }
    ]
  ];

  // ======= МЕТОДЫ ФИЛЬТРА =======
  function applyFilters(appliedFilters: any) {
    console.log('✅ Применены фильтры:', appliedFilters)
    
    // Подсчитываем количество активных фильтров
    const activeFiltersCount = Object.values(appliedFilters).filter(v => v !== '' && v !== null && v !== undefined).length
    
    // Показываем toast с информацией
    toast.add({
      title: '🔍 Фильтры применены',
      description: `Найдено ${originalData.value.length} записей из ${totalCount.value} (активных фильтров: ${activeFiltersCount})`,
      color: 'success',
      icon: 'i-heroicons-check-circle',
      duration: 3000
    })
    
    currentPage.value = 1
    loadData()
    isFilterActive.value = false
  }

  // ======= СБРОС ФИЛЬТРОВ =======
  function resetFilters() {
    console.log('🔄 Фильтры сброшены')
    
    toast.add({
      title: '🔄 Фильтры сброшены',
      description: `Показаны все ${totalCount.value} записей`,
      color: 'info',
      icon: 'i-heroicons-arrow-path',
      duration: 3000
    })
    
    currentPage.value = 1
    loadData()
    isFilterActive.value = false
  }
  function toggleFilter() {
    isFilterActive.value = !isFilterActive.value
  }

  // Функция для проверки, выбрана ли строка
  const isRowSelected = (index: number): boolean => {
    return rowSelectedId.value === index;
  };

  // Функция для выбора/снятия выбора строки
  const selectRow = (index: number): void => {
    // Если кликнули на ту же строку - снимаем выделение
    if (rowSelectedId.value === index) {
      rowSelectedId.value = null;
      selectedRecord.value = null
    } else {
      rowSelectedId.value = index;
      selectedRecord.value = index;
    }
    // console.log('selectedRecord === ', selectedRecord)
  };


// Функция, которая будет вызываться кнопкой "Создать" или двойным кликом по таблице
// Функция для двойного клика
function handleDblClick(index:any, row:any) {
  // Сохраняем строку перед открытием
  selectedRecord.value = {
    ...row, // копируем все поля строки
    index, // добавляем индекс строки
    action: 'edit' // добавляем признак
  }
  
  // Небольшая задержка для гарантии
  setTimeout(() => {
    open()
  }, 50)
}

async function open(action: 'create' | 'edit' = 'edit') {
  const record = {
    ...(selectedRecord.value || {}),
    action
  }
  selectedRecord.value = record

  const instance = modal.open({
    count: count.value,
    selectedRecord: record
  })

  const shouldIncrement = await instance.result
  if (shouldIncrement) {
    // ...
  }
}

// 3. Следим за кликами вне этого элемента
onClickOutside(panelRef, () => {
  // Закрываем фильтр при клике вне панели, если он активен
  // if (isFilterActive.value) {
  //   isFilterActive.value = false
  // }
})

const loading = ref(true);
const originalData = ref<Record<string, string>[]>([]);
const headers = ref<string[]>([]);

// Состояние таблицы
const searchQuery = ref('');
const sortKey = ref('Дата отбора проб');
const sortDirection = ref<'asc' | 'desc'>('desc');
const currentPage = ref(1);
const itemsPerPage = ref(25);
const showColumnSelector = ref(false);
const visibleColumns = ref<string[]>([]);
const selectAll = ref(false);
const isModalOpen = ref(false)
const selectedRecord = ref<any>(null)

// Человеко-читаемые названия столбцов
const columnLabels: Record<string, string> = {
  'ПЛП': 'ПЛП',
  'Наименование объект': 'Объект',
  'Номер акта отбора проб': '№ Акта',
  'Дата отбора проб': 'Дата отбора',
  'Место отбора проб': 'Место отбора',
  'Лицо, предоставившее пробу': 'Кто предоставил',
  'Дата поступления материала': 'Дата поступления',
  'Наименование материала': 'Материал',
  'Документ о качестве': 'Документ',
  'Предприятие-изготовитель': 'Изготовитель',
  'Номер протокола': '№ Протокола',
  'Дата протокола': 'Дата протокола',
  'Результат испытаний': 'Результат',
  'Примечание': 'Примечание'
};

// Загрузка данных
onMounted(async () => {
  await loadData();
});

// const rowDblClick = () => {
//   console.log('Двойной клик по строке');
// }

// Закрытие селектора при клике вне (простой способ через document)
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    
    const target = event.target as HTMLElement;
    const selectorButton = document.querySelector('.relative');
    if (selectorButton && !selectorButton.contains(target)) {
        // console.log('Клик по документу:');
        showColumnSelector.value = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
});

function columnSelectorButtonClick() { // изменение статуса отображения окна выбора столбцов
    showColumnSelector.value = !showColumnSelector.value;
    
    // console.log('Клик по кнопке выбора столбцов', showColumnSelector.value);
}

// ======= НОВАЯ ФУНКЦИЯ ЗАГРУЗКИ (минимальные изменения) =======
async function loadData() {
  const toastId = toast.add({
    title: '⏳ Загрузка данных...',
    description: 'Пожалуйста, подождите',
    color: 'info',
    icon: 'i-heroicons-arrow-path',
    duration: 0, // Не закрывается автоматически
  })
  
  loading.value = true
  loadingToastId.value = toastId.id
  
  try {
    const params = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(itemsPerPage.value),
      sortBy: sortKey.value,
      sortOrder: sortDirection.value
    })
    
    // Добавляем фильтры
    const f = filters.value
    if (f.plp) params.append('plp', f.plp)
    if (f.objectName) params.append('objectName', f.objectName)
    if (f.samplingActNumber) params.append('samplingActNumber', f.samplingActNumber)
    if (f.samplingPlace) params.append('samplingPlace', f.samplingPlace)
    if (f.personProvidedSample) params.append('personProvidedSample', f.personProvidedSample)
    if (f.materialName) params.append('materialName', f.materialName)
    if (f.qualityDocument) params.append('qualityDocument', f.qualityDocument)
    if (f.manufacturer) params.append('manufacturer', f.manufacturer)
    if (f.protocolNumber) params.append('protocolNumber', f.protocolNumber)
    if (f.note) params.append('note', f.note)
    if (f.samplingDateFrom) params.append('samplingDateFrom', f.samplingDateFrom)
    if (f.samplingDateTo) params.append('samplingDateTo', f.samplingDateTo)
    if (f.materialReceiptDateFrom) params.append('materialReceiptDateFrom', f.materialReceiptDateFrom)
    if (f.materialReceiptDateTo) params.append('materialReceiptDateTo', f.materialReceiptDateTo)
    if (f.protocolDateFrom) params.append('protocolDateFrom', f.protocolDateFrom)
    if (f.protocolDateTo) params.append('protocolDateTo', f.protocolDateTo)
    if (f.testResult) params.append('testResult', f.testResult)

    const response = await fetch(`/api/incoming-control/?${params}`)
    const result = await response.json()
    
    if (result.success) {
      // Сохраняем данные
      toast.remove(loadingToastId.value)
      originalData.value = result.data
      
      if (originalData.value.length > 0 && originalData.value[0]) {
        headers.value = Object.keys(originalData.value[0])
        if (visibleColumns.value.length === 0) {
          visibleColumns.value = [...headers.value]
        }
      } else {
        headers.value = []
        visibleColumns.value = []
      }
      
      if (result.pagination) {
        totalCount.value = result.pagination.totalCount
        totalPages.value = result.pagination.totalPages
      }
      
      // ✅ ПОКАЗЫВАЕМ TOAST ПРИ ЗАГРУЗКЕ (если есть фильтры)
      if (hasActiveFilters.value) {
        const activeFiltersCount = Object.values(filters.value).filter(v => v !== '' && v !== null && v !== undefined).length
        toast.add({
          title: '📊 Результаты фильтрации',
          description: `Найдено ${originalData.value.length} записей из ${totalCount.value} (фильтров: ${activeFiltersCount})`,
          color: 'success',
          icon: 'i-heroicons-funnel',
          duration: 5000
        })
      }
      
      console.log(`✅ Загружено ${originalData.value.length} записей из ${totalCount.value}`)
    } else {
      console.error('❌ Ошибка загрузки:', result.error)
      toast.remove(loadingToastId.value)
      
      toast.add({
        title: '❌ Ошибка загрузки',
        description: result.error || 'Не удалось загрузить данные',
        color: 'error',
        icon: 'i-heroicons-exclamation-triangle',
        duration: 5000
      })
    }
  } catch (error) {
    console.error('❌ Ошибка:', error)
    
    toast.add({
      title: '❌ Ошибка',
      description: error instanceof Error ? error.message : 'Неизвестная ошибка',
      color: 'error',
      icon: 'i-heroicons-exclamation-triangle',
      duration: 5000
    })
  } finally {
    loading.value = false
  }
}



const hasActiveFilters = computed(() => {
  const f = filters.value
  return !!(
    f.plp ||
    f.objectName ||
    f.samplingActNumber ||
    f.samplingPlace ||
    f.personProvidedSample ||
    f.materialName ||
    f.qualityDocument ||
    f.manufacturer ||
    f.protocolNumber ||
    f.note ||
    f.samplingDateFrom ||
    f.samplingDateTo ||
    f.materialReceiptDateFrom ||
    f.materialReceiptDateTo ||
    f.protocolDateFrom ||
    f.protocolDateTo ||
    f.testResult
  )
})

function getColumnLabel(header: string): string {
    // console.log('getColumnLabel:', header);
  return columnLabels[header] || header;
}

function formatCellValue(value: string | undefined, header: string, contekst = ''): string {
  if (!value) return '—';
  
  // Обрезаем длинные значения
  if (value.length > 15 && contekst != 'title') {
    return value.substring(0, 10) + '…';
  }
  return value;
}

// Фильтрация данных
const filteredData = computed(() => {
  if (!searchQuery.value.trim()) {
    return [...originalData.value];
  }
  
  const query = searchQuery.value.toLowerCase();
  return originalData.value.filter(row => {
    return Object.values(row).some(value =>
      value?.toLowerCase().includes(query)
    );
  });
});

// Сортировка
const sortedData = computed(() => {
  return sortData(filteredData.value, {
    key: sortKey.value,
    direction: sortDirection.value
  });
});

// Видимые столбцы
const visibleHeaders = computed(() => {
  return headers.value.filter(h => visibleColumns.value.includes(h));
});

// Пагинация
// ======= ЗАМЕНИТЬ на это =======
// Теперь данные уже готовы к показу
const displayData = computed(() => originalData.value)

// Информация для пагинации
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value + 1)
const endIndex = computed(() => Math.min(startIndex.value + originalData.value.length - 1, totalCount.value))

function sortBy(header: string) {
  if (sortKey.value === header) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = header
    sortDirection.value = 'asc'
  }
  loadData() // 👈 Перезагружаем с новой сортировкой
}

// ======= МЕТОДЫ ПАГИНАЦИИ (минимальные изменения) =======
function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
    loadData()  // 👈 Загружаем новую страницу
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
    loadData()  // 👈 Загружаем новую страницу
  }
}

watch(itemsPerPage, (newSize, oldSize) => {
  // Проверяем, что значение действительно изменилось
  if (newSize !== oldSize && oldSize !== undefined) {
    currentPage.value = 1
    loadData()
  }
})

//
function toggleAllColumns() {
    // console.log('колонки================')
  if (selectAll.value) {
    visibleColumns.value = [...headers.value];
  } else {
    visibleColumns.value = [];
  }
};

// Следим за изменениями visibleColumns для обновления selectAll
watch(visibleColumns, (newVal) => {
    // console.log('visibleColumns изменились:', newVal);
    selectAll.value = newVal.length === headers.value.length;
}, { deep: true });

// Сброс страницы при изменении фильтров
watch([searchQuery, sortKey, sortDirection, itemsPerPage], () => {
    currentPage.value = 1;
});
</script>

<style scoped>
  .panel-wrapper {
  position: absolute;
  z-index: 20;
  right: -30px;
  width: max-content;
  background-color: white;
  border-radius: 15px;
  /* border: 1px solid lightgray; */
  top: 38px;
  box-shadow: 0px 2px 10px 5px rgba(163, 163, 163, 0.31); 
  /* Добавили мягкую тень для красоты */
}

/* ─── СТИЛИ АНИМАЦИИ ВЫПАДЕНИЯ (Vue Transition) ─── */

/* Классы active задают скорость и тип анимации при появлении и исчезновении */
.fade-slide-enter-active {
  transition: all 1s cubic-bezier(0.16, 1, 0.3, 1); /* Эффект "плавного торможения" (ease-out) */
}

.fade-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.7, 0, 0.84, 0); /* Более быстрое исчезновение (ease-in) */
}

/* Стартовое состояние при появлении и конечное состояние при скрытии */
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px); /* Панель плавно вылетает сверху вниз на 8 пикселей */
}

  .row_selected{
    background: #000;
  }
  .sticky {
      position: sticky;
      top: 0;
      z-index: 10;
  }

  
</style>