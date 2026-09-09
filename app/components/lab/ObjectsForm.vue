<template>
  <div class="p-0 absolute right-0 left-0 bottom-0 top-0">
    <!-- Основная карточка -->
    <div class="mx-auto bg-white rounded-xl shadow-lg px-4 py-2 absolute top-0 bottom-0 left-0 right-0 flex flex-col justify-start">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">
        Объекты и места отбора проб
      </h1>

      <!-- Форма добавления/редактирования объекта - УМЕНЬШЕННЫЕ ОТСТУПЫ -->
      <form
        @submit.prevent="saveObject"
        class="bg-gray-50 rounded-lg px-4 py-2 mb-2"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1.5">
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Название объекта <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentObject.name"
              type="text"
              required
              class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите название объекта"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Примечание
            </label>
            <input
              v-model="currentObject.note"
              type="text"
              class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация"
            />
          </div>
        </div>

        <div class="mt-2 flex gap-2">
          <button
            type="submit"
            :class="[
              'px-4 py-1.5 text-sm rounded-md text-white font-medium transition-colors',
              isEditingObject
                ? 'bg-yellow-500 hover:bg-yellow-600'
                : 'bg-green-500 hover:bg-green-600',
            ]"
          >
            {{ isEditingObject ? 'Обновить объект' : 'Добавить объект' }}
          </button>
          <button
            v-if="isEditingObject"
            @click="cancelEditObject"
            type="button"
            class="px-4 py-1.5 text-sm bg-gray-400 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>

      <!-- Две таблицы: Объекты и Места отбора -->
      <div class="flex flex-col justify-start relative h-full">
        <!-- ===== ВЕРХНЯЯ ЧАСТЬ: Таблица объектов ===== -->
        <div class="flex-1 mb-2 relative" style="height: 45%;">
          <div class="absolute inset-0 flex flex-col">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-sm font-semibold text-gray-700">Список объектов</h2>
              <div class="relative w-56">
                <input
                  v-model="objectSearch"
                  type="text"
                  placeholder="Поиск объектов..."
                  class="w-full px-3 py-1 pl-7 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <svg
                  class="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-400"
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

            <div class="flex-1 overflow-x-auto shadow-md rounded-lg border border-gray-200">
              <!-- Индикатор загрузки -->
              <div v-if="isLoadingObjects" class="flex justify-center items-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-2 text-gray-500">Загрузка...</span>
              </div>

              <table v-else class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      v-for="header in objectHeaders"
                      :key="header.key"
                      class="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      @click="sortObjectsBy(header.key)"
                    >
                      <span class="flex items-center gap-1">
                        {{ header.title }}
                        <span v-if="objectSortKey === header.key" class="text-xs">
                          {{ objectSortOrder === 'asc' ? '↑' : '↓' }}
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-if="objects.length === 0">
                    <td colspan="4" class="px-3 py-3 text-center text-gray-500 text-sm">
                      Объекты не найдены
                    </td>
                  </tr>
                  <tr
                    v-for="object in objects"
                    :key="object.id"
                    @click="selectObject(object)"
                    class="cursor-pointer hover:bg-gray-50 transition-colors"
                    :class="{ 'bg-blue-50': selectedObjectId === object.id }"
                  >
                    <td class="px-3 py-2 whitespace-nowrap max-w-3xl overflow-hidden text-sm text-gray-900 font-medium">
                      {{ object.name }}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-600 max-w-25 truncate">
                      {{ object.note || '—' }}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      <span class="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {{ object._count?.locations || 0 }} мест
                      </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <button
                        @click.stop="editObject(object)"
                        class="text-blue-600 hover:text-blue-900 mr-2 transition-colors"
                        title="Редактировать"
                      >
                        <svg class="w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        @click.stop="deleteObject(object.id)"
                        class="text-red-600 hover:text-red-900 transition-colors"
                        title="Удалить"
                      >
                        <svg class="w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Пагинация объектов - СЕРВЕРНАЯ -->
            <div class="mt-2 flex justify-between items-center text-xs">
              <div class="text-gray-700">
                Показано с {{ (objectPage - 1) * objectPageSize + 1 }} по
                {{ Math.min(objectPage * objectPageSize, totalObjectsCount) }}
                из {{ totalObjectsCount }} записей
              </div>
              <div class="flex gap-1">
                <button
                  @click="previousObjectPage"
                  :disabled="objectPage === 1 || isLoadingObjects"
                  :class="[
                    'px-3 py-0.5 rounded-md transition-colors text-xs',
                    objectPage === 1 || isLoadingObjects
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
                  ]"
                >
                  Назад
                </button>
                <span class="px-2 py-0.5 text-gray-600">
                  {{ objectPage }} / {{ objectTotalPages }}
                </span>
                <button
                  @click="nextObjectPage"
                  :disabled="objectPage >= objectTotalPages || isLoadingObjects"
                  :class="[
                    'px-3 py-0.5 rounded-md transition-colors text-xs',
                    objectPage >= objectTotalPages || isLoadingObjects
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

        <!-- Разделитель -->
        <div class="border-t-2 border-gray-200 my-1"></div>

        <!-- ===== НИЖНЯЯ ЧАСТЬ: Таблица мест отбора ===== -->
        <div class="flex-1 relative" style="height: 45%;">
          <div class="absolute inset-0 flex flex-col">
            <div class="flex items-center justify-between mb-1">
              <h2 class="text-sm font-semibold text-gray-700">
                Места отбора проб
                <span v-if="selectedObject" class="text-xs font-normal text-gray-500">
                  для "{{ selectedObject.name }}"
                </span>
                <span v-else class="text-xs font-normal text-gray-400">
                  (выберите объект)
                </span>
              </h2>
              <div class="flex items-center gap-2">
                <button
                  @click="openAddLocationModal"
                  :disabled="!selectedObject"
                  :class="[
                    'px-2 py-0.5 text-xs rounded-md transition-colors',
                    selectedObject
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  ]"
                >
                  <span class="flex items-center gap-1">
                    <svg class="w-3.5 h-3.5 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                    Добавить
                  </span>
                </button>
                <div class="relative w-40">
                  <input
                    v-model="locationSearch"
                    type="text"
                    placeholder="Поиск мест..."
                    class="w-full px-3 py-1 pl-6 text-xs border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    :disabled="!selectedObject"
                  />
                  <svg
                    class="absolute left-1.5 top-1.5 h-3.5 w-3.5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            <div class="flex-1 overflow-x-auto shadow-md rounded-lg border border-gray-200">
              <div v-if="!selectedObject" class="flex justify-center items-center h-full text-gray-400 text-sm">
                Выберите объект для просмотра мест отбора
              </div>

              <div v-else-if="isLoadingLocations" class="flex justify-center items-center h-full">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span class="ml-2 text-gray-500">Загрузка...</span>
              </div>

              <table v-else class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th
                      v-for="header in locationHeaders"
                      :key="header.key"
                      class="px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
                      @click="sortLocationsBy(header.key)"
                    >
                      <span class="flex items-center gap-1">
                        {{ header.title }}
                        <span v-if="locationSortKey === header.key" class="text-xs">
                          {{ locationSortOrder === 'asc' ? '↑' : '↓' }}
                        </span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  <tr v-if="locations.length === 0">
                    <td colspan="4" class="px-3 py-3 text-center text-gray-500 text-sm">
                      {{ selectedObject ? 'Нет мест отбора для этого объекта' : 'Выберите объект' }}
                    </td>
                  </tr>
                  <tr v-for="location in locations" :key="location.id">
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {{ location.name }}
                    </td>
                    <td class="px-3 py-2 text-sm text-gray-600 max-w-25 truncate">
                      {{ location.note || '—' }}
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-500">
                      <span class="text-xs bg-gray-100 px-2 py-0.5 rounded">
                        {{ location._count?.samplingTests || 0 }} отборов
                      </span>
                    </td>
                    <td class="px-3 py-2 whitespace-nowrap text-sm font-medium">
                      <button
                        @click="editLocation(location)"
                        class="text-blue-600 hover:text-blue-900 mr-2 transition-colors"
                        title="Редактировать"
                      >
                        <svg class="w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        @click="deleteLocation(location.id)"
                        class="text-red-600 hover:text-red-900 transition-colors"
                        title="Удалить"
                      >
                        <svg class="w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Пагинация мест отбора -->
            <div class="mt-2 flex justify-between items-center text-xs">
              <div class="text-gray-700">
                Показано с {{ (locationPage - 1) * locationPageSize + 1 }} по
                {{ Math.min(locationPage * locationPageSize, totalLocationsCount) }}
                из {{ totalLocationsCount }} записей
              </div>
              <div class="flex gap-1">
                <button
                  @click="previousLocationPage"
                  :disabled="locationPage === 1 || isLoadingLocations"
                  :class="[
                    'px-3 py-0.5 rounded-md transition-colors text-xs',
                    locationPage === 1 || isLoadingLocations
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
                  ]"
                >
                  Назад
                </button>
                <span class="px-2 py-0.5 text-gray-600">
                  {{ locationPage }} / {{ locationTotalPages }}
                </span>
                <button
                  @click="nextLocationPage"
                  :disabled="locationPage >= locationTotalPages || isLoadingLocations"
                  :class="[
                    'px-3 py-0.5 rounded-md transition-colors text-xs',
                    locationPage >= locationTotalPages || isLoadingLocations
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
    </div>

    <!-- Модальное окно для добавления/редактирования места отбора -->
    <UModal v-model="isLocationModalOpen" :close="{ onClick: closeLocationModal }">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold text-gray-900">
            {{ isEditingLocation ? 'Редактирование места отбора' : 'Добавление места отбора' }}
          </h3>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark-20-solid"
            class="rounded-full hover:bg-gray-100 transition-colors"
            @click="closeLocationModal"
          />
        </div>
      </template>

      <template #body>
        <form @submit.prevent="saveLocation" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Название места <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentLocation.name"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите название места отбора"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Примечание
            </label>
            <input
              v-model="currentLocation.note"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация"
            />
          </div>
          <div class="flex justify-end gap-3 pt-4">
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              label="Отмена"
              @click="closeLocationModal"
            />
            <UButton
              type="submit"
              color="primary"
              :label="isEditingLocation ? 'Обновить' : 'Добавить'"
            />
          </div>
        </form>
      </template>
    </UModal>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted, watch } from 'vue';

