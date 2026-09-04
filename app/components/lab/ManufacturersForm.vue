<template>
  <div class="p-0 absolute right-0 left-0 bottom-0 top-0">
    <!-- Основная карточка -->
    <div class="mx-auto bg-white rounded-xl shadow-lg px-4 py-2 absolute top-0 bottom-0 left-0 right-0 flex flex-col justify-start">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">
        Производители
      </h1>

      <!-- Форма добавления/редактирования -->
      <form
        @submit.prevent="saveManufacturer"
        class="bg-gray-50 rounded-lg px-6 py-4 mb-2"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="md:col-span-2 w-full">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Название производителя <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentManufacturer.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите название производителя"
            />
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Примечание
            </label>
            <input
              v-model="currentManufacturer.note"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация о производителе"
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
      <div class="flex flex-col justify-start relative h-full">
        <div class="mb-1 absolute top-0 left-0 right-0">
          <div class="relative">
            <input
              v-model="search"
              type="text"
              placeholder="Поиск производителей..."
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
        <div class="overflow-x-auto shadow-md rounded-lg border border-gray-200 overflow-y-auto absolute top-13 bottom-15 left-0 right-0">
          <!-- Индикатор загрузки -->
          <div v-if="isLoading" class="flex justify-center items-center py-8">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span class="ml-2 text-gray-500">Загрузка...</span>
          </div>

          <table v-else class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0 z-10">
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
              <tr v-if="manufacturers.length === 0">
                <td colspan="4" class="px-6 py-4 text-center text-gray-500">
                  Производители не найдены
                </td>
              </tr>
              <tr v-for="manufacturer in manufacturers" :key="manufacturer.id">
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {{ manufacturer.name }}
                </td>
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {{ manufacturer.note || '—' }}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span class="text-xs bg-gray-100 px-2 py-1 rounded">
                    {{ manufacturer._count?.materials || 0 }} материалов
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click="editManufacturer(manufacturer)"
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
                    @click="deleteManufacturer(manufacturer.id)"
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
        <div class="mt-4 flex justify-between gap-3 items-center absolute bottom-0 left-0 right-0">
          <div class="text-sm text-gray-700">
            Показано с {{ (currentPage - 1) * pageSize + 1 }} по
            {{ Math.min(currentPage * pageSize, totalCount) }}
            из {{ totalCount }} записей
          </div>
          <div class="flex gap-2 items-center">
            <button
              @click="previousPage"
              :disabled="currentPage === 1 || isLoading"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                currentPage === 1 || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
              ]"
            >
              Назад
            </button>
            <span class="px-3 py-2 text-sm text-gray-600">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages || isLoading"
              :class="[
                'px-4 py-2 rounded-md transition-colors',
                currentPage >= totalPages || isLoading
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
  { key: 'name', title: 'Название производителя' },
  { key: 'note', title: 'Примечание' },
  { key: 'count', title: 'Материалов' },
  { key: 'actions', title: 'Действия' },
];

// Сортировка
const sortKey = ref('name');
const sortOrder = ref('asc');

// Пагинация
const currentPage = ref(1);
const pageSize = ref(10);

// Данные с сервера
const manufacturers = ref([]);
const totalCount = ref(0);

// Текущий производитель для формы
const currentManufacturer = reactive({
  id: null,
  name: '',
  note: '',
});

// ============================================
// ВЫЧИСЛЯЕМЫЕ СВОЙСТВА
// ============================================

const totalPages = computed(() => {
  return Math.ceil(totalCount.value / pageSize.value);
});

// ============================================
// МЕТОДЫ
// ============================================

// Загрузка данных с сервера с пагинацией
async function loadManufacturers() {
  isLoading.value = true;
  try {
    const response = await $fetch('/api/lab/manufacturer', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
      },
    });
    
    if (response?.success) {
      manufacturers.value = response.data;
      totalCount.value = response.total;
    }
  } catch (error) {
    console.error('Ошибка загрузки производителей:', error);
    showTost(
      'Ошибка!',
      'Не удалось загрузить данные',
      'error',
      'fxemoji:warningsign',
      5000
    );
  } finally {
    isLoading.value = false;
  }
}

