<template>
  <div class="p-0 absolute right-0 left-0 bottom-0 top-0">
    <!-- Основная карточка -->
    <div class="mx-auto bg-white rounded-xl shadow-lg px-4 py-2 absolute top-0 bottom-0 left-0 right-0 flex flex-col justify-start">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">
        Поступления материалов
      </h1>

      <!-- Форма добавления/редактирования -->
      <form
        @submit.prevent="saveReceipt"
        class="bg-gray-50 rounded-lg px-6 py-4 mb-2"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Материал <span class="text-red-500">*</span>
            </label>
            <USelectMenu
                size="md"
                v-model="currentReceipt.materialId as any"
                :items="materials"
                :searchable="true"
                :search-input="{ placeholder: 'Поиск материала...' }"
                class="w-full"
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

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Дата поступления
            </label>
            <CustomDateInput
              v-model="currentReceipt.qualDate as any"
              :required="false"
              :min-value="minDate"
              :max-value="maxDate"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Номер документа о качестве
            </label>
            <input
              v-model="currentReceipt.qualDocNumber"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите номер документа"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Документ о качестве
            </label>
            <UInput
              ref="qualDocInput"
              @change="handleQualDocChange"
              type="file"
              class="w-full"
            />
            <div
              v-if="dbResponse && dbResponse['Документ о качестве'] && dbResponse['Документ о качестве'] !== '-'"
              class="flex items-center gap-2 mt-1"
            >
              <a
                :href="getFileUrl(dbResponse['Документ о качестве'])"
                class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                target="_blank"
              >
                <Icon name="i-heroicons-document-text" class="w-4 h-4" />
                {{ getFileName(dbResponse['Документ о качестве']) }}
              </a>
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Примечание
            </label>
            <input
              v-model="currentReceipt.note"
              type="text"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Дополнительная информация"
            />
          </div>
        </div>

        <!-- Информационная панель о связях - ТАБЛИЦА 2×2 -->
        <div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div class="flex items-start gap-2">
            <Icon name="i-heroicons-information-circle" class="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-blue-800 mb-1">Доп. информация:</div>
              <!-- Таблица 2 строки × 2 столбца -->
              <table class="w-full text-sm text-blue-700">
                <tbody>
                  <!-- Строка 1 -->
                  <tr>
                    <!-- Ячейка 1: Материал -->
                    <td class="py-0.5 pr-4 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Материал:</span>
                      <span class="text-blue-700 ml-2">{{ selectedReceiptInfo?.material || '—' }}</span>
                    </td>
                    <!-- Ячейка 2: Производитель -->
                    <td class="py-0.5 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Производитель:</span>
                      <span class="text-blue-700 ml-2">{{ selectedReceiptInfo?.manufacturer || '—' }}</span>
                    </td>
                  </tr>
                  <!-- Строка 2 -->
                  <tr>
                    <!-- Ячейка 3: Протоколы испытаний -->
                    <td class="py-0.5 pr-4 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Протоколы испытаний:</span>
                      <div class="inline-block align-middle ml-2 text-blue-700">
                        <div 
                          v-if="selectedReceiptInfo?.testProtocols && selectedReceiptInfo.testProtocols.length > 0"
                          class="max-h-12 overflow-y-auto text-xs space-y-0.5"
                        >
                          <div 
                            v-for="(protocol, index) in selectedReceiptInfo.testProtocols" 
                            :key="index"
                            class="text-blue-600 truncate"
                          >
                            {{ protocol }}
                          </div>
                        </div>
                        <span v-else>—</span>
                      </div>
                    </td>
                    <!-- Ячейка 4: Акты отбора проб -->
                    <td class="py-0.5 align-top w-1/2">
                      <span class="font-semibold text-blue-600">Акты отбора проб:</span>
                      <div class="inline-block align-middle ml-2 text-blue-700">
                        <div 
                          v-if="selectedReceiptInfo?.samplingTests && selectedReceiptInfo.samplingTests.length > 0"
                          class="max-h-12 overflow-y-auto text-xs space-y-0.5"
                        >
                          <div 
                            v-for="(act, index) in selectedReceiptInfo.samplingTests" 
                            :key="index"
                            class="text-blue-600 truncate"
                          >
                            {{ act }}
                          </div>
                        </div>
                        <span v-else>—</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
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
              placeholder="Поиск поступлений..."
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
              <tr v-if="receipts.length === 0">
                <td colspan="7" class="px-6 py-4 text-center text-gray-500">
                  Поступления не найдены
                </td>
              </tr>
              <tr
                v-for="receipt in receipts"
                :key="receipt.id"
                @click="selectReceipt(receipt)"
                class="cursor-pointer hover:bg-gray-50 transition-colors"
                :class="{ 'bg-blue-50': selectedReceiptId === receipt.id }"
              >
                <!-- Материал -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {{ receipt.material?.name || '—' }}
                </td>
                
                <!-- Дата поступления -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {{ receipt.qualDate ? new Date(receipt.qualDate).toLocaleDateString('ru-RU') : '—' }}
                </td>
                
                <!-- Номер документа о качестве -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                  {{ receipt.qualDocNumber || '—' }}
                </td>
                
                <!-- Производитель -->
                <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                  {{ receipt.material?.manufacturer?.name || '—' }}
                </td>
                
                <!-- Документ о качестве (ссылка на файл) -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <a
                    v-if="receipt.qualDocPath && receipt.qualDocPath !== '-'"
                    :href="getFileUrl(receipt.qualDocPath)"
                    class="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    target="_blank"
                    @click.stop
                  >
                    <Icon name="i-heroicons-document-text" class="w-4 h-4" />
                    {{ getFileName(receipt.qualDocPath) }}
                  </a>
                  <span v-else class="text-gray-400">—</span>
                </td>
                
                <!-- Количество протоколов -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span class="text-xs bg-gray-100 px-2 py-1 rounded">
                    {{ receipt._count?.testProtocols || 0 }} протоколов
                  </span>
                </td>
                
                <!-- Действия -->
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    @click.stop="editReceipt(receipt)"
                    class="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
                    title="Редактировать"
                  >
                    <svg class="w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    @click.stop="deleteReceipt(receipt.id)"
                    class="text-red-600 hover:text-red-900 transition-colors opacity-50 cursor-not-allowed"
                    title="Удаление заблокировано"
                    disabled
                  >
                    <svg class="w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

