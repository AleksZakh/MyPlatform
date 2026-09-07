<template>
  <div class="p-0 absolute right-0 left-0 bottom-0 top-0">
    <!-- Основная карточка -->
    <div class="mx-auto bg-white rounded-xl shadow-lg px-4 py-2 absolute top-0 bottom-0 left-0 right-0 flex flex-col justify-start">
      <h1 class="text-3xl font-bold text-gray-800 mb-2">
        Протоколы испытаний
      </h1>

      <!-- Форма добавления/редактирования -->
      <form
        @submit.prevent="saveProtocol"
        class="bg-gray-50 rounded-lg px-6 py-4 mb-2"
      >
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Номер протокола <span class="text-red-500">*</span>
            </label>
            <input
              v-model="currentProtocol.protocolNumber"
              type="text"
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Введите номер протокола"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Дата протокола
            </label>
            <CustomDateInput
              v-model="currentProtocol.protocolDate"
              :required="false"
              :min-value="minDate"
              :max-value="maxDate"
              class="w-full"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Результат испытаний
            </label>
            <USelect
              v-model="currentProtocol.testResult"
              :items="testResultItems"
              class="w-full"
              :class="{
                'border-2 border-green-100 ring-2 ring-green-100': currentProtocol.testResult === 'Соответствует',
                'border-2 border-red-100 ring-2 ring-red-100': currentProtocol.testResult === 'Не соответствует',
                'border border-gray-100': !currentProtocol.testResult || currentProtocol.testResult === ''
              }"
              placeholder="Выберите результат"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Документ протокола
            </label>
            <UInput
              @change="(e: Event) => protocolDocChange((e.target as HTMLInputElement).files!)"
              type="file"
              class="w-full"
            />
            <div
              v-if="dbResponse && dbResponse['Документ протокола']"
              class="flex items-center gap-2 mt-1"
            >
              <a
                :href="getFileUrl(dbResponse['Документ протокола'])"
                class="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                target="_blank"
              >
                <Icon name="i-heroicons-document-text" class="w-4 h-4" />
                {{ getFileName(dbResponse['Документ протокола']) }}
              </a>
            </div>
          </div>

          <div class="md:col-span-2">
            <label class="block text-sm font-medium text-gray-700 mb-1">
              Примечание
            </label>
            <input
              v-model="currentProtocol.note"
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
            <!-- Ячейка 1: Поступление материала -->
            <td class="py-0.5 pr-4 align-top w-1/2">
              <span class="font-semibold text-blue-600">Поступление материала:</span>
              <span class="text-blue-700 ml-2">{{ selectedProtocolInfo?.receiptMaterial || '—' }}</span>
            </td>
            <!-- Ячейка 2: Материал -->
            <td class="py-0.5 align-top w-1/2">
              <span class="font-semibold text-blue-600">Материал:</span>
              <span class="text-blue-700 ml-2">{{ selectedProtocolInfo?.material || '—' }}</span>
            </td>
          </tr>
          <!-- Строка 2 -->
          <tr>
            <!-- Ячейка 3: Производитель -->
            <td class="py-0.5 pr-4 align-top w-1/2">
              <span class="font-semibold text-blue-600">Производитель:</span>
              <span class="text-blue-700 ml-2">{{ selectedProtocolInfo?.manufacturer || '—' }}</span>
            </td>
            <!-- Ячейка 4: Акты отбора проб -->
            <td class="py-0.5 align-top w-1/2">
              <span class="font-semibold text-blue-600">Акты отбора проб:</span>
              <div class="inline-block align-middle ml-2 text-blue-700">
                <div 
                  v-if="selectedProtocolInfo?.samplingTests && selectedProtocolInfo.samplingTests.length > 0"
                  class="max-h-12 overflow-y-auto text-xs space-y-0.5"
                >
                  <div 
                    v-for="(act, index) in selectedProtocolInfo.samplingTests" 
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
              placeholder="Поиск протоколов..."
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
        <tr v-if="protocols.length === 0">
          <td colspan="7" class="px-6 py-4 text-center text-gray-500">
            Протоколы не найдены
          </td>
        </tr>
        <tr
          v-for="protocol in protocols"
          :key="protocol.id"
          @click="selectProtocol(protocol)"
          class="cursor-pointer hover:bg-gray-50 transition-colors"
          :class="{ 'bg-blue-50': selectedProtocolId === protocol.id }"
        >
          <!-- Номер протокола -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
            {{ protocol.protocolNumber }}
          </td>
          
          <!-- Дата протокола -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
            {{ protocol.protocolDate ? new Date(protocol.protocolDate).toLocaleDateString('ru-RU') : '—' }}
          </td>
          
          <!-- Результат испытаний -->
          <td class="px-6 py-4 whitespace-nowrap">
            <span
              class="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              :class="getResultBadgeClass(protocol.testResult)"
            >
              <span class="w-1.5 h-1.5 rounded-full" :class="getResultDotClass(protocol.testResult)"></span>
              {{ protocol.testResult || '—' }}
            </span>
          </td>
          
          <!-- Материал -->
          <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
            {{ protocol.receiptMaterial?.material?.name || '—' }}
          </td>
          
          <!-- Производитель -->
          <td class="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
            {{ protocol.receiptMaterial?.material?.manufacturer?.name || '—' }}
          </td>
          
          <!-- НОВАЯ КОЛОНКА: Документ протокола (ссылка на файл) -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <a
              v-if="protocol.protocolDocPath"
              :href="getFileUrl(protocol.protocolDocPath)"
              class="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              target="_blank"
              @click.stop
            >
              <Icon name="i-heroicons-document-text" class="w-4 h-4" />
              {{ getFileName(protocol.protocolDocPath) }}
            </a>
            <span v-else class="text-gray-400">—</span>
          </td>
          
          <!-- Количество актов отбора -->
          <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
            <span class="text-xs bg-gray-100 px-2 py-1 rounded">
              {{ protocol._count?.samplingTests || 0 }} актов
            </span>
          </td>
          
          <!-- Действия -->
          <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
            <button
              @click.stop="editProtocol(protocol)"
              class="text-blue-600 hover:text-blue-900 mr-3 transition-colors"
              title="Редактировать"
            >
              <svg class="w-5 h-5 inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              @click.stop="deleteProtocol(protocol.id)"
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
// СОСТОЯНИЕ
// ============================================

