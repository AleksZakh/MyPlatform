<template>
  <div
    class="w-full absolute top-0 bottom-0 flex flex-col overflow-hidden mx-auto bg-white py-1 px-3 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)]"
  >
    <div class="flex flex-wrap gap-4 items-center justify-between py-1">
      <div class="flex p-0 text-lg">
        <UInput v-model="globalFilter" class="min-w-80 text-lg" placeholder="быстрый поиск ..." />
      </div>
      <div class="flex gap-2">
        <div>
          <UTooltip text="настройка полей таблицы">
            <UButton
              @click="tableSettingsOpen"
              class="px-3 py-1 bg-white border text-lg text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon name="material-symbols-light:table-view-outline-rounded" size="24" />
              Настройка полей таблицы
            </UButton>
          </UTooltip>
        </div>
        <div>
          <UTooltip text="Патаметры фильтра">
            <UButton
              class="px-3 py-1 bg-white border text-lg text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
              variant="outline"
              color="neutral"
              @click="hendleFilterPanel"
            >
              <div class="relative flex">
                <Icon name="streamline-freehand-color:filter" size="20" />
              </div>
              Настройка фильтра
              <UBadge v-if="activeFiltersCount > 0" size="sm" color="primary" class="ml-1">
                {{ activeFiltersCount }}
              </UBadge>
            </UButton>
          </UTooltip>
        </div>
        <div>
          <UTooltip text="Создать новую запись" :kbds="['Alt', 'Shift', 'N']">
            <UButton
              @click="open('create')"
              class="px-4 py-1 bg-white border text-lg text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon name="streamline-freehand-color:edit-pen-write-paper" size="24" />
              Создать запись
            </UButton>
          </UTooltip>
        </div>
        <div>
          <UTooltip text="Экспорт записей" :kbds="['Alt', 'Shift', 'E']">
            <UButton
              @click="exportRecordsOpen"
              class="px-3 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <Icon name="streamline-freehand-color:database-hand" size="24" />
              <Icon name="material-symbols:line-end-arrow-notch" />
              <Icon name="vscode-icons:file-type-excel2" size="24" />
            </UButton>
          </UTooltip>
        </div>
      </div>
    </div>

    <!-- Таблица данных -->
    <div v-if="loading" class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <p class="mt-2 text-gray-600">Загрузка данных...</p>
    </div>

    <div v-else-if="originalData.length === 0" class="text-center py-12 text-gray-500">
      <p>Нет данных</p>
    </div>

    <div
      v-else
      class="overflow-x-auto custom-scrollbar shadow-md rounded-lg overflow-y-auto flex-1 min-h-0"
      style="max-height: 70vh"
    >
      <table
        :style="{ width: `${table.getTotalSize()}px`, minWidth: '100%' }"
        class="bg-white border border-gray-200 text-sm table-fixed"
      >
        <UContextMenu :items="itemHead" :ui="{ content: 'w-50' }">
          <thead class="bg-gray-100 sticky top-0 z-10">
            <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id" class="divide-x-3 divide-solid divide-gray-200">
              <th
                v-for="header in headerGroup.headers"
                :key="header.id"
                :style="{ width: `${header.getSize()}px` }"
                class="relative px-2 py-3 text-left text-sm font-medium text-gray-600 uppercase tracking-wider group overflow-hidden select-none"
              >
                <div class="flex items-center gap-2">
                  <FlexRender
                    :render="header.column.columnDef.header"
                    :props="header.getContext()"
                  />
                </div>

                <!-- Ползунок для ресайза -->
                <div
                  :class="[
                    'absolute right-0 top-0 h-full w-1 cursor-col-resize bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-20',
                    header.column.getIsResizing() ? 'bg-blue-500 opacity-100' : '',
                  ]"
                  @mousedown="header.getResizeHandler()($event)"
                  @touchstart="header.getResizeHandler()($event)"
                />
              </th>
            </tr>
          </thead>
        </UContextMenu>

        <UContextMenu :items="items" :ui="{ content: 'w-48' }">
          <tbody class="divide-y divide-gray-200">
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.id"
              class="hover:bg-gray-50 transition"
              :class="{
                'bg-red-50': row.original['Результат испытаний'] === 'Не соответствует',
                'bg-green-50': isRowSelected(row.original.ID),
              }"
              @click="selectRow(row.original)"
              @dblclick.stop.prevent="handleDblClick(row.original.ID, row.original)"
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :style="{ width: `${cell.column.getSize()}px` }"
                class="px-2 py-1 text-gray-700 align-top truncate"
                :class="cell.column.columnDef.meta?.cellClass?.(cell.row.original) ?? ''"
                :title="formatCellValue(cell.getValue() as string, cell.column.id, 'title')"
              >
                <FlexRender
                  :render="cell.column.columnDef.cell"
                  :props="cell.getContext()"
                />
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
      <div class="text-gray-600 flex items-center gap-6 data-count-info">
        <div>
          <span class="flex items-center gap-1">
            <Icon name="streamline-freehand-color:database" size="20" />
            Всего: <span>{{ totalCount }}</span>
          </span>
        </div>
        <div class="flex items-center gap-4">
          <span class="flex items-center gap-1">
            <Icon name="streamline-freehand-color:app-window-user" size="20" />На экране:
            {{ originalData.length }}
          </span>
          <USelect
            v-model="countRecords"
            :items="[10, 25, 50, 100]"
            @update:model-value="onPageSizeChange"
          />
        </div>
      </div>

      <div class="pagination-info flex items-center gap-3">
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
import { ref, computed, onMounted, h } from 'vue'
import {
  useVueTable,
  getCoreRowModel,
  FlexRender,
  createColumnHelper,
} from '@tanstack/vue-table'
import createModal from '~/components/lab/createModal.vue'
import viewModal from '~/components/lab/viewModal.vue'
import ExportRecordsModal from './ExportRecordsModal.vue'
import FilterPanelModal from './FilterPanelModal.vue'
import TableSettingsModal from '~/components/lab/TableSettingsModal.vue'
import type { ContextMenuItem } from '@nuxt/ui'
import { useRecordDelete } from '~/composables/useRecordDelete'
import { useLabDataLoader } from '~/composables/useLabDataLoader'
import { useTableSettings } from '~/composables/useTableSettings'
import { useTableFilterStore } from '~/stores/tableFilter'

