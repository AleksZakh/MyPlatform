<!-- components/lab/TableSettingsModal.vue -->
<template>
  <UModal
    :close="{ onClick: () => emit('close') }"
    class="custom-modal"
    :ui="{ content: 'sm:max-w-none w-max' }"
  >
    <template #header>
      <div class="flex items-center gap-3">
        <div class="text-2xl text-blue-500">
          <Icon name="streamline-freehand-color:content-browser-edit" size="28" />
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
      <div class="space-y-4 relative">
        <!-- Контейнер для настроек -->
        <div class="space-y-4 space-x-0 px-2 -my-6 -mx-6 bg-gray-50 parent">
          
          <!-- ===== БЛОК: Настройка колонок ===== -->
          <fieldset class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80">
            <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
              <span>
                <Icon name="streamline-freehand-color:tablet-application" size="24" />
                Отображаемые колонки
              </span>
              <span class="text-xs text-gray-400 font-light">(выберите необходимые)</span>
            </legend>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 p-2">
              <!-- Кнопки управления -->
              <div class="flex gap-2 md:col-span-2 mb-2">
                <UButton
                  size="sm"
                  variant="outline"
                  @click="selectAllColumns"
                  class="text-sm"
                >
                  Выбрать все
                </UButton>
                <UButton
                  size="sm"
                  variant="outline"
                  @click="deselectAllColumns"
                  class="text-sm"
                >
                  Снять все
                </UButton>
                <UButton
                  size="sm"
                  variant="outline"
                  color="error"
                  @click="resetToDefault"
                  class="text-sm"
                >
                  Сбросить
                </UButton>
              </div>

              <!-- Список всех возможных колонок (статический) -->
              <div 
                v-for="column in allAvailableColumns" 
                :key="column"
                class="flex flex-col"
              >
                <label class="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 rounded-md cursor-pointer transition">
                  <input
                    type="checkbox"
                    :value="column"
                    v-model="tempVisibleColumns"
                    class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span class="text-md text-gray-700">
                    {{ getColumnLabel(column) }}
                  </span>
                </label>
              </div>

              <!-- Информация о выбранных колонках -->
              <div class="md:col-span-2 mt-2 text-sm text-gray-500">
                Выбрано: <span class="font-semibold">{{ tempVisibleColumns.length }}</span> 
                из <span class="font-semibold">{{ allAvailableColumns.length }}</span> колонок
              </div>
            </div>
          </fieldset>

          <!-- Дополнительная информация -->
          <div class="text-xs text-gray-400 px-2 pb-1 flex justify-between">
            <span>Всего доступно колонок: {{ allAvailableColumns.length }}</span>
            <span>Выбрано для отображения: {{ tempVisibleColumns.length }}</span>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full gap-4 justify-end pt-2">
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          label="Отмена"
          @click="emit('close')"
        />
        <UButton
          type="button"
          variant="solid"
          color="primary"
          label="💾 Сохранить"
          @click="handleSave"
          :loading="saving"
        />
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
// ======= ИМПОРТЫ =======
import { ref, computed } from 'vue';
import { useTableSettings } from '~/composables/useTableSettings';

const props = defineProps<{
    reloadData: Function;
    visibleHeaders: any
}>()

// ======= СОБЫТИЯ =======
const emit = defineEmits<{
    (e: 'close'): void
    (e: 'save', columns: string[]): void
    (e: 'updateTable'): void  // 👈 НОВОЕ СОБЫТИЕ ДЛЯ ОБНОВЛЕНИЯ ТАБЛИЦЫ
}>()

// ======= КОМПОЗАБЛЫ =======
const { tableSettings, updateVisibleColumns, resetSettings, getAllAvailableColumns } = useTableSettings()

// ======= СОСТОЯНИЯ =======
const saving = ref(false)
const tempVisibleColumns = ref<string[]>([])

// ======= ВЫЧИСЛЯЕМЫЕ СВОЙСТВА =======
// Получаем ВСЕ возможные колонки из композбла (статический список)
const allAvailableColumns = computed(() => getAllAvailableColumns())

// ======= МЕТОДЫ =======
function getColumnLabel(header: string): string {
  const labels: Record<string, string> = {
    'ПЛП': 'ПЛП',
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
    'Примечание': 'Примечание',
  }
  return labels[header] || header
}

function selectAllColumns() {
  tempVisibleColumns.value = [...allAvailableColumns.value]
}

function deselectAllColumns() {
  tempVisibleColumns.value = []
}

function resetToDefault() {
  resetSettings()
  tempVisibleColumns.value = [...tableSettings.value.visibleColumns]
}

async function handleSave() {
  saving.value = true
  try {
    // Сохраняем настройки
    updateVisibleColumns(tempVisibleColumns.value)
    
    // Эмитим событие сохранения
    emit('save', tempVisibleColumns.value)

     // 👇 ВЫЗЫВАЕМ СОБЫТИЕ ОБНОВЛЕНИЯ ТАБЛИЦЫ
        updateVisibleColumns(tempVisibleColumns.value)
        props.visibleHeaders
        props.reloadData(); 
    
    
    // Закрываем модалку
    emit('close')
  } catch (error) {
    console.error('Ошибка сохранения настроек:', error)
  } finally {
    saving.value = false
  }
}

// Инициализируем временные настройки при создании компонента
// Берем текущие видимые колонки из настроек
tempVisibleColumns.value = [...tableSettings.value.visibleColumns]
</script>

<style scoped>
/* Стили для легенд */
legend {
  background: transparent !important;
}

.parent {
  border-radius: 8px;
  padding: 6px 8px;
}

fieldset {
  transition: all 0.2s ease;
}

fieldset:hover {
  border-color: #94a3b8;
}

/* Стили для чекбоксов */
input[type="checkbox"] {
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