interface Protocol {
  id: number;
  protocolNumber: string;
  protocolDate: string | null;
  protocolDocPath: string | null;
  testResult: string;
  note: string | null;
  receiptMaterial: {
    id: number;
    qualDate: string | null;
    qualDocNumber: string | null;
    material: {
      id: number;
      name: string;
      manufacturer: {
        id: number;
        name: string;
      } | null;
    } | null;
  } | null;
  samplingTests: any[];
  _count: {
    samplingTests: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

const search = ref('');
const isEditing = ref(false);
const isLoading = ref(false);

const minDate = new CalendarDate(2000, 1, 1);
const maxDate = getToday();

const testResultItems = ['Соответствует', 'Не соответствует'];
const protocolDocFile = ref<File | null>(null);
const dbResponse = ref<Record<string, any> | null>(null);
const selectedProtocolId = ref(null);
const selectedProtocolInfo = ref<Record<string, any> | null>({
  receiptMaterial: '—',
  material: '—',
  manufacturer: '—',
  samplingTests: [],
});

// Заголовки таблицы
const headers = [
  { key: 'protocolNumber', title: 'Номер протокола' },
  { key: 'protocolDate', title: 'Дата' },
  { key: 'testResult', title: 'Результат' },
  { key: 'material', title: 'Материал' },
  { key: 'manufacturer', title: 'Производитель' },
  { key: 'document', title: 'Документ' },  // ← НОВАЯ КОЛОНКА
  { key: 'count', title: 'Актов отбора' },
  { key: 'actions', title: 'Действия' },
];

// Сортировка
const sortKey = ref('protocolNumber');
const sortOrder = ref('asc');

// Пагинация
const currentPage = ref(1);
const pageSize = ref(10);

// Данные с сервера
const protocols = ref<Protocol[]>([]);
const totalCount = ref(0);

// Текущий протокол для формы
const currentProtocol = reactive({
  id: null,
  protocolNumber: '',
  protocolDate: null,
  protocolDocPath: null,
  testResult: '',
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

function getResultBadgeClass(result: string): string {
  if (!result) return 'bg-gray-100 text-gray-600';
  const lower = result.toLowerCase();
  if (lower.includes('не соответствует')) return 'bg-red-100 text-red-700';
  if (lower.includes('соответствует')) return 'bg-green-100 text-green-700';
  return 'bg-gray-100 text-gray-600';
}

function getResultDotClass(result: string): string {
  if (!result) return 'bg-gray-400';
  const lower = result.toLowerCase();
  if (lower.includes('не соответствует')) return 'bg-red-500';
  if (lower.includes('соответствует')) return 'bg-green-500';
  return 'bg-gray-400';
}

function protocolDocChange(files: FileList) {
  if (files && files.length) {
    protocolDocFile.value = files[0] ?? null;
  }
}

// Загрузка данных с сервера с пагинацией
async function loadProtocols() {
  isLoading.value = true;
  try {
    const response = await $fetch('/api/lab/test-protocol', {
      params: {
        page: currentPage.value,
        pageSize: pageSize.value,
        search: search.value,
        sortKey: sortKey.value,
        sortOrder: sortOrder.value,
      },
    });
    
    if (response?.success) {
      protocols.value = response.data;
      totalCount.value = response.total;
    }
  } catch (error) {
    console.error('Ошибка загрузки протоколов:', error);
    showTost('Ошибка!', 'Не удалось загрузить данные', 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoading.value = false;
  }
}

// Выбор протокола для отображения связанных данных
function selectProtocol(protocol:any) {
  selectedProtocolId.value = protocol.id;
  
  // Формируем информацию о связях
  const info: any = {};
  
  if (protocol.receiptMaterial) {
    info.receiptMaterial = `№${protocol.receiptMaterial.qualDocNumber || 'без номера'} от ${protocol.receiptMaterial.qualDate ? new Date(protocol.receiptMaterial.qualDate).toLocaleDateString('ru-RU') : 'не указана'}`;
    
    if (protocol.receiptMaterial.material) {
      info.material = protocol.receiptMaterial.material.name;
      
      if (protocol.receiptMaterial.material.manufacturer) {
        info.manufacturer = protocol.receiptMaterial.material.manufacturer.name;
      }
    }
  }
  
  if (protocol.samplingTests && protocol.samplingTests.length > 0) {
    info.samplingTests = protocol.samplingTests.map((act: any) => 
      `Акт №${act.sActNumber || 'без номера'} от ${act.sActDate ? new Date(act.sActDate).toLocaleDateString('ru-RU') : 'не указана'}`
    );
  }
  
  selectedProtocolInfo.value = info;
}

// Сортировка
const sortBy = (key:any) => {
  if (sortKey.value === key) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortOrder.value = 'asc';
  }
  currentPage.value = 1;
  loadProtocols();
};

// Пагинация
const previousPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
    loadProtocols();
  }
};

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
    loadProtocols();
  }
};

