<!-- Контент для первой вкладки -->
<template>
  <div
    class="w-full max-h-[82vh] min-h-[80vh] flex flex-col overflow-hidden mx-auto bg-white p-3 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)]"
  >
    <div class="flex flex-wrap gap-4 items-center justify-between py-1">
      <div class="flex gap-2">
        <!-- Добавление новой записи -->
        <div>
          <UTooltip text="Создать новую запись" :kbds="['Alt', 'Shift', 'N']">
            <UButton
              @click="open('create')"
              class="px-4 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon
                :name="'streamline-freehand-color:edit-pen-write-paper'"
                size="24"
              />
              Создать запись
            </UButton>
          </UTooltip>
        </div>
        <div>
          <UTooltip text="Экспорт записей" :kbds="['Alt', 'Shift', 'E']">
            <UButton
              @click="exportRecordsOpen"
              class="px-4 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon
                :name="'streamline-freehand-color:database-hand'"
                size="24"
              />
              <Icon name="material-symbols:line-end-arrow-notch" />
              <Icon name="vscode-icons:file-type-excel2" size="24"/>
            </UButton>
          </UTooltip>
        </div>

        <!-- Кнопка настройки таблицы -->
        <!-- <div>
          <UTooltip text="Настроить таблицу" :kbds="['Ctrl', 'Shift', 'T']">
            <UButton
              @click="openTableSettings"
              class="px-4 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon
                :name="'streamline-freehand-color:table-settings'"
                size="24"
              />
              Настроить таблицу
            </UButton>
          </UTooltip>
        </div> -->
      </div>
    </div>

    <!-- Таблица данных -->
    <div v-if="loading" class="text-center py-12">
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
      ></div>
      <p class="mt-2 text-gray-600">Загрузка данных...</p>
    </div>

    <div
      v-else-if="originalData.length === 0"
      class="text-center py-12 text-gray-500"
    >
      <p>Нет данных</p>
    </div>

    <div
      v-else
      class="overflow-x-auto custom-scrollbar shadow-md rounded-lg overflow-y-auto flex-1 min-h-0"
      style="max-height: 70vh"
    >
    <table class="min-w-full bg-white border border-gray-200 text-sm">
        <UContextMenu :items="itemHead" :ui="{content: 'w-50'}">
          <thead class="bg-gray-100 sticky top-0">
            <tr>
              <th
                v-for="header in visibleHeaders"
                :key="header"
                class="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                <div class="flex items-center gap-2">
                  {{ getColumnLabel(header) }}
                </div>
              </th>
            </tr>
          </thead>
        </UContextMenu>
        <UContextMenu :items="items" :ui="{ content: 'w-48' }">
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="(row, index) in originalData"
              :key="row.ID"
              class="hover:bg-gray-50 transition"
              :class="{
                'bg-red-50': row['Результат испытаний'] === 'Не соответствует',
                'bg-green-50': isRowSelected(row),
                'hover:bg-gray-50': !isRowSelected(row.ID),
              }"
              @click="selectRow(row)"
              @dblclick.stop.prevent="handleDblClick(row.ID, row)"
            >
              <td
                v-for="header in visibleHeaders"
                :key="header"
                class="px-2 py-1 text-gray-700 align-top"
                :class="{
                  'font-medium text-red-600':
                    header === 'Результат испытаний' &&
                    row[header] === 'Не соответствует',
                  'font-medium text-green-600':
                    header === 'Результат испытаний' &&
                    row[header] === 'Соответствует',
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

    <!-- Информация о записях и пагинация -->
    <div 
      v-if="originalData.length > 0" 
      class="flex justify-between items-center mt-4 text-md data-info shrink-0 pt-3 border-t border-gray-200"
    >
      <div class=" text-gray-600 flex items-center gap-6 data-count-info">
        <div>
          <span class="flex items-center gap-1">
            <Icon :name="'streamline-freehand-color:database'" size="20" />
            Всего: <span>{{ totalCount }}</span>
          </span>
        </div>
        <div>
          <span class="flex items-center gap-1">
            <Icon
              :name="'streamline-freehand-color:app-window-user'"
              size="20"
            />На экране: {{ originalData.length }}
          </span>
        </div>
        
      </div>
      
      <!-- 👇 ПАГИНАЦИЯ -->
      <div class="pagination-info flex items-center gap-3 ">
        <div>
          <span class="flex items-center gap-1 text-gray-500">
            Страница {{ currentPage }} из {{ totalPages }}
          </span>
        </div>
        <UPagination
          v-model:page="currentPage"
          :total="totalCount"
          :items-per-page="pageSize"
          :sibling-count="1"
          active-color="neutral"
          active-variant="subtle"
          size="sm"
          show-edges
          @update:page="onPageChange"
        />
      </div>
    </div>

  </div>
</template>

<script setup lang="ts">
import createModal from '~/components/lab/createModal.vue';
import viewModal from '~/components/lab/viewModal.vue';
import ExportRecordsModal from './ExportRecordsModal.vue';
import TableSettingsModal from '~/components/lab/TableSettingsModal.vue';
import type { ContextMenuItem } from '@nuxt/ui';
import { useRecordDelete } from '~/composables/useRecordDelete';
import { useLabDataLoader } from '~/composables/useLabDataLoader';
import { useTableSettings } from '~/composables/useTableSettings';

// Используем композаблы
const { 
  loading, 
  originalData, 
  headers, 
  totalCount, 
  totalPages,
  currentPage,
  pageSize,
  loadData, 
  changePage,
  reloadCurrentPage
} = useLabDataLoader();

