<template>
  <div
    class="w-full absolute top-0 bottom-0 flex flex-col overflow-hidden mx-auto bg-white py-1 px-3 rounded-lg shadow-[0_0_10px_rgba(0,0,0,0.1)]"
  >
    <div
      class="flex flex-wrap gap-4 items-center justify-between py-1"
    >
      <div class="flex p-0 text-lg">
        <UInput
          v-model="search"
          class="min-w-80 text-lg"
          placeholder="быстрый поиск ..."
        />
      </div>


      <div class="flex gap-2">
        <UTooltip text="настройка полей таблицы">
          <UButton
            class="px-3 py-1 bg-white border text-lg text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            @click="tableSettingsOpen"
          >
            <Icon
              name="material-symbols-light:table-view-outline-rounded"
              size="24"
            />
            Настройка полей таблицы
          </UButton>
        </UTooltip>


        <UTooltip text="Параметры фильтра">
          <UButton
            class="px-3 py-1 bg-white border text-lg text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            variant="outline"
            color="neutral"
            @click="handleFilterPanel"
          >
            <Icon
              name="streamline-freehand-color:filter"
              size="20"
            />

            Настройка фильтра

            <UBadge
              v-if="activeFiltersCount > 0"
              size="sm"
              color="primary"
              class="ml-1"
            >
              {{ activeFiltersCount }}
            </UBadge>
          </UButton>
        </UTooltip>


        <UTooltip
          text="Создать новую запись"
          :kbds="['Alt', 'Shift', 'N']"
        >
          <UButton
            class="px-4 py-1 bg-white border text-lg text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            @click="open('create')"
          >
            <Icon
              name="streamline-freehand-color:edit-pen-write-paper"
              size="24"
            />
            Создать запись
          </UButton>
        </UTooltip>


        <UTooltip
          text="Экспорт записей"
          :kbds="['Alt', 'Shift', 'E']"
        >
          <UButton
            class="px-3 py-2 bg-white border text-black font-normal border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            @click="exportRecordsOpen"
          >
            <Icon
              name="streamline-freehand-color:database-hand"
              size="24"
            />
            <Icon
              name="material-symbols:line-end-arrow-notch"
            />
            <Icon
              name="vscode-icons:file-type-excel2"
              size="24"
            />
          </UButton>
        </UTooltip>
      </div>
    </div>


    <div
      v-if="loading"
      class="text-center py-12"
    >
      <div
        class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"
      />

      <p class="mt-2 text-gray-600">
        Загрузка данных...
      </p>
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
      <table
        :style="{
          width: `${table.getTotalSize()}px`,
          minWidth: '100%',
        }"
        class="bg-white border border-gray-200 text-sm table-fixed"
      >
        <UContextMenu
          :items="itemHead"
          :ui="{ content: 'w-50' }"
        >
          <thead
            class="bg-gray-100 sticky top-0 z-10"
          >
            <draggable
              v-model="columnOrder"
              item-key="id"
              tag="tr"
              class="divide-x-3 divide-solid divide-gray-200"
              ghost-class="opacity-40"
              drag-class="cursor-grabbing"
              @end="onDragEnd"
            >
              <template
                #item="{ element: columnId }"
              >
                <th
                  :key="columnId"
                  :style="{
                    width: `${
                      getHeaderByColumnId(
                        headerGroupRef,
                        columnId,
                      )?.getSize() ?? 180
                    }px`,
                  }"
                  class="relative px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider group select-none cursor-grab"
                >
                  <div
                    class="flex items-center gap-2"
                  >
                    <FlexRender
                      v-if="
                        getHeaderByColumnId(
                          headerGroupRef,
                          columnId,
                        )
                      "
                      :render="
                        getHeaderByColumnId(
                          headerGroupRef,
                          columnId,
                        )!.column.columnDef.header
                      "
                      :props="
                        getHeaderByColumnId(
                          headerGroupRef,
                          columnId,
                        )!.getContext()
                      "
                    />
                  </div>


                  <div
                    :class="[
                      'absolute right-0 top-0 h-full w-1 cursor-col-resize bg-gray-300 opacity-0 group-hover:opacity-100 transition-opacity z-20',

                      getHeaderByColumnId(
                        headerGroupRef,
                        columnId,
                      )?.column.getIsResizing()
                        ? 'bg-blue-500 opacity-100'
                        : '',
                    ]"
                    @mousedown.stop="
                      getHeaderByColumnId(
                        headerGroupRef,
                        columnId,
                      )?.getResizeHandler()($event)
                    "
                    @touchstart.stop="
                      getHeaderByColumnId(
                        headerGroupRef,
                        columnId,
                      )?.getResizeHandler()($event)
                    "
                  />
                </th>
              </template>
            </draggable>
          </thead>
        </UContextMenu>


        <UContextMenu
          :items="items"
          :ui="{ content: 'w-48' }"
        >
          <tbody
            class="divide-y divide-gray-200"
          >
            <tr
              v-for="row in table.getRowModel().rows"
              :key="row.original.id"
              class="hover:bg-gray-50 transition"
              :class="{
                'bg-red-50':
                  row.original.testProtocol?.testResult
                    ?.toLowerCase()
                    .trim() === 'не соответствует',

                'bg-green-50':
                  isRowSelected(
                    row.original.id,
                  ),
              }"
              @click="
                selectRow(row.original)
              "
              @dblclick.stop.prevent="
                handleDblClick(
                  row.original.id,
                  row.original,
                )
              "
            >
              <td
                v-for="cell in row.getVisibleCells()"
                :key="cell.id"
                :style="{
                  width: `${cell.column.getSize()}px`,
                }"
                class="px-2 py-1 text-gray-700 align-top truncate"
                :class="
                  cell.column.columnDef.meta
                    ?.cellClass?.(
                      cell.row.original,
                    ) ?? ''
                "
                :title="
                  formatCellValue(
                    cell.getValue(),
                    cell.column.id,
                  )
                "
              >
                <FlexRender
                  :render="
                    cell.column.columnDef.cell
                  "
                  :props="
                    cell.getContext()
                  "
                />
              </td>
            </tr>
          </tbody>
        </UContextMenu>
      </table>
    </div>


    <div
      v-if="originalData.length > 0"
      class="flex justify-between items-center mt-4 text-md data-info shrink-0 pt-3 border-t border-gray-200"
    >
      <div
        class="text-gray-600 flex items-center gap-6 data-count-info"
      >
        <span
          class="flex items-center gap-1"
        >
          <Icon
            name="streamline-freehand-color:database"
            size="20"
          />
          Всего:
          <span>{{ totalCount }}</span>
        </span>


        <div
          class="flex items-center gap-4"
        >
          <span
            class="flex items-center gap-1"
          >
            <Icon
              name="streamline-freehand-color:app-window-user"
              size="20"
            />
            На экране:
            {{ originalData.length }}
          </span>

          <USelect
            v-model="countRecords"
            :items="[10, 25, 50, 100]"
            @update:model-value="
              onPageSizeChange
            "
          />
        </div>
      </div>


      <div
        class="pagination-info flex items-center gap-3"
      >
        <span
          class="flex items-center gap-1 text-gray-500"
        >
          Страница {{ currentPage }}
          из {{ totalPages }}
        </span>

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
import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  createColumnHelper,
  FlexRender,
  getCoreRowModel,
  useVueTable,
} from '@tanstack/vue-table'

