<template>
  <div class="p-0 absolute right-0 left-0 bottom-0 top-0">
    <!-- Основная карточка -->
    <div class="mx-auto bg-white rounded-xl shadow-lg px-4 py-2 absolute top-0 bottom-0 left-0 right-0 flex flex-col justify-start">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">
        Акты отбора проб
      </h1>

      <!-- Форма добавления/редактирования -->
      <form
        @submit.prevent="saveSamplingTest"
        class="bg-gray-50 rounded-lg px-4 py-2 mb-2"
      >
        <div class="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-1.5">
          <!-- ПЛП -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              ПЛП <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="currentSamplingTest.plpId as any"
              :items="plpItems"
              :searchable="true"
              :search-input="{ placeholder: 'Поиск ПЛП...' }"
              class="w-full"
              size="sm"
              variant="outline"
              color="primary"
            >
              <template #item="{ item }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ item.label }}</span>
                  <span v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</span>
                </div>
              </template>
            </USelectMenu>
          </div>

          <!-- Инспектор -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              лицо, предоставившее пробу <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="currentSamplingTest.inspectorId as any"
              :items="inspectorItems"
              :searchable="true"
              :search-input="{ placeholder: 'Поиск инспектора...' }"
              class="w-full"
              size="sm"
              variant="outline"
              color="primary"
            >
              <template #item="{ item }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ item.label }}</span>
                  <span v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</span>
                </div>
              </template>
            </USelectMenu>
          </div>

          <!-- Объект -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Объект <span class="text-red-500">*</span>
            </label>
            <USelectMenu
              v-model="currentSamplingTest.testObjectId as any"
              :items="testObjectItems"
              :searchable="true"
              :search-input="{ placeholder: 'Поиск объекта...' }"
              class="w-full"
              size="sm"
              variant="outline"
              color="primary"
              @update:model-value="onObjectChange"
            >
              <template #item="{ item }">
                <div class="flex flex-col">
                  <span class="font-medium">{{ item.label }}</span>
                  <span v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</span>
                </div>
              </template>
            </USelectMenu>
          </div>

          <!-- Место отбора - ТЕПЕРЬ UInput -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Место отбора <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentSamplingTest.testLocationName"
              type="text"
              required
              class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите место отбора"
            />
          </div>

          <!-- Номер акта -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Номер акта <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentSamplingTest.sActNumber"
              type="text"
              required
              class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите номер акта"
            />
          </div>

          <!-- Дата акта -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Дата акта <span class="text-red-500">*</span>
            </label>
            <CustomDateInput
              v-model="currentSamplingTest.sActDate as any"
              :required="true"
              :min-value="minDate"
              :max-value="maxDate"
              class="w-full"
              size="sm"
            />
          </div>

          <!-- Поступление материала -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Поступление материала
            </label>
            <USelectMenu
              v-model="currentSamplingTest.receiptMaterialId as any"
              :items="displayedReceiptItems"
              :searchable="true"
              :search-input="{ 
                placeholder: 'Поиск поступления...',
              }"
              class="w-full"
              size="sm"
              variant="outline"
              color="primary"
              :loading="isLoadingReceipts"
              @update:search="onReceiptSearch"
            >
              <template #item="{ item }">
                <div class="flex flex-col">
                  <span class="font-medium text-sm">{{ item.label }}</span>
                  <span v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</span>
                </div>
              </template>
              
              <template #empty>
                <div class="flex flex-col items-center justify-center p-3">
                  <Icon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400 mb-1" />
                  <span class="text-sm text-gray-500">{{ isLoadingReceipts ? 'Загрузка...' : 'Ничего не найдено' }}</span>
                </div>
              </template>
            </USelectMenu>
            <div class="flex justify-center mt-1">
                <button
                    v-if="receiptHasMore"
                    @click="loadMoreReceipts"
                    :disabled="isLoadingReceipts"
                    class="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {{ isLoadingReceipts ? 'Загрузка...' : 'Загрузить еще...' }}
                </button>
                <span v-else-if="displayedReceiptItems.length > 0" class="text-xs text-gray-400">
                    Все поступления загружены
                </span>
                </div>
                
                <!-- Индикатор количества -->
                <div class="text-xs text-gray-400 mt-0.5 text-center">
                {{ displayedReceiptItems.length > 0 ? `Загружено: ${displayedReceiptItems.length} записей` : '' }}
                </div>
          </div>

          <!-- Протокол испытаний -->
          <div>
    <label class="block text-xs font-medium text-gray-700 mb-0.5">
      Протокол испытаний
    </label>
    <USelectMenu
      v-model="currentSamplingTest.testProtocolId as any"
      :items="displayedProtocolItems"
      :searchable="true"
      :search-input="{ 
        placeholder: 'Поиск протокола...',
      }"
      class="w-full"
      size="sm"
      variant="outline"
      color="primary"
      :loading="isLoadingProtocols"
      @update:search="onProtocolSearch"
    >
      <template #item="{ item }">
        <div class="flex flex-col">
          <span class="font-medium text-sm">{{ item.label }}</span>
          <span v-if="item.description" class="text-xs text-gray-500">{{ item.description }}</span>
        </div>
      </template>
      
      <template #empty>
        <div class="flex flex-col items-center justify-center p-3">
          <Icon name="i-heroicons-magnifying-glass" class="w-5 h-5 text-gray-400 mb-1" />
          <span class="text-sm text-gray-500">{{ isLoadingProtocols ? 'Загрузка...' : 'Ничего не найдено' }}</span>
        </div>
      </template>
    </USelectMenu>
    
    <!-- Кнопка "Загрузить еще" под селектом -->
    <div class="flex justify-center mt-1">
      <button
        v-if="protocolHasMore"
        @click="loadMoreProtocols"
        :disabled="isLoadingProtocols"
        class="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isLoadingProtocols ? 'Загрузка...' : 'Загрузить еще...' }}
      </button>
      <span v-else-if="displayedProtocolItems.length > 0" class="text-xs text-gray-400">
        Все протоколы загружены
      </span>
    </div>
    
    <!-- Индикатор количества -->
    <div class="text-xs text-gray-400 mt-0.5 text-center">
      {{ displayedProtocolItems.length > 0 ? `Загружено: ${displayedProtocolItems.length} записей` : '' }}
    </div>
  </div>

          <!-- Документ акта -->
          <div>
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Документ акта
            </label>
            <UInput
              ref="sDocInput"
              @change="handleSDocChange"
              type="file"
              class="w-full"
              size="sm"
            />
            <div
              v-if="dbResponse && dbResponse['Документ отбора проб'] && dbResponse['Документ отбора проб'] !== '-'"
              class="flex items-center gap-1 mt-0.5"
            >
              <a
                :href="getFileUrl(dbResponse['Документ отбора проб'])"
                class="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                target="_blank"
              >
                <Icon name="i-heroicons-document-text" class="w-3 h-3" />
                {{ getFileName(dbResponse['Документ отбора проб']) }}
              </a>
            </div>
          </div>

          <!-- Примечание -->
          <div class="md:col-span-3">
            <label class="block text-xs font-medium text-gray-700 mb-0.5">
              Примечание
            </label>
            <input
              v-model="currentSamplingTest.note"
              type="text"
              class="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация"
            />
          </div>
        </div>

        <!-- Информационная панель -->
        <div class="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-start gap-2">
            <Icon name="i-heroicons-information-circle" class="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-xs font-medium text-blue-800 mb-0.5">Связанные данные:</div>
              <table class="w-full text-xs text-blue-700">
                <tbody>
                  <tr>
                    <td class="py-0.5 pr-3 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Материал:</span>
                      <span class="text-blue-700 ml-1">{{ selectedSamplingTestInfo?.material || '—' }}</span>
                    </td>
                    <td class="py-0.5 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Производитель:</span>
                      <span class="text-blue-700 ml-1">{{ selectedSamplingTestInfo?.manufacturer || '—' }}</span>
                    </td>
                  </tr>
                  <tr>
                    <td class="py-0.5 pr-3 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Поступление:</span>
                      <span class="text-blue-700 ml-1">{{ selectedSamplingTestInfo?.receipt || '—' }}</span>
                    </td>
                    <td class="py-0.5 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Протокол:</span>
                      <span class="text-blue-700 ml-1">{{ selectedSamplingTestInfo?.protocol || '—' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Кнопки -->
        <div class="mt-2 flex gap-2">
          <button
            type="submit"
            :class="[
              'px-4 py-1.5 text-sm rounded-md text-white font-medium transition-colors',
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
            class="px-4 py-1.5 text-sm bg-gray-400 hover:bg-gray-500 text-white rounded-md font-medium transition-colors"
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
              placeholder="Поиск актов отбора..."
              class="w-full px-3 py-1.5 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              class="absolute left-2.5 top-2 h-4 w-4 text-gray-400"
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
        <div class="overflow-x-auto shadow-md rounded-lg border border-gray-200 overflow-y-auto absolute top-10 bottom-14 left-0 right-0">
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
                  class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700"
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
              <tr v-if="samplingTests.length === 0">
                <td colspan="8" class="px-4 py-4 text-center text-gray-500 text-sm">
                  Акты отбора не найдены
                </td>
              </tr>
              <tr
                v-for="test in samplingTests"
                :key="test.id"
                @click="selectSamplingTest(test)"
                class="cursor-pointer hover:bg-gray-50 transition-colors"
                :class="{ 'bg-blue-50': selectedSamplingTestId === test.id }"
              >
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {{ test.sActNumber || '—' }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-600">
                  {{ test.sActDate ? new Date(test.sActDate).toLocaleDateString('ru-RU') : '—' }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-600 max-w-20 truncate">
                  {{ test.plp?.name || '—' }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-600 max-w-20 truncate">
                  {{ test.testLocation?.testObject?.name || '—' }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-600 max-w-20 truncate">
                  {{ test.testLocation?.name || '—' }}
                </td>
                <td class="px-4 py-2 text-sm text-gray-600 max-w-20 truncate">
                  {{ test.inspector?.name || '—' }}
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <a
                    v-if="test.sDocPath && test.sDocPath !== '-'"
                    :href="getFileUrl(test.sDocPath)"
                    class="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    target="_blank"
                    @click.stop
                  >
                    <Icon name="i-heroicons-document-text" class="w-4 h-4" />
                  </a>
                  <span v-else class="text-gray-400">—</span>
                </td>
                <td class="px-4 py-2 whitespace-nowrap text-sm font-medium">
                  <button
                    @click.stop="editSamplingTest(test)"
                    class="text-blue-600 hover:text-blue-900 mr-2 transition-colors"
                    title="Редактировать"
                  >
                    <svg class="w-4 h-4 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteSamplingTest(test.id)"
                    class="text-red-600 hover:text-red-900 transition-colors opacity-50 cursor-not-allowed"
                    title="Удаление заблокировано"
                    disabled
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

        <!-- Пагинация -->
        <div class="mt-2 flex justify-between gap-3 items-center absolute bottom-0 left-0 right-0">
          <div class="text-xs text-gray-700">
            Показано с {{ (currentPage - 1) * pageSize + 1 }} по
            {{ Math.min(currentPage * pageSize, totalCount) }}
            из {{ totalCount }} записей
          </div>
          <div class="flex gap-1 items-center">
            <button
              @click="previousPage"
              :disabled="currentPage === 1 || isLoading"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
                currentPage === 1 || isLoading
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700',
              ]"
            >
              Назад
            </button>
            <span class="px-2 py-1 text-xs text-gray-600">
              {{ currentPage }} / {{ totalPages }}
            </span>
            <button
              @click="nextPage"
              :disabled="currentPage >= totalPages || isLoading"
              :class="[
                'px-3 py-1 text-sm rounded-md transition-colors',
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

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue';
import { CalendarDate } from '@internationalized/date';
import { getToday, dateToISOString } from '../../../utils/dateUtils';
import { getFileUrl } from '@@/utils/fileUrl';

// ============================================
// ИСПОЛЬЗОВАНИЕ TOAST
// ============================================
const { showTost } = useAppToasts();

// ============================================
// ИНТЕРФЕЙСЫ
// ============================================

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  total?: number;
}

// ============================================
// СОСТОЯНИЕ
// ============================================

const search = ref('');
const isEditing = ref(false);
const isLoading = ref(false);
const isLoadingReceipts = ref(false);

const minDate = new CalendarDate(2000, 1, 1);
const maxDate = getToday();

const sDocInput = ref<HTMLInputElement | null>(null);
const sDocFile = ref<File | null>(null);
const dbResponse = ref<Record<string, any> | null>(null);
const selectedSamplingTestId = ref<number | null>(null);
const selectedSamplingTestInfo = ref<Record<string, any> | null>({
  material: '—',
  manufacturer: '—',
  receipt: '—',
  protocol: '—',
});

// Данные для выпадающих списков
const plpItems = ref<{ id: number; label: string; description?: string }[]>([]);
const inspectorItems = ref<{ id: number; label: string; description?: string }[]>([]);
const testObjectItems = ref<{ id: number; label: string; description?: string }[]>([]);
const protocolItems = ref<{ id: number; label: string; description?: string }[]>([]);
const displayedReceiptItems = ref<{ id: number; label: string; description?: string }[]>([]);
const receiptSearchQuery = ref('');
const receiptPage = ref(1);
const receiptHasMore = ref(true);

// Заголовки таблицы
const headers = [
  { key: 'sActNumber', title: 'Номер акта' },
  { key: 'sActDate', title: 'Дата' },
  { key: 'plp', title: 'ПЛП' },
  { key: 'object', title: 'Объект' },
  { key: 'location', title: 'Место' },
  { key: 'inspector', title: 'Инспектор' },
  { key: 'document', title: 'Документ' },
  { key: 'actions', title: 'Действия' },
];

// Сортировка
const sortKey = ref('sActNumber');
const sortOrder = ref('asc');

// Пагинация
const currentPage = ref(1);
const pageSize = ref(10);

// Данные с сервера
const samplingTests = ref<any[]>([]);
const totalCount = ref(0);

// Текущий акт
const currentSamplingTest = reactive({
  id: null as number | null,
  plpId: null as number | null,
  inspectorId: null as number | null,
  testObjectId: null as number | null,
  testLocationName: '', // ← НОВОЕ ПОЛЕ ДЛЯ НАЗВАНИЯ МЕСТА
  receiptMaterialId: null as number | null,
  testProtocolId: null as number | null,
  sActNumber: '',
  sActDate: null as CalendarDate | null,
  sDocPath: null as string | null,
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

function getFileName(path: string): string {
  if (!path) return '—';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

function parseToCalendarDate(dateString: string | null | undefined): CalendarDate | null {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  } catch {
    return null;
  }
}

// ============================================
// СОСТОЯНИЕ ДЛЯ ПРОТОКОЛОВ
// ============================================

const displayedProtocolItems = ref<{ id: number; label: string; description?: string }[]>([]);
const protocolSearchQuery = ref('');
const protocolPage = ref(1);
const protocolHasMore = ref(true);
const isLoadingProtocols = ref(false);

// ============================================
// ЗАГРУЗКА ПРОТОКОЛОВ С ПАГИНАЦИЕЙ
// ============================================

async function loadProtocolsForSelect(search: string = '', page: number = 1) {
  isLoadingProtocols.value = true;
  try {
    const response = await $fetch<ApiResponse>('/api/lab/test-protocol', {
      params: {
        page: page,
        pageSize: 200,
        search: search,
        sortKey: 'protocolNumber',
        sortOrder: 'asc',
      },
    });
    
    if (response?.success) {
      const items = response.data?.map((item: any) => ({
        id: item.id,
        label: item.protocolNumber || 'Без номера',
        description: `от ${item.protocolDate ? new Date(item.protocolDate).toLocaleDateString('ru-RU') : 'не указана'}`,
      })) || [];
      
      if (page === 1) {
        displayedProtocolItems.value = items;
      } else {
        displayedProtocolItems.value = [...displayedProtocolItems.value, ...items];
      }
      
      protocolHasMore.value = (response.total || 0) > displayedProtocolItems.value.length;
      protocolPage.value = page;
      
    //   console.log(`📥 Загружено протоколов: ${displayedProtocolItems.value.length} из ${response.total || 0}`);
    }
  } catch (error) {
    console.error('Ошибка загрузки протоколов:', error);
  } finally {
    isLoadingProtocols.value = false;
  }
}

// ============================================
// ЗАГРУЗКА СЛЕДУЮЩЕЙ ПОРЦИИ ПРОТОКОЛОВ
// ============================================

async function loadMoreProtocols() {
  if (isLoadingProtocols.value || !protocolHasMore.value) return;
  
  const nextPage = protocolPage.value + 1;
  await loadProtocolsForSelect(protocolSearchQuery.value, nextPage);
}

// ============================================
// ОБРАБОТЧИК ПОИСКА ПРОТОКОЛОВ
// ============================================

function onProtocolSearch(query: string) {
  protocolSearchQuery.value = query;
  protocolPage.value = 1;
  loadProtocolsForSelect(query, 1);
}

// ============================================
// ЗАГРУЗКА СЛЕДУЮЩЕЙ ПОРЦИИ ПОСТУПЛЕНИЙ
// ============================================

async function loadMoreReceipts() {
  if (isLoadingReceipts.value || !receiptHasMore.value) return;
  
  const nextPage = receiptPage.value + 1;
  await loadReceiptsForSelect(receiptSearchQuery.value, nextPage);
}

// ============================================
// ЗАГРУЗКА ПОСТУПЛЕНИЙ С ПАГИНАЦИЕЙ
// ============================================

async function loadReceiptsForSelect(search: string = '', page: number = 1) {
  isLoadingReceipts.value = true;
  try {
    const response = await $fetch<ApiResponse>('/api/lab/receipt-material', {
      params: {
        page: page,
        pageSize: 200,
        search: search,
        sortKey: 'qualDate',
        sortOrder: 'desc',
      },
    });
    
    if (response?.success) {
      const items = response.data?.map((item: any) => ({
        id: item.id,
        label: `${item.material?.name || 'Без материала'} (${item.qualDocNumber || 'без номера'})`,
        description: `от ${item.qualDate ? new Date(item.qualDate).toLocaleDateString('ru-RU') : 'не указана'}`,
      })) || [];
      
      if (page === 1) {
        displayedReceiptItems.value = items;
      } else {
        displayedReceiptItems.value = [...displayedReceiptItems.value, ...items];
      }
      
      receiptHasMore.value = (response.total || 0) > displayedReceiptItems.value.length;
      receiptPage.value = page;
      
    //   console.log(`📥 Загружено поступлений: ${displayedReceiptItems.value.length} из ${response.total || 0}`);
    }
  } catch (error) {
    console.error('Ошибка загрузки поступлений:', error);
  } finally {
    isLoadingReceipts.value = false;
  }
}

function onReceiptSearch(query: string) {
  receiptSearchQuery.value = query;
  receiptPage.value = 1;
  loadReceiptsForSelect(query, 1);
}

// ============================================
// ЗАГРУЗКА СПРАВОЧНИКОВ
// ============================================

async function loadReferenceData() {
  try {
    const [
      plpResponse,
      inspectorResponse,
      objectResponse,
      protocolResponse
    ] = await Promise.all([
      $fetch<ApiResponse>('/api/lab/plp/all', { params: { sortKey: 'name', sortOrder: 'asc' } }),
      $fetch<ApiResponse>('/api/lab/inspector/all', { params: { sortKey: 'name', sortOrder: 'asc' } }),
      $fetch<ApiResponse>('/api/lab/objects/all', { params: { sortKey: 'name', sortOrder: 'asc' } }),
      $fetch<ApiResponse>('/api/lab/test-protocol/all', { params: { sortKey: 'protocolNumber', sortOrder: 'asc' } }),
    ]);

    plpItems.value = plpResponse?.data?.map((item: any) => ({
      id: item.id,
      label: item.name,
      description: item.note || ''
    })) || [];

    inspectorItems.value = inspectorResponse?.data?.map((item: any) => ({
      id: item.id,
      label: item.name,
      description: item.note || ''
    })) || [];

    testObjectItems.value = objectResponse?.data?.map((item: any) => ({
      id: item.id,
      label: item.name,
      description: item.note || ''
    })) || [];

     // Загружаем первую порцию поступлений
    await loadReceiptsForSelect('', 1);
    
    // Загружаем первую порцию протоколов
    await loadProtocolsForSelect('', 1);

  } catch (error) {
    console.error('Ошибка загрузки справочников:', error);
    showTost('Ошибка!', 'Не удалось загрузить справочные данные', 'error', 'fxemoji:warningsign', 5000);
  }
}

// ============================================
// ОБРАБОТЧИК ИЗМЕНЕНИЯ ОБЪЕКТА
// ============================================

function onObjectChange(value: any) {
  // При изменении объекта очищаем поле "Место отбора"
  currentSamplingTest.testLocationName = '';
}

// ============================================
// ЗАГРУЗКА ОСНОВНЫХ ДАННЫХ
// ============================================

async function loadSamplingTests() {
  isLoading.value = true;
  try {
    const response = await $fetch<ApiResponse>('/api/lab/sampling-test', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
      },
    });
    
    if (response?.success) {
      samplingTests.value = response.data || [];
      totalCount.value = Number(response.total) || 0;
    }
  } catch (error) {
    console.error('Ошибка загрузки актов:', error);
    showTost('Ошибка!', 'Не удалось загрузить данные', 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoading.value = false;
  }
}

// ============================================
// ВЫБОР АКТА
// ============================================

function selectSamplingTest(test: any) {
  selectedSamplingTestId.value = test.id;
  
  const info: any = {
    material: '—',
    manufacturer: '—',
    receipt: '—',
    protocol: '—',
  };
  
  if (test.receiptMaterial) {
    info.receipt = `№${test.receiptMaterial.qualDocNumber || 'без номера'}`;
    if (test.receiptMaterial.material) {
      info.material = test.receiptMaterial.material.name;
      if (test.receiptMaterial.material.manufacturer) {
        info.manufacturer = test.receiptMaterial.material.manufacturer.name;
      }
    }
  }
  
  if (test.testProtocol?.receiptMaterial) {
    const rm = test.testProtocol.receiptMaterial;
    if (!info.receipt || info.receipt === '—') {
      info.receipt = `№${rm.qualDocNumber || 'без номера'}`;
    }
    if (rm.material) {
      if (info.material === '—') info.material = rm.material.name;
      if (rm.material.manufacturer && info.manufacturer === '—') {
        info.manufacturer = rm.material.manufacturer.name;
      }
    }
  }
  
  if (test.testProtocol) {
    info.protocol = test.testProtocol.protocolNumber || '—';
  }
  
  selectedSamplingTestInfo.value = info;
}

// ============================================
// ОБРАБОТЧИК ФАЙЛОВ
// ============================================

function handleSDocChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target?.files && target.files.length) {
    sDocFile.value = target.files[0] ?? null;
  } else {
    sDocFile.value = null;
  }
}

// ============================================
// СОРТИРОВКА И ПАГИНАЦИЯ
// ============================================

const sortBy = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1;
  loadSamplingTests();
};

const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadSamplingTests();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadSamplingTests();
  }
};

