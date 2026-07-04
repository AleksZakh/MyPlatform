<!-- app/components/lab/FilterPanel.vue -->
<template>
  <div class="panel-wrapper w-full shadow-md" ref="panelRef">
    <form 
      @submit.prevent="applyFilters"
      class="flex bg-gray-50 rounded-md flex-col gap-5 p-6 md:p-7"
    >
      <!-- Поле "Категория" -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-25 text-gray-700">📁 Категория:</label>
        <input 
          v-model="localFilters.category"
          type="text" 
          placeholder="Например: Электроника, Книги" 
          class="flex-1 px-4 py-2.5 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition"
        >
      </div>

      <!-- Поле "Цена от/до" -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-25 text-gray-700">💰 Цена:</label>
        <div class="flex flex-1 flex-wrap items-center gap-3">
          <input 
            v-model.number="localFilters.priceMin"
            type="number" 
            placeholder="от" 
            step="100"
            class="w-28 px-4 py-2.5 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
          >
          <span class="text-gray-500">—</span>
          <input 
            v-model.number="localFilters.priceMax"
            type="number" 
            placeholder="до" 
            step="100"
            class="w-28 px-4 py-2.5 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
          >
          <span class="text-gray-500 text-sm">₽</span>
        </div>
      </div>

      <!-- Рейтинг (select) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-25 text-gray-700">⭐ Рейтинг:</label>
        <select 
          v-model="localFilters.rating"
          class="flex-1 px-4 py-2.5 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none"
        >
          <option value="any">Любой</option>
          <option value="4.5">4.5+ (отлично)</option>
          <option value="4">4.0+ (хорошо)</option>
          <option value="3">3.0+ (средний)</option>
        </select>
      </div>

      <!-- Доступность (radio) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-25 text-gray-700">📦 Доступность:</label>
        <div class="flex flex-wrap gap-5 flex-1">
          <label class="flex items-center gap-2 text-gray-700">
            <input 
              v-model="localFilters.availability" 
              type="radio" 
              value="all" 
              class="accent-brand"
            > 
            Все товары
          </label>
          <label class="flex items-center gap-2 text-gray-700">
            <input 
              v-model="localFilters.availability" 
              type="radio" 
              value="inStock" 
              class="accent-brand"
            > 
            Только в наличии
          </label>
          <label class="flex items-center gap-2 text-gray-700">
            <input 
              v-model="localFilters.availability" 
              type="radio" 
              value="preorder" 
              class="accent-brand"
            > 
            Предзаказ
          </label>
        </div>
      </div>

      <!-- Доп. опции (чекбоксы) -->
      <div class="flex flex-wrap items-center gap-3">
        <label class="font-semibold min-w-25 text-gray-700">🆕 Дополнительно:</label>
        <div class="flex flex-wrap gap-5 flex-1">
          <label class="flex items-center gap-2 text-gray-700">
            <input 
              v-model="localFilters.isNewFirst" 
              type="checkbox" 
              class="rounded accent-brand"
            > 
            Сначала новинки
          </label>
          <label class="flex items-center gap-2 text-gray-700">
            <input 
              v-model="localFilters.isSaleOnly" 
              type="checkbox" 
              class="rounded accent-brand"
            > 
            Только со скидкой
          </label>
        </div>
      </div>

      <!-- Кнопки действий -->
      <div class="flex justify-end gap-3 mt-2 pt-2 border-t border-dashed border-gray-200">
        <button 
          type="button" 
          @click="resetFilters"
          class="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-6 rounded-md transition"
        >
          Сбросить
        </button>
        <button 
          type="submit" 
          class="bg-[#2c7da0] hover:bg-[#1f5e7a] text-white font-semibold py-2 px-7 rounded-md transition shadow-sm"
        >
          Применить фильтр
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
// Интерфейс для фильтров
interface Filters {
  category: string
  priceMin: number | null
  priceMax: number | null
  rating: string
  availability: string
  isNewFirst: boolean
  isSaleOnly: boolean
}

// Пропсы компонента
const props = defineProps<{
  modelValue: Filters
}>()

// События компонента
const emit = defineEmits<{
  (e: 'update:modelValue', value: Filters): void
  (e: 'apply', filters: Filters): void
  (e: 'reset'): void
}>()

// Локальная копия фильтров (чтобы изменения применялись только после нажатия кнопки)
const localFilters = ref<Filters>({ ...props.modelValue })

// Применение фильтров
function applyFilters() {
  emit('update:modelValue', { ...localFilters.value })
  emit('apply', { ...localFilters.value })
}

// Сброс фильтров
function resetFilters() {
  localFilters.value = {
    category: '',
    priceMin: null,
    priceMax: null,
    rating: 'any',
    availability: 'all',
    isNewFirst: false,
    isSaleOnly: false
  }
  emit('update:modelValue', { ...localFilters.value })
  emit('reset')
}

// Синхронизация с пропсом при его изменении снаружи
watch(() => props.modelValue, (newValue) => {
  localFilters.value = { ...newValue }
}, { deep: true })
</script>

<style scoped>
.panel-wrapper {
  position: absolute;
  z-index: 20;
  right: -30px;
  width: max-content;
  background-color: white;
  border-radius: 15px;
  top: 38px;
  box-shadow: 0px 2px 10px 5px rgba(163, 163, 163, 0.31);
}
</style>