// Сохранение протокола
const saveProtocol = async () => {
  if (!currentProtocol.protocolNumber?.trim()) {
    showTost('Предупреждение!', 'Номер протокола обязателен для заполнения', 'warning', 'fxemoji:warningsign', 5000);
    return;
  }

  isLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('protocolNumber', currentProtocol.protocolNumber.trim());
    
    if (currentProtocol.protocolDate) {
      formData.append('protocolDate', dateToISOString(currentProtocol.protocolDate));
    }
    if (currentProtocol.testResult) {
      formData.append('testResult', currentProtocol.testResult);
    }
    if (currentProtocol.note) {
      formData.append('note', currentProtocol.note);
    }
    if (protocolDocFile.value) {
      formData.append('protocolDoc', protocolDocFile.value);
    }

    const url = currentProtocol.id 
      ? `/api/lab/test-protocol/${currentProtocol.id}` 
      : '/api/lab/test-protocol';
    
    const method = currentProtocol.id ? 'put' : 'post';
    
    const response = await $fetch<ApiResponse>(url, {
      method,
      body: formData,
    });

    if (response?.success) {
      showTost(
        'Успех!',
        currentProtocol.id ? 'Протокол обновлен' : 'Протокол добавлен',
        'success',
        'streamline-freehand-color:form-validation-check-double',
        3000
      );
      await loadProtocols();
      resetForm();
    }
  } catch (error) {
    
    console.error('Ошибка сохранения протокола:', error);
    showTost(
      'Ошибка!',
      `Не удалось сохранить протокол. ${(error as any)?.message || 'Неизвестная ошибка'}`,
      'error',
      'fxemoji:warningsign',
      5000
    );
  } finally {
    isLoading.value = false;
  }
};

// Редактирование протокола
const editProtocol = (protocol:any) => {
  Object.assign(currentProtocol, {
    id: protocol.id,
    protocolNumber: protocol.protocolNumber,
    protocolDate: protocol.protocolDate ? new Date(protocol.protocolDate) : null,
    protocolDocPath: protocol.protocolDocPath || null,
    testResult: protocol.testResult || '',
    note: protocol.note || '',
  });
  dbResponse.value = { 'Документ протокола': protocol.protocolDocPath };
  isEditing.value = true;
  selectedProtocolId.value = protocol.id;
  selectProtocol(protocol);
};

// Удаление протокола (заблокировано)
const deleteProtocol = async (id:any) => {
  showTost(
    'Удаление заблокировано!',
    'Функция удаления протоколов временно недоступна',
    'warning',
    'fxemoji:warningsign',
    5000
  );
  return;
};

// Сброс формы
const resetForm = () => {
  Object.assign(currentProtocol, {
    id: null,
    protocolNumber: '',
    protocolDate: null,
    protocolDocPath: null,
    testResult: '',
    note: '',
  });
  protocolDocFile.value = null;
  dbResponse.value = null;
  isEditing.value = false;
  selectedProtocolId.value = null;
  selectedProtocolInfo.value = null;
};

const cancelEdit = resetForm;

// ============================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================

onMounted(() => {
  loadProtocols();
});

// Следим за изменением поиска
watch(search, () => {
  currentPage.value = 1;
  loadProtocols();
});

// Следим за изменением размера страницы
watch(pageSize, () => {
  currentPage.value = 1;
  loadProtocols();
});

// ============================================
// ЭКСПОРТЫ
// ============================================
defineExpose({
  loadProtocols,
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

.max-h-20 {
  max-height: 5rem;
  overflow-y: auto;
}

.max-h-20::-webkit-scrollbar {
  width: 4px;
}

.max-h-20::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.max-h-20::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.max-h-20::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>