interface Receipt {
  id: number;
  qualDate: string | null;
  qualDocNumber: string | null;
  qualDocPath: string | null;
  note: string | null;
  material: {
    id: number;
    name: string;
    manufacturer: {
      id: number;
      name: string;
    } | null;
  } | null;
  testProtocols: any[];
  _count: {
    testProtocols: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// ============================================
// СОСТОЯНИЕ
// ============================================

const search = ref('');
const isEditing = ref(false);
const isLoading = ref(false);

const minDate = new CalendarDate(2000, 1, 1);
const maxDate = getToday();

const qualDocInput = ref<HTMLInputElement | null>(null);
const qualDocFile = ref<File | null>(null);
const dbResponse = ref<Record<string, any> | null>(null);
const selectedReceiptId = ref<number | null>(null);
const selectedReceiptInfo = ref<Record<string, any> | null>({
  material: '—',
  manufacturer: '—',
  testProtocols: [],
  samplingTests: [],
});

// Данные для выпадающего списка материалов
const materials = ref<{ id: number; label: string; description?: string }[]>([]);

// Заголовки таблицы
const headers = [
  { key: 'material', title: 'Материал' },
  { key: 'qualDate', title: 'Дата поступления' },
  { key: 'qualDocNumber', title: 'Номер документа' },
  { key: 'manufacturer', title: 'Производитель' },
  { key: 'document', title: 'Документ' },
  { key: 'count', title: 'Протоколов' },
  { key: 'actions', title: 'Действия' },
];

// Сортировка
const sortKey = ref('material');
const sortOrder = ref('asc');

// Пагинация
const currentPage = ref(1);
const pageSize = ref(10);

// Данные с сервера
const receipts = ref<Receipt[]>([]);
const totalCount = ref(0);

// Текущее поступление для формы
const currentReceipt = reactive({
  id: null as number | null,
  materialId: null as number | null,
  qualDate: null as Date | null,
  qualDocNumber: '',
  qualDocPath: null as string | null,
  note: '',
});

// ============================================
// ВЫЧИСЛЯЕМЫЕ СВОЙСТВА
// ============================================

const totalPages = computed(() => {
  return Math.ceil(totalCount.value / pageSize.value);
});

const materialIdForSubmit = computed(() => {
  const val = currentReceipt.materialId;
  if (!val) return null;
  if (typeof val === 'object' && val !== null && (val as any).id) {
    return (val as any).id;
    }
  if (typeof val === 'number') return val;
  return null;
});

// ============================================
// МЕТОДЫ
// ============================================

function getFileName(path: string): string {
  if (!path) return '—';
  const parts = path.split('/');
  return parts[parts.length - 1] || path;
}

// Функция для конвертации строки даты в CalendarDate
function parseToCalendarDate(dateString: string | null | undefined): CalendarDate | null {
  if (!dateString) return null;
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    return new CalendarDate(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate()
    );
  } catch {
    return null;
  }
}

// ============================================
// ОБРАБОТЧИК ИЗМЕНЕНИЯ ФАЙЛА
// ============================================
function handleQualDocChange(event: Event): void {
  const target = event.target as HTMLInputElement;
  if (target?.files && target.files.length) {
    qualDocFile.value = target.files[0] ?? null;
    console.log('📎 Файл выбран:', qualDocFile.value?.name, qualDocFile.value?.size, 'байт');
  } else {
    qualDocFile.value = null;
    console.log('📎 Файл не выбран');
  }
}

// Загрузка материалов для выпадающего списка
async function loadMaterials() {
  try {
    const response = await $fetch('/api/lab/material/all', {
      params: {
        sortKey: 'name',
        sortOrder: 'asc',
      },
    });
    
    if (response?.success) {
        console.log('response ====> ', response)
      materials.value = response.data.map((item: any) => ({
        id: item.id,
        label: item.name,
        description: item.note || '',
      }));
    }
  } catch (error) {
    console.error('Ошибка загрузки материалов:', error);
  }
}

// Загрузка данных с сервера с пагинацией
async function loadReceipts() {
  isLoading.value = true;
  try {
    const response = await $fetch('/api/lab/receipt-material', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
      },
    });
    
