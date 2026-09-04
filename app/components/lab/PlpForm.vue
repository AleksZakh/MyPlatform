<template>
  <div class=" bg-gray-50 p-0">
    <!-- Основная карточка -->
    <div class=" mx-auto bg-white rounded-xl shadow-lg p-6">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">
        ПЛП (передвижные лабораторные пункты)
      </h1>

      <!-- Форма добавления/редактирования -->
      <form
        @submit.prevent="savePlp"
        class="bg-gray-50 rounded-lg p-6 mb-8"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Название ПЛП <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentPlp.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите название ПЛП"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Примечание
            </label>
            <input
              v-model="currentPlp.note"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация"
            />
          </div>
        </div>

        <div class="mt-4 flex gap-3">
          <button
            type="submit"
            :class="[
              'px-6 py-2 rounded-md text-white font-medium transition-colors',
              isEditing
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-green-500 hover:bg-green-600',
            ]"
          >
            {{ isEditing ? 'Обновить' : 'Добавить' }}
          </button>
          <button
            v-if="isEditing"
            @click="cancelEdit"
            type="button"
            class="px-6 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>

      <!-- Поиск и таблица -->
      <div>
        <div class="mb-4">
          <div class="relative">
            <input
              v-model="search"
              type="text"
              placeholder="Поиск ПЛП"
              class="w-full px-4 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              class="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        <!-- Таблица -->
        <div
          class="overflow-x-auto shadow-md rounded-lg border max-h-95 border-gray-200"
        >
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50">
              <tr>
                <th
                  v-for="header in headers"
                  :key="header.key"
                  class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                  @click="sortBy(header.key)"
                >
                  <span class="flex items-center gap-1">
                    {{ header.title }}
                    <span v-if="sortKey === header.key" class="text-xs">
                      {{ sortOrder === 'asc' ? '↑' : '↓' }}
                    </span>
                  </span>
                </th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              <tr v-if="filteredPlps.length === 0">
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                  ПЛП не найдены
                </td>
              </tr>
              <tr v-for="plp in paginatedPlps" :key="plp.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {{ plp.name }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {{ plp.note || '—' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span class="text-xs bg-gray-100 px-2 py-1 rounded">
                    {{ plp._count?.samplingTests || 0 }} актов
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click="editPlp(plp)"
                    class="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                    title="Редактировать"
                  >
                    <svg
                      class="w-5 h-5 inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </button>
                  <button
                    @click="deletePlp(plp.id)"
                    class="text-red-600 hover:text-red-900 transition-colors"
                    title="Удалить"
                  >
                    <svg
                      class="w-5 h-5 inline"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Пагинация -->
        <div class="mt-4 flex items-center justify-between">
          <div class="text-sm text-gray-700">
            Показано с {{ (currentPage - 1) * pageSize + 1 }} по
            {{ Math.min(currentPage * pageSize, filteredPlps.length) }}
            из {{ filteredPlps.length }} записей
          </div>
          <div class="flex gap-2">
            <button
              @click="previousPage"
              :disabled="currentPage === 1"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                currentPage === 1
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
              ]"
            >
              Назад
            </button>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                currentPage >= totalPages
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
              ]"
            >
              Вперед
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';

// ============================================
// ИСПОЛЬЗОВАНИЕ TOAST
// ============================================
const { showTost } = useAppToasts();

// ============================================
// СОСТОЯНИЕ
// ============================================

const search = ref('');
const isEditing = ref(false);
const isLoading = ref(false);

// Заголовки таблицы
const headers = [
  { key: 'name', title: 'Название ПЛП' },
  { key: 'note', title: 'Примечание' },
  { key: 'count', title: 'Актов отбора' },
  { key: 'actions', title: 'Действия' },
];

// Сортировка
const sortKey = ref('name');
const sortOrder = ref('asc');

// Пагинация
const currentPage = ref(1);
const pageSize = ref(10);

// Данные
const plps = ref([]);
const totalCount = ref(0);

// Текущий ПЛП для формы
const currentPlp = reactive({
  id: null,
  name: '',
  note: '',
});

// ============================================
// МЕТОДЫ
// ============================================

// Загрузка данных с сервера
async function loadPlps() {
  isLoading.value = true;
  try {
    const response = await $fetch('/api/lab/plp', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
      },
    });
    
    if (response?.success) {
      plps.value = response.data;
      totalCount.value = response.total || 0;
    }
  } catch (error) {
    console.error('Ошибка загрузки ПЛП:', error);
    showTost({
      type: 'error',
      title: 'Ошибка',
      message: 'Не удалось загрузить данные',
    });
  } finally {
    isLoading.value = false;
  }
}