declare module '@tanstack/table-core' {
  interface ColumnMeta<TData, TValue> {
    cellClass?: (row: TData) => string
  }
}

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
  reloadCurrentPage,
} = useLabDataLoader()

const { tableSettings, getVisibleColumns, getAllAvailableColumns } = useTableSettings()
const { deleteRecordWithRefresh } = useRecordDelete()
const filterStore = useTableFilterStore()
const countRecords = ref(25)

const selectedRecord = ref<any>(null)
const count = ref(0)
const overlay = useOverlay()
const modalExportRecords = overlay.create(ExportRecordsModal)
const modalTableSettings = overlay.create(TableSettingsModal)
const modalCreate = overlay.create(createModal)
const modalFilterPanel = overlay.create(FilterPanelModal)
const modalView = overlay.create(viewModal)

const rowSelectedId = ref<number | null>(null)
const showSettingsModal = ref(false)
const globalFilter = ref('')

// ✅ Кэш ширин колонок между перерисовками
const columnSizes = ref<Record<string, number>>({})

// Начальные ширины для известных колонок
const DEFAULT_SIZES: Record<string, number> = {
  'ПЛП': 80,
  'Наименование объекта': 250,
  'Номер акта отбора проб': 130,
  'Дата отбора проб': 130,
  'Место отбора проб': 180,
  'Лицо, предоставившее пробу': 180,
  'Дата поступления материала': 150,
  'Дата документа о качестве': 160,
  'Наименование материала': 200,
  'Документ о качестве': 150,
  'Предприятие-изготовитель': 200,
  'Номер протокола': 130,
  'Дата протокола': 130,
  'Результат испытаний': 150,
  'Примечание (акт)': 200,
}

// Видимые заголовки
const visibleHeaders = computed(() => {
  const visibleColumns = getVisibleColumns()
  return headers.value.filter((header) => visibleColumns.includes(header))
})

const activeFiltersCount = computed(() => filterStore.getActiveFiltersCount)

// ✅ Динамическая сборка колонок
const columnHelper = createColumnHelper<any>()
const columns = computed(() => {
  return visibleHeaders.value.map((header) => {
    const size = columnSizes.value[header] ?? DEFAULT_SIZES[header] ?? 180

    return columnHelper.accessor((row: any) => row[header], {
      id: header,
      header: () => getColumnLabel(header),
      size,
      minSize: 60,
      cell: (info) => {
        const raw = info.getValue() as string | undefined
        return formatCellValue(raw, header)
      },
      meta: {
        cellClass: (row: any) => {
          const value = row[header]?.toLowerCase?.().trim?.()
          if (header === 'Результат испытаний') {
            if (value === 'не соответствует') return 'font-medium text-red-600'
            if (value === 'соответствует') return 'font-medium text-green-600'
          }
          return ''
        },
      },
    })
  })
})

// ✅ Инициализация таблицы
const table = useVueTable({
  get data() {
    return originalData.value
  },
  get columns() {
    return columns.value
  },
  columnResizeMode: 'onChange',
  getCoreRowModel: getCoreRowModel(),
  state: {
    get columnSizing() {
      return columnSizes.value
    },
  },
  onColumnSizingChange: (updater) => {
    if (typeof updater === 'function') {
      columnSizes.value = updater(columnSizes.value)
    } else {
      columnSizes.value = updater
    }
  },
})