import draggable from 'vuedraggable'

import type {
  ContextMenuItem,
} from '@nuxt/ui'

import createModal from '~/components/lab/createModal.vue'
import viewModal from '~/components/lab/viewModal.vue'
import ExportRecordsModal from './ExportRecordsModal.vue'
import FilterPanelModal from './FilterPanelModal.vue'
import TableSettingsModal from '~/components/lab/TableSettingsModal.vue'

import {
  useLabDataLoader,
} from '~/composables/useLabDataLoader'

import type {
  IncomingControlRecord,
} from '~/composables/useLabDataLoader'

import {
  LAB_TABLE_COLUMNS,
  useTableSettings,
} from '~/composables/useTableSettings'

import {
  useRecordDelete,
} from '~/composables/useRecordDelete'

import {
  useTableFilterStore,
} from '~/stores/tableFilter'


declare module '@tanstack/table-core' {
  interface ColumnMeta<TData, TValue> {
    cellClass?: (
      row: TData,
    ) => string
  }
}


const {
  loading,
  originalData,

  totalCount,
  totalPages,
  currentPage,
  pageSize,

  search,

  loadData,
  changePage,
  changePageSize,
  reloadCurrentPage,
} = useLabDataLoader()


const {
  tableSettings,
} = useTableSettings()