// ============================================
// ИСПОЛЬЗОВАНИЕ TOAST
// ============================================
const { showTost } = useAppToasts();

// ============================================
// СОСТОЯНИЕ ДЛЯ ОБЪЕКТОВ
// ============================================

const objectSearch = ref('');
const isEditingObject = ref(false);
const isLoadingObjects = ref(false);

const objectHeaders = [
  { key: 'name', title: 'Название объекта' },
  { key: 'note', title: 'Примечание' },
  { key: 'count', title: 'Мест отбора' },
  { key: 'actions', title: 'Действия' },
];

const objectSortKey = ref('name');
const objectSortOrder = ref('asc');
const objectPage = ref(1);
const objectPageSize = ref(10);

const objects = ref([]);
const totalObjectsCount = ref(0);
const selectedObjectId = ref(null);
const selectedObject = ref(null);

// ============================================
// СОСТОЯНИЕ ДЛЯ МЕСТ ОТБОРА
// ============================================

const locationSearch = ref('');
const isEditingLocation = ref(false);
const isLoadingLocations = ref(false);
const isLocationModalOpen = ref(false);

const locationHeaders = [
  { key: 'name', title: 'Название места' },
  { key: 'note', title: 'Примечание' },
  { key: 'count', title: 'Отборов проб' },
  { key: 'actions', title: 'Действия' },
];