// Фильтрация и сортировка (клиентская)
const filteredPlps = computed(() => {
  let items = plps.value;

  // Поиск
  if (search.value) {
    const query = search.value.toLowerCase();
    items = items.filter((plp) =>
      plp.name.toLowerCase().includes(query) ||
      (plp.note && plp.note.toLowerCase().includes(query))
    );
  }

  // Сортировка
  const key = sortKey.value;
  const order = sortOrder.value;
  items = [...items].sort((a, b) => {
    let aVal = a[key] || '';
    let bVal = b[key] || '';
    
    if (key === 'count') {
      aVal = a._count?.samplingTests || 0;
      bVal = b._count?.samplingTests || 0;
    }
    
    if (typeof aVal === 'string') {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }
    
    if (aVal < bVal) return order === 'asc' ? -1 : 1;
    if (aVal > bVal) return order === 'asc' ? 1 : -1;
    return 0;
  });

  return items;
});

const totalPages = computed(() => {
  return Math.ceil(filteredPlps.value.length / pageSize.value);
});

const paginatedPlps = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredPlps.value.slice(start, end);
});

// Сортировка
const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1;
};

// Пагинация
const previousPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};

// Сохранение ПЛП
const savePlp = async () => {
  if (!currentPlp.name?.trim()) {
    showTost({
      type: 'warning',
      title: 'Предупреждение',
      message: 'Название ПЛП обязательно для заполнения',
    });
    return;
  }

  isLoading.value = true;
  try {
    const url = currentPlp.id 
      ? `/api/lab/plp/${currentPlp.id}` 
      : '/api/lab/plp';
    
    const method = currentPlp.id ? 'put' : 'post';
    
    const response = await $fetch(url, {
      method,
      body: {
        name: currentPlp.name.trim(),
        note: currentPlp.note || null,
      },
    });

    if (response?.success) {
        showTost('Успех!', `Данные успешно обновлены.`, 'success', 'streamline-freehand-color:form-validation-check-double', 3000)
//       showTost({
// type: 'success',
// title: 'Успешно',
// message: currentPlp.id ? 'ПЛП обновлен' : 'ПЛП добавлен',
//       });
      await loadPlps();
      resetForm();
    }
  } catch (error) {
    console.error('Ошибка сохранения ПЛП:', error);
    showTost('Ошибка!', `Не удалось сохранить ПЛП. ${error.message}`, 'error', 'fxemoji:warningsign', 5000);
    // showTost({
    //   type: 'error',
    //   title: 'Ошибка',
    //   message: error.message || 'Не удалось сохранить ПЛП',
    // });
  } finally {
    isLoading.value = false;
  }
};

// Редактирование ПЛП
const editPlp = (plp) => {
  Object.assign(currentPlp, {
    id: plp.id,
    name: plp.name,
    note: plp.note || '',
  });
  isEditing.value = true;
};

// Удаление ПЛП
const deletePlp = async (id) => {
  // Проверка, есть ли связанные акты
  const plp = plps.value.find(p => p.id === id);
  if (plp?._count?.samplingTests > 0) {
    showTost('Невозможно удалить.', `ПЛП используется в ${plp._count.samplingTests} актах отбора проб.`, 'warning', 'fxemoji:warningsign', 5000);
    
    return;
  }

  if (!confirm('Вы уверены, что хотите удалить этот ПЛП?')) return;

  isLoading.value = true;
  try {
    const response = await $fetch(`/api/lab/plp/${id}`, {
      method: 'delete',
    });

    if (response?.success) {
        showTost('Успех!', `ПЛП удален.`, 'success', 'streamline-freehand-color:form-validation-check-double', 3000)
      
      await loadPlps();
    }
  } catch (error) {
    console.error('Ошибка удаления ПЛП:', error);
    showTost('Ошибка!', `${error.message || 'Не удалось удалить ПЛП'}`, 'error', 'fxemoji:warningsign', 5000);
    
  } finally {
    isLoading.value = false;
  }
};

// Сброс формы
const resetForm = () => {
  Object.assign(currentPlp, {
    id: null,
    name: '',
    note: '',
  });
  isEditing.value = false;
};

const cancelEdit = resetForm;

// ============================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================

onMounted(() => {
  loadPlps();
});

// Следим за изменением поиска
watch(search, () => {
  currentPage.value = 1;
  loadPlps();
});

// Следим за изменением страницы и размера страницы
watch([currentPage, pageSize], () => {
  loadPlps();
});

// ============================================
// ЭКСПОРТЫ ДЛЯ ТЕСТИРОВАНИЯ (опционально)
// ============================================
defineExpose({
  loadPlps,
  resetForm,
});
</script>

<style scoped>
/* Дополнительные стили при необходимости */
</style>