const {
  deleteRecordWithRefresh,
} = useRecordDelete()


const filterStore =
  useTableFilterStore()


const selectedRecord =
  ref<IncomingControlRecord & {
    action?: string
  } | null>(null)

const count = ref(0)

const countRecords =
  ref(pageSize.value)

const rowSelectedId =
  ref<number | null>(null)

const columnSizes =
  ref<Record<string, number>>({})

const columnOrder =
  ref<string[]>([])


const overlay = useOverlay()

const modalExportRecords =
  overlay.create(
    ExportRecordsModal,
  )

const modalTableSettings =
  overlay.create(
    TableSettingsModal,
  )

const modalCreate =
  overlay.create(
    createModal,
  )

const modalFilterPanel =
  overlay.create(
    FilterPanelModal,
  )

const modalView =
  overlay.create(
    viewModal,
  )


const activeFiltersCount =
  computed(
    () =>
      filterStore
        .getActiveFiltersCount,
  )


const visibleColumnIds =
  computed(() => {
    const available =
      new Set(
        LAB_TABLE_COLUMNS.map(
          column => column.id,
        ),
      )

    return tableSettings.value
      .visibleColumns
      .filter(
        column =>
          available.has(column),
      )
  })


const orderedVisibleColumnIds =
  computed(() => {
    const visible =
      visibleColumnIds.value

    if (
      columnOrder.value.length === 0
    ) {
      return visible
    }

    const visibleSet =
      new Set(visible)

    const ordered =
      columnOrder.value.filter(
        id => visibleSet.has(id),
      )

    const orderedSet =
      new Set(ordered)

    const missing =
      visible.filter(
        id => !orderedSet.has(id),
      )

    return [
      ...ordered,
      ...missing,
    ]
  })


const headerGroupRef =
  computed(
    () =>
      table.getHeaderGroups()[0],
  )


function getValueByPath(
  source: unknown,
  path: string,
): unknown {
  if (
    !source ||
    typeof source !== 'object'
  ) {
    return null
  }

  return path
    .split('.')
    .reduce<unknown>(
      (current, key) => {
        if (
          !current ||
          typeof current !== 'object'
        ) {
          return null
        }

        return (
          current as
            Record<string, unknown>
        )[key]
      },
      source,
    )
}


function formatDate(
  value: string,
): string {
  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    },
  ).format(date)
}


function formatCellValue(
  value: unknown,
  columnId: string,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }

  const definition =
    LAB_TABLE_COLUMNS.find(
      column =>
        column.id === columnId,
    )

  if (
    definition?.kind === 'date' &&
    typeof value === 'string'
  ) {
    return formatDate(value)
  }

  if (
    definition?.kind ===
      'document' &&
    typeof value === 'string'
  ) {
    const filename =
      value
        .split('/')
        .filter(Boolean)
        .at(-1)

    return (
      filename ||
      'Есть документ'
    )
  }

  return String(value)
}