    if (response?.success) {
      receipts.value = response.data;
      totalCount.value = response.total;
    }
  } catch (error) {
    console.error('Ошибка загрузки поступлений:', error);
    showTost('Ошибка!', 'Не удалось загрузить данные', 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoading.value = false;
  }
}

// Выбор поступления для отображения связанных данных
function selectReceipt(receipt: any) {
  selectedReceiptId.value = receipt.id;
  
  const info: any = {
    material: receipt.material?.name || '—',
    manufacturer: receipt.material?.manufacturer?.name || '—',
    testProtocols: [],
    samplingTests: [],
  };
  
  if (receipt.testProtocols && receipt.testProtocols.length > 0) {
    info.testProtocols = receipt.testProtocols.map((protocol: any) => 
      `Протокол №${protocol.protocolNumber || 'без номера'} от ${protocol.protocolDate ? new Date(protocol.protocolDate).toLocaleDateString('ru-RU') : 'не указана'}`
    );
    
    // Собираем все акты отбора из протоколов
    const allSamplingTests: string[] = [];
    receipt.testProtocols.forEach((protocol: any) => {
      if (protocol.samplingTests && protocol.samplingTests.length > 0) {
        protocol.samplingTests.forEach((act: any) => {
          allSamplingTests.push(
            `Акт №${act.sActNumber || 'без номера'} от ${act.sActDate ? new Date(act.sActDate).toLocaleDateString('ru-RU') : 'не указана'}`
          );
        });
      }
    });
    info.samplingTests = allSamplingTests;
  }
  
  selectedReceiptInfo.value = info;
}

// Сортировка
const sortBy = (key: string) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1;
  loadReceipts();
};

// Пагинация
const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadReceipts();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadReceipts();
  }
};