// ============================================
// СОХРАНЕНИЕ
// ============================================

const saveSamplingTest = async () => {
  if (!currentSamplingTest.plpId) {
    showTost('Предупреждение!', 'ПЛП обязателен для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }
  if (!currentSamplingTest.inspectorId) {
    showTost('Предупреждение!', 'Инспектор обязателен для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }
  if (!currentSamplingTest.testObjectId) {
    showTost('Предупреждение!', 'Объект обязателен для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }
  if (!currentSamplingTest.testLocationName?.trim()) {
    showTost('Предупреждение!', 'Место отбора обязательно для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }
  if (!currentSamplingTest.sActNumber?.trim()) {
    showTost('Предупреждение!', 'Номер акта обязателен для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }
  if (!currentSamplingTest.sActDate) {
    showTost('Предупреждение!', 'Дата акта обязательна для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('plpId', String(currentSamplingTest.plpId));
    formData.append('inspectorId', String(currentSamplingTest.inspectorId));
    formData.append('testObjectId', String(currentSamplingTest.testObjectId));
    formData.append('testLocationName', currentSamplingTest.testLocationName.trim());
    if (currentSamplingTest.receiptMaterialId) {
      formData.append('receiptMaterialId', String(currentSamplingTest.receiptMaterialId));
    }
    if (currentSamplingTest.testProtocolId) {
      formData.append('testProtocolId', String(currentSamplingTest.testProtocolId));
    }
    formData.append('sActNumber', currentSamplingTest.sActNumber.trim());
    if (currentSamplingTest.sActDate) {
      formData.append('sActDate', dateToISOString(currentSamplingTest.sActDate as any));
    }
    if (currentSamplingTest.note) {
      formData.append('note', currentSamplingTest.note);
    }
    if (sDocFile.value) {
      formData.append('sDoc', sDocFile.value);
    }

    const url = currentSamplingTest.id 
      ? `/api/lab/sampling-test/${currentSamplingTest.id}` 
      : '/api/lab/sampling-test';
    
    const method = currentSamplingTest.id ? 'put' : 'post';
    
    const response = await $fetch<ApiResponse>(url, {
      method,
      body: formData,
    });

    if (response?.success) {
      showTost(
        'Успех!',
        currentSamplingTest.id ? 'Акт обновлен' : 'Акт добавлен',
        'success',
        'streamline-freehand-color:form-validation-check-double',
        3000
      );
      await loadSamplingTests();
      resetForm();
    }
  } catch (error) {
    console.error('Ошибка сохранения акта:', error);
    showTost(
      'Ошибка!',
      `Не удалось сохранить акт. ${(error as any)?.message || 'Неизвестная ошибка'}`,
      'error',
      'fxemoji:warningsign',
      5000
    );
  } finally {
    isLoading.value = false;
  }
};

// ============================================
// РЕДАКТИРОВАНИЕ
// ============================================

const editSamplingTest = (test: any) => {
  const sActDate = parseToCalendarDate(test.sActDate);
  
  Object.assign(currentSamplingTest, {
    id: test.id,
    plpId: test.plpId || null,
    inspectorId: test.inspectorId || null,
    testObjectId: test.testLocation?.testObject?.id || null,
    testLocationName: test.testLocation?.name || '',
    receiptMaterialId: test.receiptMaterialId || test.testProtocol?.receiptMaterial?.id || null,
    testProtocolId: test.testProtocolId || null,
    sActNumber: test.sActNumber || '',
    sActDate: sActDate,
    sDocPath: test.sDocPath || null,
    note: test.note || '',
  });
  
  dbResponse.value = { 'Документ отбора проб': test.sDocPath };
  isEditing.value = true;
  selectedSamplingTestId.value = test.id;
  selectSamplingTest(test);
};

// ============================================
// УДАЛЕНИЕ (ЗАБЛОКИРОВАНО)
// ============================================

const deleteSamplingTest = async (id: number) => {
  showTost(
    'Удаление заблокировано!',
    'Функция удаления актов временно недоступна',
    'warning',
    'fxemoji:warningsign',
    5000
  );
  return;
};

// ============================================
// СБРОС ФОРМЫ
// ============================================

const resetForm = () => {
  Object.assign(currentSamplingTest, {
    id: null,
    plpId: null,
    inspectorId: null,
    testObjectId: null,
    testLocationName: '',
    receiptMaterialId: null,
    testProtocolId: null,
    sActNumber: '',
    sActDate: null,
    sDocPath: null,
    note: '',
  });
  sDocFile.value = null;
  if (sDocInput.value) {
    sDocInput.value.value = '';
  }
  dbResponse.value = null;
  isEditing.value = false;
  selectedSamplingTestId.value = null;
  selectedSamplingTestInfo.value = {
    material: '—',
    manufacturer: '—',
    receipt: '—',
    protocol: '—',
  };
};

const cancelEdit = resetForm;

// ============================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================

onMounted(() => {
  loadReferenceData();
  loadSamplingTests();
});

watch(search, () => {
  currentPage.value = 1;
  loadSamplingTests();
});

watch(pageSize, () => {
  currentPage.value = 1;
  loadSamplingTests();
});

defineExpose({
  loadSamplingTests,
  resetForm,
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