const columnHelper =
  createColumnHelper<
    IncomingControlRecord
  >()


const columns =
  computed(() => {
    return orderedVisibleColumnIds
      .value
      .map(columnId => {
        const definition =
          LAB_TABLE_COLUMNS.find(
            column =>
              column.id ===
              columnId,
          )

        if (!definition) {
          return null
        }

        const size =
          columnSizes.value[
            columnId
          ] ??
          definition.size

        return columnHelper.accessor(
          row =>
            getValueByPath(
              row,
              columnId,
            ),
          {
            id: columnId,

            header:
              () =>
                definition.label,

            size,
            minSize: 60,

            cell: info =>
              formatCellValue(
                info.getValue(),
                columnId,
              ),

            meta: {
              cellClass:
                row => {
                  if (
                    columnId !==
                    'testProtocol.testResult'
                  ) {
                    return ''
                  }

                  const value =
                    String(
                      getValueByPath(
                        row,
                        columnId,
                      ) ?? '',
                    )
                      .toLowerCase()
                      .trim()

                  if (
                    value ===
                    'не соответствует'
                  ) {
                    return (
                      'font-medium text-red-600'
                    )
                  }

                  if (
                    value ===
                    'соответствует'
                  ) {
                    return (
                      'font-medium text-green-600'
                    )
                  }

                  return ''
                },
            },
          },
        )
      })
      .filter(
        (
          column,
        ): column is NonNullable<
          typeof column
        > => !!column,
      )
  })


const table =
  useVueTable({
    get data() {
      return originalData.value
    },

    get columns() {
      return columns.value
    },

    columnResizeMode:
      'onChange',

    getCoreRowModel:
      getCoreRowModel(),

    state: {
      get columnSizing() {
        return columnSizes.value
      },

      get columnOrder() {
        return columnOrder.value
      },
    },

    onColumnSizingChange:
      updater => {
        columnSizes.value =
          typeof updater ===
          'function'
            ? updater(
                columnSizes.value,
              )
            : updater
      },

    onColumnOrderChange:
      updater => {
        columnOrder.value =
          typeof updater ===
          'function'
            ? updater(
                columnOrder.value,
              )
            : updater
      },
  })


watch(
  visibleColumnIds,
  newIds => {
    const visibleSet =
      new Set(newIds)

    const preserved =
      columnOrder.value.filter(
        id =>
          visibleSet.has(id),
      )

    const preservedSet =
      new Set(preserved)

    const missing =
      newIds.filter(
        id =>
          !preservedSet.has(id),
      )

    columnOrder.value = [
      ...preserved,
      ...missing,
    ]
  },
  {
    immediate: true,
  },
)


let searchTimer:
  ReturnType<
    typeof setTimeout
  > | null = null


watch(
  search,
  () => {
    if (searchTimer) {
      clearTimeout(
        searchTimer,
      )
    }

    searchTimer =
      setTimeout(
        async () => {
          rowSelectedId.value =
            null

          selectedRecord.value =
            null

          await loadData(
            1,
            pageSize.value,
          )
        },
        350,
      )
  },
)


function getHeaderByColumnId(
  headerGroup: any,
  columnId: string,
) {
  return headerGroup?.headers
    ?.find(
      (header: any) =>
        header.column.id ===
        columnId,
    )
}


function onDragEnd() {
  table.setColumnOrder(
    [...columnOrder.value],
  )
}


const onPageChange =
  async (page: number) => {
    await changePage(page)

    rowSelectedId.value =
      null

    selectedRecord.value =
      null
  }


const onPageSizeChange =
  async (size: number) => {
    countRecords.value = size

    await changePageSize(size)

    rowSelectedId.value =
      null

    selectedRecord.value =
      null
  }


const handleSettingsSave =
  (columns: string[]) => {
    tableSettings.value
      .visibleColumns = [
        ...columns,
      ]
  }


