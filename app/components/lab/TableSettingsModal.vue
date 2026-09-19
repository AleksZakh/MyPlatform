<!-- app/components/lab/TableSettingsModal.vue -->

<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    class="custom-modal"
    :ui="{ content: 'h-fit' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="text-2xl text-blue-500">
          <Icon
            name="streamline-freehand-color:content-browser-edit"
            size="28"
          />
        </div>

        <div>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            Настройка таблицы
          </h3>

          <p class="text-sm text-gray-500 dark:text-gray-400">
            Настройка отображаемых колонок
          </p>
        </div>
      </div>
    </template>


    <template #body>
      <div class="relative p-2">
        <fieldset
          class="border-2 border-gray-200 px-2 rounded-md bg-white/80"
        >
          <legend
            class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent"
          >
            <span>
              <Icon
                name="streamline-freehand-color:tablet-application"
                size="24"
              />
              Отображаемые колонки
            </span>

            <span class="text-xs text-gray-400 font-light">
              (выберите необходимые)
            </span>
          </legend>


          <div
            class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-2"
          >
            <div
              class="flex gap-2 md:col-span-2 mb-2"
            >
              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                @click="selectAllColumns"
              >
                Выбрать все
              </UButton>

              <UButton
                size="sm"
                variant="outline"
                color="neutral"
                @click="deselectAllColumns"
              >
                Снять все
              </UButton>

              <UButton
                size="sm"
                variant="outline"
                color="error"
                @click="resetToDefault"
              >
                Сбросить
              </UButton>
            </div>


            <div
              v-for="column in LAB_TABLE_COLUMNS"
              :key="column.id"
              class="flex flex-col"
            >
              <label
                class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-md cursor-pointer transition"
              >
                <input
                  v-model="tempVisibleColumns"
                  type="checkbox"
                  :value="column.id"
                  class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                >

                <span class="text-md text-gray-700">
                  {{ column.label }}
                </span>
              </label>
            </div>


            <div
              class="md:col-span-2 mt-2 text-sm text-gray-500"
            >
              Выбрано:
              <span class="font-semibold">
                {{ tempVisibleColumns.length }}
              </span>
              из
              <span class="font-semibold">
                {{ LAB_TABLE_COLUMNS.length }}
              </span>
              колонок
            </div>
          </div>
        </fieldset>


        <div
          class="text-xs text-gray-400 px-2 mt-2 flex justify-between"
        >
          <span>
            Всего доступно колонок:
            {{ LAB_TABLE_COLUMNS.length }}
          </span>

          <span>
            Выбрано для отображения:
            {{ tempVisibleColumns.length }}
          </span>
        </div>
      </div>
    </template>


    <template #footer>
      <div
        class="flex w-full gap-4 justify-end pt-2"
      >
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          label="Отмена"
          @click="emit('close')"
        />

        <UButton
          type="button"
          variant="outline"
          color="neutral"
          :loading="saving"
          @click="handleSave"
        >
          <Icon
            name="streamline-freehand-color:floppy-disk"
          />
          <span>Сохранить</span>
        </UButton>
      </div>
    </template>
  </UModal>
</template>


<script setup lang="ts">
import { ref } from 'vue'

import {
  LAB_TABLE_COLUMNS,
  useTableSettings,
} from '~/composables/useTableSettings'


const emit = defineEmits<{
  close: []
  save: [columns: string[]]
}>()


const {
  tableSettings,
  updateVisibleColumns,
  resetSettings,
} = useTableSettings()


const saving = ref(false)

const tempVisibleColumns =
  ref<string[]>([
    ...tableSettings.value.visibleColumns,
  ])


function selectAllColumns() {
  tempVisibleColumns.value =
    LAB_TABLE_COLUMNS.map(
      column => column.id,
    )
}


function deselectAllColumns() {
  tempVisibleColumns.value = []
}


function resetToDefault() {
  resetSettings()

  tempVisibleColumns.value = [
    ...tableSettings.value.visibleColumns,
  ]
}


async function handleSave() {
  saving.value = true

  try {
    updateVisibleColumns(
      tempVisibleColumns.value,
    )

    emit(
      'save',
      [...tempVisibleColumns.value],
    )

    emit('close')
  } catch (error) {
    console.error(
      'Ошибка сохранения настроек:',
      error,
    )
  } finally {
    saving.value = false
  }
}
</script>


<style scoped>
legend {
  background: transparent !important;
}

fieldset {
  transition: all 0.2s ease;
}

fieldset:hover {
  border-color: #94a3b8;
}

input[type='checkbox'] {
  accent-color: #3b82f6;
  cursor: pointer;
}

label {
  cursor: pointer;
  user-select: none;
}

label:hover {
  background-color: #f9fafb;
}
</style>