const { tableSettings, getVisibleColumns, getAllAvailableColumns } = useTableSettings();
const { deleteRecordWithRefresh } = useRecordDelete();

const selectedRecord = ref<any>(null);
const count = ref(0);
const toast = useToast();
const overlay = useOverlay();
const modalExportRecords = overlay.create(ExportRecordsModal);
const modalTableSettings = overlay.create(TableSettingsModal);
const modalCreate = overlay.create(createModal);
const modalView = overlay.create(viewModal);
const rowSelectedId = ref<number | null>(null);
const showSettingsModal = ref(false);

// Вычисляем видимые заголовки (на основе настроек)
const visibleHeaders = computed(() => {
  const visibleColumns = getVisibleColumns();
  return headers.value.filter(header => 
    visibleColumns.includes(header)
  );
});

// 👇 ОБРАБОТЧИК СМЕНЫ СТРАНИЦЫ
const onPageChange = async (page: number) => {
  console.log(`📄 Переход на страницу ${page}`);
  await changePage(page);
  // Сбрасываем выделение строки
  rowSelectedId.value = null;
  selectedRecord.value = null;
};

// Открытие настроек таблицы
const openTableSettings = () => {
  showSettingsModal.value = true;
};

// Обработчик сохранения настроек
const handleSettingsSave = (columns: string[]) => {
  console.log('обновление настроек таблицы');
  // Обновляем отображение
  // Дополнительная логика при сохранении
};

// 👇 ОБНОВЛЕНИЕ ТАБЛИЦЫ (с сохранением текущей страницы)
const handleUpdateTable = async () => {  
  await reloadCurrentPage();
  toast.add({
    title: '✅ Таблица обновлена',
    description: `Отображается ${getVisibleColumns().length} колонок (страница ${currentPage.value} из ${totalPages.value})`,
    color: 'success',
    icon: 'i-heroicons-check-circle',
    duration: 3000,
  });
};

const selectRow = (index: any): void => {
  if (rowSelectedId.value === index) {
    rowSelectedId.value = null;
    selectedRecord.value = null;
  } else {
    rowSelectedId.value = index;
    selectedRecord.value = index;
  }
};

const itemHead: ContextMenuItem[][] =[
  [
    {
      label: 'Настройка таблицы',
      icon: 'streamline-freehand-color:content-browser-edit',
      onClick: () => {
        openTableSettings();
        tableSettingsOpen();
      }
    },
  ]
]

const items: ContextMenuItem[][] = [
  [
    {
      label: '"просто посмотреть"',
      icon: 'streamline-freehand-color:kindle-read-document-hold',
      onClick: () => {
        if (selectedRecord.value) {
          handleDblClick(selectedRecord.value.ID, selectedRecord.value, 'view');
        }
      },
    },
    {
      label: 'Копировать',
      icon: 'streamline-freehand-color:layers-bring-backward',
    },
    {
      label: 'Изменить',
      icon: 'streamline-freehand-color:edit-pencil',
      onClick: () => {
        if (selectedRecord.value) {
          handleDblClick(selectedRecord.value.ID, selectedRecord.value, 'edit');
        }
      },
    },
  ],
  [
    {
      label: 'Удалить',
      color: 'error' as const,
      icon: 'streamline-freehand-color:delete-bin-2',
      onClick: () => handleDelete(selectedRecord.value),
    },
  ],
];

async function handleDelete(record: any) {
  if (!record) return;
  const id = record.ID || record.index;
  const recordName =
    record['Наименование объект'] || record.objectName || `запись #${id}`;

  await deleteRecordWithRefresh(id, recordName, async () => {
    // После удаления перезагружаем текущую страницу
    await reloadCurrentPage();
    selectedRecord.value = null;
  });
}

const isRowSelected = (index: any): boolean => {
  return rowSelectedId.value === index;
};

function handleDblClick(index: any, row: any, action: string = 'view') {
  selectedRecord.value = {
    ...row,
    index,
    action: action,
  };

  setTimeout(() => {
    open(action);
  }, 50);
}

async function exportRecordsOpen() {
  modalExportRecords.open({})
}

async function tableSettingsOpen() {
  console.log('настройка таблицы');
  modalTableSettings.open({
    onSave: handleSettingsSave,
    reloadData: reloadCurrentPage,
    visibleHeaders: visibleHeaders,
  });
}

async function open(action: string) {
  const record = {
    ...(selectedRecord.value || {}),
    action,
  };
  selectedRecord.value = record;

  if (action == 'view') {
    modalView.open({
      record: record,
    });
  } else if (action == 'create' || action == 'edit') {
    modalCreate.open({
      count: count.value,
      selectedRecord: record,
      reloadData: reloadCurrentPage,
    });
  }
}

const columnLabels: Record<string, string> = {
  ПЛП: 'ПЛП',
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
  Примечание: 'Примечание',
};

onMounted(async () => {
  await loadData(1, 25);
});

function getColumnLabel(header: string): string {
  return columnLabels[header] || header;
}

function formatCellValue(
  value: string | undefined,
  header: string,
  contekst = ''
): string {
  if (!value) return '—';
  if (value.length > 15 && contekst != 'title') {
    return value.substring(0, 25) + '…';
  }
  return value;
}
</script>

<style scoped>
.data-info {
  margin-top: auto; /* Прижимаем к низу */
  flex-shrink: 0; /* Запрещаем сжатие */
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.custom-scrollbar {
  flex: 1 1 auto; /* Растягиваем */
  min-height: 0; /* Важно для flex */
}
</style>