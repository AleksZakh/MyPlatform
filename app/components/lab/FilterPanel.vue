<!-- app/components/lab/FilterPanel.vue -->
<template>
  <div class="panel-wrapper w-full shadow-md" ref="panelRef">
    <form
      @submit.prevent="applyFilters"
      class="flex bg-gray-50 rounded-md flex-col gap-4 p-5 md:p-6"
    >
      <!-- ПЛП -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📋 ПЛП:</label
        >
        <input
          v-model="localFilters.plp"
          type="text"
          placeholder="Поиск по ПЛП..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Наименование объекта -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >🏷️ Наименование объекта:</label
        >
        <input
          v-model="localFilters.objectName"
          type="text"
          placeholder="Поиск по наименованию..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Номер акта отбора проб -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📄 Номер акта:</label
        >
        <input
          v-model="localFilters.samplingActNumber"
          type="text"
          placeholder="Поиск по номеру акта..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Дата отбора проб (диапазон) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📅 Дата отбора:</label
        >
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <input
            v-model="localFilters.samplingDateFrom"
            type="date"
            class="flex-1 min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
          />
          <span class="text-gray-400">—</span>
          <input
            v-model="localFilters.samplingDateTo"
            type="date"
            class="flex-1 min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
          />
        </div>
      </div>

      <!-- Место отбора проб -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📍 Место отбора:</label
        >
        <input
          v-model="localFilters.samplingPlace"
          type="text"
          placeholder="Поиск по месту отбора..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Лицо, предоставившее пробу -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >👤 Кто предоставил:</label
        >
        <input
          v-model="localFilters.personProvidedSample"
          type="text"
          placeholder="Поиск по лицу..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Дата поступления материала (диапазон) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📥 Дата поступления:</label
        >
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <input
            v-model="localFilters.materialReceiptDateFrom"
            type="date"
            class="flex-1 min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
          />
          <span class="text-gray-400">—</span>
          <input
            v-model="localFilters.materialReceiptDateTo"
            type="date"
            class="flex-1 min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
          />
        </div>
      </div>

      <!-- Наименование материала -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >🧪 Материал:</label
        >
        <input
          v-model="localFilters.materialName"
          type="text"
          placeholder="Поиск по материалу..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Документ о качестве -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📑 Документ о качестве:</label
        >
        <input
          v-model="localFilters.qualityDocument"
          type="text"
          placeholder="Поиск по документу..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Предприятие-изготовитель -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >🏭 Изготовитель:</label
        >
        <input
          v-model="localFilters.manufacturer"
          type="text"
          placeholder="Поиск по изготовителю..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Номер протокола -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📋 Номер протокола:</label
        >
        <input
          v-model="localFilters.protocolNumber"
          type="text"
          placeholder="Поиск по номеру протокола..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Дата протокола (диапазон) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📅 Дата протокола:</label
        >
        <div class="flex flex-1 flex-wrap items-center gap-2">
          <input
            v-model="localFilters.protocolDateFrom"
            type="date"
            class="flex-1 min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
          />
          <span class="text-gray-400">—</span>
          <input
            v-model="localFilters.protocolDateTo"
            type="date"
            class="flex-1 min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
          />
        </div>
      </div>

      <!-- Результат испытаний (выпадающий список) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >✅ Результат:</label
        >
        <select
          v-model="localFilters.testResult"
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
        >
          <option value="">Все</option>
          <option value="Соответствует">Соответствует</option>
          <option value="Не соответствует">Не соответствует</option>
        </select>
      </div>

      <!-- Примечание -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-32 text-gray-700 text-sm"
          >📝 Примечание:</label
        >
        <input
          v-model="localFilters.note"
          type="text"
          placeholder="Поиск по примечанию..."
          class="flex-1 px-4 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
        />
      </div>

      <!-- Кнопки действий -->
      <div
        class="flex justify-end gap-3 mt-3 pt-3 border-t border-dashed border-gray-200"
      >
        <button
          type="button"
          @click="resetFilters"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-md transition text-sm"
        >
          Сбросить всё
        </button>
        <button
          type="submit"
          class="bg-[#2c7da0] hover:bg-[#1f5e7a] text-white font-semibold py-2 px-7 rounded-md transition shadow-sm text-sm"
        >
          🔍 Применить фильтр
        </button>
      </div>

      <!-- Индикатор активных фильтров -->
      <div v-if="hasActiveFilters" class="text-xs text-blue-600 mt-1">
        ✅ Фильтры активны
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
// ======= ИНТЕРФЕЙС ФИЛЬТРОВ =======
interface Filters {
  // Текстовые поля (поиск по частичному совпадению)
  plp: string;
  objectName: string;
  samplingActNumber: string;
  samplingPlace: string;
  personProvidedSample: string;
  materialName: string;
  qualityDocument: string;
  manufacturer: string;
  protocolNumber: string;
  note: string;