// 👇 Обработчики пагинации
const onPageChange = async (page: number) => {
  await changePage(page)
  rowSelectedId.value = null
  selectedRecord.value = null
}

const onPageSizeChange = (size: number) => {
  currentPage.value = 1
  pageSize.value = size
  loadData()
}

const openTableSettings = () => {
  showSettingsModal.value = true
}

const handleSettingsSave = (_columns: string[]) => {}

const hendleFilterPanel = () => {
  modalFilterPanel.open({
    onApply: () => {
      reloadCurrentPage()
    },
  })
}

const selectRow = (row: any): void => {
  const id = row.ID
  if (rowSelectedId.value === id) {
    rowSelectedId.value = null
    selectedRecord.value = null
  } else {
    rowSelectedId.value = id
    selectedRecord.value = row
  }
}

const itemHead: ContextMenuItem[][] = [
  [
    {
      label: 'Настройка таблицы',
      icon: 'streamline-freehand-color:content-browser-edit',
      onClick: () => {
        openTableSettings()
        tableSettingsOpen()
      },
    },
  ],
]

const items: ContextMenuItem[][] = [
  [
    {
      label: '"просто посмотреть"',
      icon: 'streamline-freehand-color:kindle-read-document-hold',
      onClick: () => {
        if (selectedRecord.value) {
          handleDblClick(selectedRecord.value.ID, selectedRecord.value, 'view')
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
          handleDblClick(selectedRecord.value.ID, selectedRecord.value, 'edit')
        }
      },
    },
  ],
  [
    {
      label: 'Удалить',
      color: 'error' as const,
      icon: 'streamline-freehand-color:delete-bin-2',
      disabled: true,
      onClick: () => handleDelete(selectedRecord.value),
    },
  ],
]

async function handleDelete(record: any) {
  if (!record) return
  const id = record.ID || record.index
  const recordName =
    record['Наименование объекта'] || record.objectName || `запись #${id}`

  await deleteRecordWithRefresh(id, recordName, async () => {
    await reloadCurrentPage()
    selectedRecord.value = null
  })
}

const isRowSelected = (id: any): boolean => {
  return rowSelectedId.value === id
}

function handleDblClick(index: any, row: any, action: string = 'view') {
  selectedRecord.value = {
    ...row,
    index,
    action: action,
  }

  setTimeout(() => {
    open(action)
  }, 50)
}

async function exportRecordsOpen() {
  modalExportRecords.open({})
}

async function tableSettingsOpen() {
  modalTableSettings.open({
    onSave: handleSettingsSave,
    reloadData: reloadCurrentPage,
    visibleHeaders: visibleHeaders.value,
  })
}

async function open(action: string) {
  const record = {
    ...(selectedRecord.value || {}),
    action,
  }
  selectedRecord.value = record

  if (action == 'view') {
    modalView.open({
      record: record,
      onEdit: () => {
        record.action = 'edit'
        modalCreate.open({
          count: count.value,
          selectedRecord: record,
          reloadData: reloadCurrentPage,
        })
      },
      onClose: () => {
        modalView.close()
      },
    })
  } else if (action == 'create' || action == 'edit') {
    modalCreate.open({
      count: count.value,
      selectedRecord: record,
      reloadData: reloadCurrentPage,
    })
  }
}

const columnLabels: Record<string, string> = {
  'ПЛП': 'ПЛП',
  'Наименование объекта': 'Объект',
  'Номер акта отбора проб': '№ Акта',
  'Дата отбора проб': 'Дата отбора',
  'Место отбора проб': 'Место отбора',
  'Лицо, предоставившее пробу': 'Кто предоставил',
  'Дата поступления материала': 'Дата поступления',
  'Дата документа о качестве': 'Дата документа о качестве',
  'Наименование материала': 'Материал',
  'Документ о качестве': 'Документ',
  'Предприятие-изготовитель': 'Изготовитель',
  'Номер протокола': '№ Протокола',
  'Дата протокола': 'Дата протокола',
  'Результат испытаний': 'Результат',
  'Примечание (акт)': 'Примечание',
}

onMounted(async () => {
  await loadData(1, 25)
})

function getColumnLabel(header: string): string {
  return columnLabels[header] || header
}

function formatCellValue(
  value: string | undefined,
  _header: string,
  contekst = ''
): string {
  if (!value) return '—'
  if (value.length > 15 && contekst != 'title') {
    return value.substring(0, 25) + '…'
  }
  return value
}
</script>

<style scoped>
.data-info {
  margin-top: auto;
  flex-shrink: 0;
  padding-top: 12px;
  border-top: 1px solid #e5e7eb;
}

.custom-scrollbar {
  flex: 1 1 auto;
  min-height: 0;
}

/* Аккуратный курсор при ресайзе */
.cursor-col-resize {
  user-select: none;
}
</style>