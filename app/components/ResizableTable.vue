<script setup lang="ts">
import { ref } from 'vue'
import {
  useVueTable,
  getCoreRowModel,
  FlexRender,
  createColumnHelper,
} from '@tanstack/vue-table'

// 1. Тестовые данные
interface Task {
  id: number
  title: string
  status: string
  author: string
}

const data = ref<Task[]>([
  { id: 1, title: 'Реализовать аудит логи', status: 'In Progress', author: 'admin@test.com' },
  { id: 2, title: 'Развернуть бэкенд на Nuxt', status: 'Done', author: 'user@test.com' },
  { id: 3, title: 'Исправить баг в фильтрах', status: 'Todo', author: 'dev@test.com' },
])

// 2. Описание колонок
const columnHelper = createColumnHelper<Task>()
const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    size: 60,
    minSize: 40,
  }),
  columnHelper.accessor('title', {
    header: 'Название задачи',
    size: 250,
    minSize: 100,
  }),
  columnHelper.accessor('status', {
    header: 'Статус',
    size: 120,
    minSize: 80,
  }),
  columnHelper.accessor('author', {
    header: 'Автор',
    size: 180,
    minSize: 100,
  }),
]

// 3. Инициализация таблицы (v8)
const table = useVueTable({
  get data() {
    return data.value
  },
  columns,
  columnResizeMode: 'onChange',
  getCoreRowModel: getCoreRowModel(),
})
</script>

<template>
  <div class="overflow-x-auto border border-gray-200 rounded-lg dark:border-gray-800">
    <!-- Фиксированная ширина таблицы -->
    <table
      :style="{ width: `${table.getTotalSize()}px`, minWidth: '100%' }"
      class="divide-y divide-gray-200 dark:divide-gray-800 table-fixed text-sm text-left"
    >
      <thead class="bg-gray-50 dark:bg-gray-900">
        <tr
          v-for="headerGroup in table.getHeaderGroups()"
          :key="headerGroup.id"
        >
          <!-- ИСПРАВЛЕНО: используем свойство .headers вместо метода .getHeaders() -->
          <th
            v-for="header in headerGroup.headers"
            :key="header.id"
            :style="{ width: `${header.getSize()}px` }"
            class="relative px-4 py-3 font-semibold text-gray-700 dark:text-gray-200 uppercase tracking-wider group select-none"
          >
            <!-- Отображение названия колонки -->
            <FlexRender
              :render="header.column.columnDef.header"
              :props="header.getContext()"
            />

            <!-- Ползунок для ресайза -->
            <div
              :class="[
                'absolute right-0 top-0 h-full w-1 cursor-col-resize bg-gray-300 dark:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity z-10',
                header.column.getIsResizing()
                  ? 'bg-primary-500 opacity-100 w-1'
                  : '',
              ]"
              @mousedown="header.getResizeHandler()($event)"
              @touchstart="header.getResizeHandler()($event)"
            />
          </th>
        </tr>
      </thead>

      <tbody class="divide-y divide-gray-200 dark:divide-gray-800 bg-white dark:bg-gray-950">
        <tr
          v-for="row in table.getRowModel().rows"
          :key="row.id"
          class="hover:bg-gray-50 dark:hover:bg-gray-900/50"
        >
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            :style="{ width: `${cell.column.getSize()}px` }"
            class="px-4 py-3 text-gray-600 dark:text-gray-300 truncate"
          >
            <FlexRender
              :render="cell.column.columnDef.cell"
              :props="cell.getContext()"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>