const locationSortKey = ref('name');
const locationSortOrder = ref('asc');
const locationPage = ref(1);
const locationPageSize = ref(10);

const locations = ref([]);
const totalLocationsCount = ref(0);

// ============================================
// ТЕКУЩИЕ ОБЪЕКТ ДЛЯ ФОРМЫ
// ============================================

const currentObject = reactive({
  id: null,
  name: '',
  note: '',
});

// ============================================
// ТЕКУЩЕЕ МЕСТО ДЛЯ ФОРМЫ
// ============================================

const currentLocation = reactive({
  id: null,
  name: '',
  note: '',
});

// ============================================
// ВЫЧИСЛЯЕМЫЕ СВОЙСТВА
// ============================================

const objectTotalPages = computed(() => {
  return Math.ceil(totalObjectsCount.value / objectPageSize.value);
});

const locationTotalPages = computed(() => {
  return Math.ceil(totalLocationsCount.value / locationPageSize.value);
});

// ============================================
// МЕТОДЫ ДЛЯ ОБЪЕКТОВ
// ============================================

async function loadObjects() {
  isLoadingObjects.value = true;
  try {
    const response = await $fetch('/api/lab/objects', {
      params: {
        page: objectPage.value,
        pageSize: objectPageSize.value,
        search: objectSearch.value,
        sortKey: objectSortKey.value,
        sortOrder: objectSortOrder.value,
      },
    });
    
    if (response?.success) {
      objects.value = response.data || [];
      totalObjectsCount.value = Number(response.total) || 0;
    }
  } catch (error) {
    console.error('Ошибка загрузки объектов:', error);
    showTost('Ошибка!', 'Не удалось загрузить данные', 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoadingObjects.value = false;
  }
}

function sortObjectsBy(key) {
  if (objectSortKey.value === key) {
    objectSortOrder.value = objectSortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    objectSortKey.value = key;
    objectSortOrder.value = 'asc';
  }
  objectPage.value = 1;
  loadObjects();
}

function previousObjectPage() {
  if (objectPage.value > 1) {
    objectPage.value--;
    loadObjects();
  }
}

function nextObjectPage() {
  if (objectPage.value < objectTotalPages.value) {
    objectPage.value++;
    loadObjects();
  }
}

function selectObject(object) {
  selectedObjectId.value = object.id;
  selectedObject.value = object;
  locationPage.value = 1;
  locationSearch.value = '';
  loadLocations(object.id);
}

async function saveObject() {
  if (!currentObject.name?.trim()) {
    showTost('Предупреждение!', 'Название объекта обязательно для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  isLoadingObjects.value = true;
  try {
    const url = currentObject.id ? `/api/lab/test-object/${currentObject.id}` : '/api/lab/test-object';
    const method = currentObject.id ? 'put' : 'post';
    
    const response = await $fetch(url, {
      method,
      body: {
        name: currentObject.name.trim(),
        note: currentObject.note || null,
      },
    });

    if (response?.success) {
      showTost('Успех!', currentObject.id ? 'Объект обновлен' : 'Объект добавлен', 'success', 'streamline-freehand-color:form-validation-check-double', 3000);
      await loadObjects();
      resetObjectForm();
    }
  } catch (error) {
    console.error('Ошибка сохранения объекта:', error);
    showTost('Ошибка!', `Не удалось сохранить объект. ${error.message || ''}`, 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoadingObjects.value = false;
  }
}

function editObject(object) {
  Object.assign(currentObject, {
    id: object.id,
    name: object.name,
    note: object.note || '',
  });
  isEditingObject.value = true;
}

async function deleteObject(id) {
  const object = objects.value.find(o => o.id === id);
  if (object?._count?.locations > 0) {
    showTost('Невозможно удалить!', `Объект содержит ${object._count.locations} мест отбора`, 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  if (!confirm('Вы уверены, что хотите удалить этот объект?')) return;

  isLoadingObjects.value = true;
  try {
    const response = await $fetch(`/api/lab/test-object/${id}`, {
      method: 'delete',
    });

    if (response?.success) {
      showTost('Успех!', 'Объект удален', 'success', 'streamline-freehand-color:form-validation-check-double', 3000);
      if (selectedObjectId.value === id) {
        selectedObjectId.value = null;
        selectedObject.value = null;
        locations.value = [];
      }
      await loadObjects();
    }
  } catch (error) {
    console.error('Ошибка удаления объекта:', error);
    showTost('Ошибка!', `${error.message || 'Не удалось удалить объект'}`, 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoadingObjects.value = false;
  }
}

function resetObjectForm() {
  Object.assign(currentObject, {
    id: null,
    name: '',
    note: '',
  });
  isEditingObject.value = false;
}

const cancelEditObject = resetObjectForm;

// ============================================
// МЕТОДЫ ДЛЯ МЕСТ ОТБОРА
// ============================================

async function loadLocations(objectId) {
  if (!objectId) return;
  
  isLoadingLocations.value = true;
  try {
    const response = await $fetch('/api/lab/locations', {
      params: {
        testObjectId: objectId,
        page: locationPage.value,
        pageSize: locationPageSize.value,
        search: locationSearch.value,
        sortKey: locationSortKey.value,
        sortOrder: locationSortOrder.value,
      },
    });
    
    if (response?.success) {
      locations.value = response.data || [];
      totalLocationsCount.value = Number(response.total) || 0;
    }
  } catch (error) {
    console.error('Ошибка загрузки мест отбора:', error);
    showTost('Ошибка!', 'Не удалось загрузить места отбора', 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoadingLocations.value = false;
  }
}

function sortLocationsBy(key) {
  if (locationSortKey.value === key) {
    locationSortOrder.value = locationSortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    locationSortKey.value = key;
    locationSortOrder.value = 'asc';
  }
  locationPage.value = 1;
  if (selectedObjectId.value) {
    loadLocations(selectedObjectId.value);
  }
}

function previousLocationPage() {
  if (locationPage.value > 1) {
    locationPage.value--;
    if (selectedObjectId.value) {
      loadLocations(selectedObjectId.value);
    }
  }
}

function nextLocationPage() {
  if (locationPage.value < locationTotalPages.value) {
    locationPage.value++;
    if (selectedObjectId.value) {
      loadLocations(selectedObjectId.value);
    }
  }
}

function openAddLocationModal() {
  if (!selectedObject.value) return;
  resetLocationForm();
  isLocationModalOpen.value = true;
}

function editLocation(location) {
  Object.assign(currentLocation, {
    id: location.id,
    name: location.name,
    note: location.note || '',
  });
  isEditingLocation.value = true;
  isLocationModalOpen.value = true;
}

async function saveLocation() {
  if (!currentLocation.name?.trim()) {
    showTost('Предупреждение!', 'Название места обязательно для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  try {
    const url = currentLocation.id
      ? `/api/lab/test-location/${currentLocation.id}`
      : '/api/lab/test-location';
    const method = currentLocation.id ? 'put' : 'post';
    
    const response = await $fetch(url, {
      method,
      body: {
        name: currentLocation.name.trim(),
        note: currentLocation.note || null,
        testObjectId: selectedObjectId.value,
      },
    });

    if (response?.success) {
      showTost('Успех!', currentLocation.id ? 'Место обновлено' : 'Место добавлено', 'success', 'streamline-freehand-color:form-validation-check-double', 3000);
      closeLocationModal();
      if (selectedObjectId.value) {
        loadLocations(selectedObjectId.value);
        loadObjects();
      }
    }
  } catch (error) {
    console.error('Ошибка сохранения места:', error);
    showTost('Ошибка!', `Не удалось сохранить место. ${error.message || ''}`, 'error', 'fxemoji:warningsign', 5000);
  }
}

async function deleteLocation(id) {
  const location = locations.value.find(l => l.id === id);
  if (location?._count?.samplingTests > 0) {
    showTost('Невозможно удалить!', `Место используется в ${location._count.samplingTests} отборах проб`, 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  if (!confirm('Вы уверены, что хотите удалить это место отбора?')) return;

  try {
    const response = await $fetch(`/api/lab/test-location/${id}`, {
      method: 'delete',
    });

    if (response?.success) {
      showTost('Успех!', 'Место отбора удалено', 'success', 'streamline-freehand-color:form-validation-check-double', 3000);
      if (selectedObjectId.value) {
        loadLocations(selectedObjectId.value);
        loadObjects();
      }
    }
  } catch (error) {
    console.error('Ошибка удаления места:', error);
    showTost('Ошибка!', `${error.message || 'Не удалось удалить место'}`, 'error', 'fxemoji:warningsign', 5000);
  }
}

function resetLocationForm() {
  Object.assign(currentLocation, {
    id: null,
    name: '',
    note: '',
  });
  isEditingLocation.value = false;
}

function closeLocationModal() {
  isLocationModalOpen.value = false;
  resetLocationForm();
}

// ============================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================

onMounted(() => {
  loadObjects();
});

// Следим за изменением поиска объектов
watch(objectSearch, () => {
  objectPage.value = 1;
  loadObjects();
});

// Следим за изменением размера страницы объектов
watch(objectPageSize, () => {
  objectPage.value = 1;
  loadObjects();
});

// Следим за изменением поиска мест
watch(locationSearch, () => {
  locationPage.value = 1;
  if (selectedObjectId.value) {
    loadLocations(selectedObjectId.value);
  }
});

// Следим за изменением страницы мест
watch([locationPage, locationPageSize], () => {
  if (selectedObjectId.value) {
    loadLocations(selectedObjectId.value);
  }
});

// ============================================
// ЭКСПОРТЫ
// ============================================
defineExpose({
  loadObjects,
  loadLocations,
  resetObjectForm,
  resetLocationForm,
});
</script>

<style scoped>
.sticky {
  position: sticky;
}
.top-0 {
  top: 0;
}
.z-10 {
  z-index: 10;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}

tr.cursor-pointer {
  cursor: pointer;
}

tr.cursor-pointer:hover {
  background-color: #f9fafb;
}
</style>