// Сортировка
const sortBy = (key) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1; // Сброс на первую страницу при сортировке
  loadManufacturers();
};

// Пагинация
const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadManufacturers();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadManufacturers();
  }
};

// Сохранение производителя
const saveManufacturer = async () => {
  if (!currentManufacturer.name?.trim()) {
    showTost(
      'Предупреждение!',
      'Название производителя обязательно для заполнения',
      'warning',
      'fxemoji:warningsign',
      5000
    );
    return;
  }

  isLoading.value = true;
  try {
    const url = currentManufacturer.id 
      ? `/api/lab/manufacturer/${currentManufacturer.id}` 
      : '/api/lab/manufacturer';
    
    const method = currentManufacturer.id ? 'put' : 'post';
    
    const response = await $fetch(url, {
      method,
      body: {
        name: currentManufacturer.name.trim(),
        note: currentManufacturer.note || null,
      },
    });

    if (response?.success) {
      showTost(
        'Успех!',
        currentManufacturer.id ? 'Производитель обновлен' : 'Производитель добавлен',
        'success',
        'streamline-freehand-color:form-validation-check-double',
        3000
      );
      // Обновляем данные на текущей странице
      await loadManufacturers();
      resetForm();
    }
  } catch (error) {
    console.error('Ошибка сохранения производителя:', error);
    showTost(
      'Ошибка!',
      `Не удалось сохранить производителя. ${error.message || ''}`,
      'error',
      'fxemoji:warningsign',
      5000
    );
  } finally {
    isLoading.value = false;
  }
};

// Редактирование производителя
const editManufacturer = (manufacturer) => {
  Object.assign(currentManufacturer, {
    id: manufacturer.id,
    name: manufacturer.name,
    note: manufacturer.note || '',
  });
  isEditing.value = true;
};

// Удаление производителя
const deleteManufacturer = async (id) => {
  // Проверка, есть ли связанные материалы (нужно загрузить полную информацию)
  const manufacturer = manufacturers.value.find(m => m.id === id);
  if (manufacturer?._count?.materials > 0) {
    showTost(
      'Невозможно удалить!',
      `Производитель используется в ${manufacturer._count.materials} материалах`,
      'warning',
      'fxemoji:warningsign',
      5000
    );
    return;
  }

  if (!confirm('Вы уверены, что хотите удалить этого производителя?')) return;

  isLoading.value = true;
  try {
    const response = await $fetch(`/api/lab/manufacturer/${id}`, {
      method: 'delete',
    });

    if (response?.success) {
      showTost(
        'Успех!',
        'Производитель удален',
        'success',
        'streamline-freehand-color:form-validation-check-double',
        3000
      );
      // Обновляем данные на текущей странице
      await loadManufacturers();
    }
  } catch (error) {
    console.error('Ошибка удаления производителя:', error);
    showTost(
      'Ошибка!',
      `${error.message || 'Не удалось удалить производителя'}`,
      'error',
      'fxemoji:warningsign',
      5000
    );
  } finally {
    isLoading.value = false;
  }
};

// Сброс формы
const resetForm = () => {
  Object.assign(currentManufacturer, {
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
  loadManufacturers();
});

// Следим за изменением поиска
watch(search, () => {
  currentPage.value = 1;
  loadManufacturers();
});

// Следим за изменением размера страницы
watch(pageSize, () => {
  currentPage.value = 1;
  loadManufacturers();
});

// ============================================
// ЭКСПОРТЫ ДЛЯ ТЕСТИРОВАНИЯ (опционально)
// ============================================
defineExpose({
  loadManufacturers,
  resetForm,
});
</script>

<style scoped>
/* Стили для sticky header */
.sticky {
  position: sticky;
}
.top-0 {
  top: 0;
}
.z-10 {
  z-index: 10;
}

/* Анимация загрузки */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>