  // Даты (диапазоны)
  samplingDateFrom: string;
  samplingDateTo: string;
  materialReceiptDateFrom: string;
  materialReceiptDateTo: string;
  protocolDateFrom: string;
  protocolDateTo: string;

  // Выпадающие списки (точное совпадение)
  testResult: string; // '' | 'Соответствует' | 'Не соответствует'
}

// ======= ПРОПСЫ =======
const props = defineProps<{
  modelValue: Filters;
}>();

// ======= СОБЫТИЯ =======
const emit = defineEmits<{
  (e: 'update:modelValue', value: Filters): void;
  (e: 'apply', filters: Filters): void;
  (e: 'reset'): void;
}>();

// ======= ЛОКАЛЬНАЯ КОПИЯ ФИЛЬТРОВ =======
const localFilters = ref<Filters>({ ...props.modelValue });

// ======= ПРОВЕРКА НАЛИЧИЯ АКТИВНЫХ ФИЛЬТРОВ =======
const hasActiveFilters = computed(() => {
  const f = localFilters.value;
  return !!(
    f.plp ||
    f.objectName ||
    f.samplingActNumber ||
    f.samplingPlace ||
    f.personProvidedSample ||
    f.materialName ||
    f.qualityDocument ||
    f.manufacturer ||
    f.protocolNumber ||
    f.note ||
    f.samplingDateFrom ||
    f.samplingDateTo ||
    f.materialReceiptDateFrom ||
    f.materialReceiptDateTo ||
    f.protocolDateFrom ||
    f.protocolDateTo ||
    f.testResult
  );
});

// ======= ПРИМЕНЕНИЕ ФИЛЬТРОВ =======
function applyFilters() {
  emit('update:modelValue', { ...localFilters.value });
  emit('apply', { ...localFilters.value });
}

// ======= СБРОС ФИЛЬТРОВ =======
function resetFilters() {
  localFilters.value = {
    plp: '',
    objectName: '',
    samplingActNumber: '',
    samplingPlace: '',
    personProvidedSample: '',
    materialName: '',
    qualityDocument: '',
    manufacturer: '',
    protocolNumber: '',
    note: '',
    samplingDateFrom: '',
    samplingDateTo: '',
    materialReceiptDateFrom: '',
    materialReceiptDateTo: '',
    protocolDateFrom: '',
    protocolDateTo: '',
    testResult: '',
  };
  emit('update:modelValue', { ...localFilters.value });
  emit('reset');
}

// ======= СИНХРОНИЗАЦИЯ С ПРОПСОМ =======
watch(
  () => props.modelValue,
  (newValue) => {
    localFilters.value = { ...newValue };
  },
  { deep: true }
);
</script>

<style scoped>
.panel-wrapper {
  position: absolute;
  z-index: 20;
  right: -30px;
  width: max-content;
  min-width: 420px;
  max-width: 520px;
  background-color: white;
  border-radius: 15px;
  top: 38px;
  box-shadow: 0px 2px 10px 5px rgba(163, 163, 163, 0.31);
  max-height: 80vh;
  overflow-y: auto;
}

/* Кастомный скролл */
.panel-wrapper::-webkit-scrollbar {
  width: 4px;
}

.panel-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 2px;
}

.panel-wrapper::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 2px;
}

.panel-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