const handleFilterPanel =
  () => {
    modalFilterPanel.open({
      onApply:
        async () => {
          await loadData(
            1,
            pageSize.value,
          )
        },
    })
  }


const selectRow =
  (
    row:
      IncomingControlRecord,
  ) => {
    const id = row.id

    if (
      rowSelectedId.value === id
    ) {
      rowSelectedId.value =
        null

      selectedRecord.value =
        null

      return
    }

    rowSelectedId.value = id

    selectedRecord.value = {
      ...row,
    }
  }


const isRowSelected =
  (id: number) => {
    return (
      rowSelectedId.value === id
    )
  }


const itemHead:
  ContextMenuItem[][] = [
    [
      {
        label:
          'Настройка таблицы',
        icon:
          'streamline-freehand-color:content-browser-edit',
        onClick:
          tableSettingsOpen,
      },
    ],
  ]


const items:
  ContextMenuItem[][] = [
    [
      {
        label:
          '"просто посмотреть"',
        icon:
          'streamline-freehand-color:kindle-read-document-hold',
        onClick: () => {
          if (
            selectedRecord.value
          ) {
            handleDblClick(
              selectedRecord.value.id,
              selectedRecord.value,
              'view',
            )
          }
        },
      },

      {
        label: 'Копировать',
        icon:
          'streamline-freehand-color:layers-bring-backward',
      },

      {
        label: 'Изменить',
        icon:
          'streamline-freehand-color:edit-pencil',
        onClick: () => {
          if (
            selectedRecord.value
          ) {
            handleDblClick(
              selectedRecord.value.id,
              selectedRecord.value,
              'edit',
            )
          }
        },
      },
    ],

    [
      {
        label: 'Удалить',
        color:
          'error' as const,
        icon:
          'streamline-freehand-color:delete-bin-2',
        disabled: true,
        onClick:
          () =>
            handleDelete(
              selectedRecord.value,
            ),
      },
    ],
  ]


async function handleDelete(
  record:
    IncomingControlRecord | null,
) {
  if (!record) {
    return
  }

  const recordName =
    record.testLocation
      ?.testObject
      ?.name ||
    `запись #${record.id}`

  await deleteRecordWithRefresh(
    record.id,
    recordName,
    async () => {
      await reloadCurrentPage()

      selectedRecord.value =
        null

      rowSelectedId.value =
        null
    },
  )
}


function handleDblClick(
  id: number,
  row: IncomingControlRecord,
  action = 'view',
) {
  selectedRecord.value = {
    ...row,
    action,
  }

  setTimeout(
    () => {
      open(action)
    },
    50,
  )
}


async function exportRecordsOpen() {
  modalExportRecords.open({})
}


async function tableSettingsOpen() {
  modalTableSettings.open({
    onSave:
      handleSettingsSave,
  })
}


async function open(
  action: string,
) {
  const record = {
    ...(selectedRecord.value ?? {}),
    action,
  }

  selectedRecord.value =
    record as
      IncomingControlRecord & {
        action?: string
      }

  if (action === 'view') {
    modalView.open({
      record,

      onEdit: () => {
        modalCreate.open({
          count:
            count.value,
          selectedRecord: {
            ...record,
            action: 'edit',
          },
          reloadData:
            reloadCurrentPage,
        })
      },

      onClose: () => {
        modalView.close()
      },
    })

    return
  }

  if (
    action === 'create' ||
    action === 'edit'
  ) {
    modalCreate.open({
      count:
        count.value,

      selectedRecord:
        record,

      reloadData:
        reloadCurrentPage,
    })
  }
}


onMounted(
  async () => {
    countRecords.value =
      pageSize.value

    await loadData(
      1,
      pageSize.value,
    )
  },
)
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

.cursor-col-resize {
  user-select: none;
}

.opacity-40 {
  opacity: 0.4;
}

.cursor-grabbing {
  cursor: grabbing;
}
</style>