// Сохранение поступления
const saveReceipt = async () => {
  if (!currentReceipt.materialId) {
    showTost('Предупреждение!', 'Материал обязателен для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  console.log('🔍 Данные для отправки:');
    console.log('  materialId:', currentReceipt.materialId, typeof currentReceipt.materialId);
    console.log('  qualDate:', currentReceipt.qualDate);
    console.log('  qualDocNumber:', currentReceipt.qualDocNumber);
    console.log('  note:', currentReceipt.note);
    console.log('  qualDocFile:', qualDocFile.value);

  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('materialId', String(materialIdForSubmit.value));
    // formData.append('materialId', String(currentReceipt.materialId));
    
    if (currentReceipt.qualDate) {
        formData.append('qualDate', dateToISOString(currentReceipt.qualDate as any));
    }
    if (currentReceipt.qualDocNumber) {
      formData.append('qualDocNumber', currentReceipt.qualDocNumber);
    }
    if (currentReceipt.note) {
      formData.append('note', currentReceipt.note);
    }
    if (qualDocFile.value) {
      formData.append('qualDoc', qualDocFile.value);
    }

    const url = currentReceipt.id 
      ? `/api/lab/receipt-material/${currentReceipt.id}` 
      : '/api/lab/receipt-material';
    
    const method = currentReceipt.id ? 'put' : 'post';
    
    const response = await $fetch<ApiResponse>(url, {
      method,
      body: formData,
    });

    if (response?.success) {
      showTost(
        'Успех!',
        currentReceipt.id ? 'Поступление обновлено' : 'Поступление добавлено',
        'success',
        'streamline-freehand-color:form-validation-check-double',
        3000
      );
      await loadReceipts();
      resetForm();
    }
  } catch (error) {
    console.error('Ошибка сохранения поступления:', error);
    showTost(
      'Ошибка!',
      `Не удалось сохранить поступление. ${(error as any)?.message || 'Неизвестная ошибка'}`,
      'error',
      'fxemoji:warningsign',
      5000
    );
  } finally {
    isLoading.value = false;
  }
};

// Редактирование поступления
const editReceipt = (receipt: any) => {
    const qualDate = parseToCalendarDate(receipt.qualDate);
  Object.assign(currentReceipt, {
    id: receipt.id,
    materialId: receipt.materialId || null,
    qualDate: qualDate,
    qualDocNumber: receipt.qualDocNumber || '',
    qualDocPath: receipt.qualDocPath || null,
    note: receipt.note || '',
  });
  dbResponse.value = { 'Документ о качестве': receipt.qualDocPath };
  isEditing.value = true;
  selectedReceiptId.value = receipt.id;
  selectReceipt(receipt);
};

// Удаление поступления (заблокировано)
const deleteReceipt = async (id: number) => {
  showTost(
    'Удаление заблокировано!',
    'Функция удаления поступлений временно недоступна',
    'warning',
    'fxemoji:warningsign',
    5000
  );
  return;
};

// Сброс формы
const resetForm = () => {
  Object.assign(currentReceipt, {
    id: null,
    materialId: null,
    qualDate: null,
    qualDocNumber: '',
    qualDocPath: null,
    note: '',
  });
  qualDocFile.value = null;
  if (qualDocInput.value) {
    qualDocInput.value.value = '';
  }
  dbResponse.value = null;
  isEditing.value = false;
  selectedReceiptId.value = null;
  selectedReceiptInfo.value = {
    material: '—',
    manufacturer: '—',
    testProtocols: [],
    samplingTests: [],
  };
};

const cancelEdit = resetForm;

// ============================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================

onMounted(() => {
  loadMaterials();
  loadReceipts();
});

// Следим за изменением поиска
watch(search, () => {
  currentPage.value = 1;
  loadReceipts();
});

// Следим за изменением размера страницы
watch(pageSize, () => {
  currentPage.value = 1;
  loadReceipts();
});

// ============================================
// ЭКСПОРТЫ
// ============================================
defineExpose({
  loadReceipts,
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

.max-h-12 {
  max-height: 3rem;
  overflow-y: auto;
}

.max-h-12::-webkit-scrollbar {
  width: 3px;
}

.max-h-12::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.max-h-12::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.max-h-12::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

.max-h-12 {
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}
</style>