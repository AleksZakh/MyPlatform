<!-- pages/lab-tests/index.vue -->
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-2">Лабораторные исследования</h1>
    <p class="text-gray-600 mb-6">Данные из реестра испытаний</p>
    
    <!-- Панель управления -->
    <div class="bg-gray-50 rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center justify-between">
        <!-- Поиск -->
        <div class="flex-1 min-w-50">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Поиск по всем полям..."
            class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <!-- Кнопка выбора столбцов -->
        <div class="relative">
          <button
            @click="showColumnSelector = !showColumnSelector"
            class="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
          >
            <span>📋</span> Выбрать столбцы
            <span>{{ showColumnSelector ? '▲' : '▼' }}</span>
          </button>
          
          <!-- Панель выбора столбцов -->
          <div
            v-if="showColumnSelector"
            class="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto"
          >
            <div class="p-3 border-b bg-gray-50 font-medium">Выберите столбцы для отображения</div>
            <div class="p-2">
              <label class="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" v-model="selectAll" @change="toggleAllColumns" class="w-4 h-4">
                <span class="font-medium">Выбрать все</span>
              </label>
              <hr class="my-1">
              <label
                v-for="header in headers"
                :key="header"
                class="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
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
        
        <!-- Информация -->
        <div class="text-sm text-gray-500">
          Всего записей: {{ filteredData.length }} из {{ originalData.length }}
        </div>
      </div>
    </div>
    
    <!-- Таблица данных -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p class="mt-2 text-gray-600">Загрузка данных...</p>
    </div>
    
    <div v-else-if="filteredData.length === 0" class="text-center py-12 text-gray-500">
      <p>Нет данных, соответствующих критериям поиска</p>
    </div>
    
    <div v-else class="overflow-x-auto shadow-md rounded-lg">
      <table class="min-w-full bg-white border border-gray-200 text-sm">
        <thead class="bg-gray-100 sticky top-0">
          <tr>
            <th
              v-for="header in visibleHeaders"
              :key="header"
              @click="sortBy(header)"
              class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition select-none"
              :class="{ 'bg-blue-50': sortKey === header }"
            >
              <div class="flex items-center gap-1">
                {{ getColumnLabel(header) }}
                <span v-if="sortKey === header" class="text-blue-500">
                  {{ sortDirection === 'asc' ? '↑' : '↓' }}
                </span>
                <span v-else class="text-gray-300">↕️</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          <tr
            v-for="(row, index) in paginatedData"
            :key="index"
            class="hover:bg-gray-50 transition"
            :class="{ 'bg-red-50': row['Результат испытаний'] === 'Не соответствует' }"
          >
            <td
              v-for="header in visibleHeaders"
              :key="header"
              class="px-4 py-3 text-gray-700 align-top"
              :class="{
                'font-medium text-red-600': header === 'Результат испытаний' && row[header] === 'Не соответствует',
                'font-medium text-green-600': header === 'Результат испытаний' && row[header] === 'Соответствует'
              }"
            >
              {{ formatCellValue(row[header], header) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <!-- Пагинация -->
    <div v-if="filteredData.length > 0" class="flex justify-between items-center mt-4">
      <div class="text-sm text-gray-600">
        Показано {{ startIndex + 1 }} - {{ endIndex }} из {{ filteredData.length }}
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

// Закрытие селектора при клике вне (простой способ через document)
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const selectorButton = document.querySelector('.relative');
    if (selectorButton && !selectorButton.contains(target)) {
      showColumnSelector.value = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
});

async function loadData() {
  loading.value = true;
  try {
    const response = await fetch('/api/lab-tests');
    const result = await response.json();
    
    if (result.success) {
      originalData.value = result.data;
      headers.value = result.headers;
      
      // По умолчанию показываем все столбцы
      visibleColumns.value = [...headers.value];
      
      console.log(`Загружено ${originalData.value.length} записей`);
    } else {
      console.error('Ошибка загрузки:', result.error);
    }
  } catch (error) {
    console.error('Ошибка:', error);
  } finally {
    loading.value = false;
  }
}

function getColumnLabel(header: string): string {
  return columnLabels[header] || header;
}

function formatCellValue(value: string | undefined, header: string): string {
  if (!value) return '—';
  
  // Обрезаем длинные значения
  if (value.length > 100 && header !== 'Примечание') {
    return value.substring(0, 100) + '…';
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
  const data = [...filteredData.value];
  const key = sortKey.value;
  const direction = sortDirection.value;
  
  data.sort((a, b) => {
    let aVal = a[key] || '';
    let bVal = b[key] || '';
    
    // Специальная обработка для дат
    if (key.includes('Дата') && aVal && bVal) {
      const dateA = new Date(aVal.split('.').reverse().join('-'));
      const dateB = new Date(bVal.split('.').reverse().join('-'));
      if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) {
        return direction === 'asc' 
          ? dateA.getTime() - dateB.getTime()
          : dateB.getTime() - dateA.getTime();
      }
    }
    
    // Обычное строковое сравнение
    aVal = String(aVal).toLowerCase();
    bVal = String(bVal).toLowerCase();
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
  
  return data;
});

// Видимые столбцы
const visibleHeaders = computed(() => {
  return headers.value.filter(h => visibleColumns.value.includes(h));
});

// Пагинация
const totalPages = computed(() => Math.ceil(sortedData.value.length / itemsPerPage.value));
const startIndex = computed(() => (currentPage.value - 1) * itemsPerPage.value);
const endIndex = computed(() => Math.min(startIndex.value + itemsPerPage.value, sortedData.value.length));
const paginatedData = computed(() => sortedData.value.slice(startIndex.value, endIndex.value));

function sortBy(header: string) {
  if (sortKey.value === header) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = header;
    sortDirection.value = 'asc';
  }
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--;
}

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++;
}

function toggleAllColumns() {
  if (selectAll.value) {
    visibleColumns.value = [...headers.value];
  } else {
    visibleColumns.value = [];
  }
}

// Следим за изменениями visibleColumns для обновления selectAll
watch(visibleColumns, (newVal) => {
  selectAll.value = newVal.length === headers.value.length;
}, { deep: true });

// Сброс страницы при изменении фильтров
watch([searchQuery, sortKey, sortDirection, itemsPerPage], () => {
  currentPage.value = 1;
});
</script>

<style scoped>
.sticky {
  position: sticky;
  top: 0;
  /* z-index: 10; */
}

/* Стили для полос прокрутки */
.overflow-x-auto::-webkit-scrollbar {
  height: 8px;
}

.overflow-x-auto::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.overflow-x-auto::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>