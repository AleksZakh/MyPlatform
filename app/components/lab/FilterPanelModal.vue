<!-- app/components/lab/FilterPanel.vue -->
<template>
  <UModal
    :ui="{
      content: 'sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-8xl w-full bg-gray-100'
    }"
  >
    <!-- Головная часть модального окна -->
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <div class="text-2xl text-blue-500">
            <Icon name="streamline-freehand-color:book-bookmark" size="28" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Настройка фильтра
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              настройка значений
            </p>
          </div>
        </div>
        <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark-20-solid"
            class="rounded-full hover:bg-gray-100 transition-colors"
            @click="emit('close')"
        />
      </div>
    </template>
    <!--================================-->

    <template #body>
      <div class="panel-wrapper  shadow-md" ref="panelRef">
        <form
          @submit.prevent="applyFilters"
          class="bg-white rounded-md gap-4 px-5 md:px-6 pt-6 md:pt-6 pb-6 md:pb-7 relative"
        >
          <div class="flex">
            <!-- ОРБОР ПРОБ -->
            <fieldset class="border-2 border-gray-200 mx-2 p-3 rounded-md bg-white/80">
              <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                <span><Icon name="streamline-freehand-color:business-product-supplier-1" size="24"/> Отбор проб</span>
              </legend>
              <div class="flex flex-col gap-3">
  
                <!-- ПЛП -->
                <UFormField name="plp" >
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:content-paper-edit" size="24" /> ПЛП:</label>
                  </template>
                  <USelectMenu
                    v-model="localFilters.plp as any"
                    :items="plp_items"
                    :searchable="true"
                    :search-input="{ placeholder: 'Введите название...' }"
                    class="w-full shadow-sm"
                  />
                </UFormField>
                <!-- ПЛП -->
                <!-- <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:content-paper-edit" size="24" /> ПЛП:</label>
                  <input
                    v-model="localFilters.plp"
                    type="text"
                    placeholder="Поиск по ПЛП..."
                    class="flex-1 px-4 py-2 rounded-md w-full border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div> -->
                
                <!-- Наименование объекта -->
                <UFormField name="objName">
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:tags-double" size="24" />Наименование объекта:</label>
                  </template>
                  <USelectMenu
                    v-model="localFilters.objName as any"
                    :items="objName_items"
                    :searchable="true"
                    :search-input="{ placeholder: 'Введите название...' }"                 
                    class="max-w-120 w-full shadow-sm"
                  />
                </UFormField>
              
          
                
                <!-- <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:tags-double" size="24" />Наименование объекта:</label>
                  <input
                    v-model="localFilters.objName"
                    type="text"
                    placeholder="Поиск по наименованию..."
                    class="flex-1 px-4 py-2 rounded-md w-full border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div> -->
          
                <!-- Номер акта отбора проб -->
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-flex-color:number-sign-flat" size="24" /> Номер акта:</label >
                  <input
                    v-model="localFilters.samplActNumber"
                    type="text"
                    placeholder="Поиск по номеру акта..."
                    class="flex-1 px-4 py-2 shadow-sm  rounded-md w-full border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div>
          
                <!-- Дата отбора проб (диапазон) -->
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" /> Дата отбора:</label >
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.sDateStart"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.sDateEnd"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
          
                <!-- Место отбора проб -->
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:gps-location-rectangle" size="24" /> Место отбора:</label >
                  <input
                    v-model="localFilters.sPlace"
                    type="text"
                    placeholder="Поиск по месту отбора..."
                    class="flex-1 px-4 py-2 shadow-sm rounded-md border w-full border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div>
          
                <!-- Лицо, предоставившее пробу -->
                <UFormField name="sPerson" >
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 " >
                    <Icon name="streamline-freehand-color:job-profile-search" size="24" />Кто предоставил:</label>
                  </template>
                  <USelectMenu
                    v-model="localFilters.sProvaider as any"
                    :items="persProv_items"
                    create-item
                    :searchable="true"
                    :search-input="{ placeholder: 'Введите имя...' }"
                    class="w-full shadow-sm"
                  />
                </UFormField>
              </div>
            </fieldset>
  
            <fieldset class="border-2 border-gray-200 mx-2 p-3 rounded-md bg-white/80">
              <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                <span> <Icon name="streamline-freehand-color:module-building-blocks" /> Материалы </span>
              </legend>
              <div class="flex flex-col gap-4">
                <!-- Дата поступления материала (диапазон) -->
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" />Дата поступления:</label>
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.receiveDateStart"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.receiveDateEnd"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
          
                <!-- Наименование материала -->
                <UFormField name="material">
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-ultimate-color:road-straight" size="24" />Материал:</label>
                  </template>
                  <USelectMenu
                    v-model="localFilters.materialName as any"
                    :items="materials_items"
                    :searchable="true"
                    :search-input="{ placeholder: 'Введите материал...' }"
                    class="shadow-sm w-full "
                  />
                </UFormField>

                <!-- <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-ultimate-color:road-straight" size="24" />Материал:</label>
                  <input
                    v-model="localFilters.materialName"
                    type="text"
                    placeholder="Поиск по материалу..."
                    class="flex-1 px-4 py-2 rounded-md border w-full border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div> -->
          
                <!-- Дата документа о качестве (диапазон) -->
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" /> Дата документа о качестве:</label>
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.qualiDateStart"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.qualiDateEnd"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
                <!-- Номер протокола -->
                <div class="flex flex-wrap items-center gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-flex-color:number-sign-flat" size="24" /> Номер документа о качестве:</label >
                  <input
                    v-model="localFilters.qualiDocNumber"
                    type="text"
                    placeholder="Поиск по номеру докумета качества..."
                    class="flex-1 px-4 shadow-sm py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div>
          
                <!-- Предприятие-изготовитель -->
                <UFormField name="manufacturer">
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-cyber-color:factory" size="24" /> Изготовитель:</label >
                  </template>
                  <USelectMenu
                    v-model="localFilters.manufacturer as any"
                    :items="manufacturer_items.slice(0, 200)"
                    :searchable="true"
                    :search-input="{ placeholder: 'Введите производителя...' }"
                    class="max-w-120 w-full shadow-sm"
                  />
                </UFormField>
              </div>
            </fieldset>

            <fieldset class="border-2 border-gray-200 mx-2 p-3 rounded-md bg-white/80">
              <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                <span> <Icon name="streamline-freehand-color:task-list-pen" /> Испытания </span>
              </legend>
              <div class="flex flex-col gap-4">
                <!-- Номер протокола -->
                <div class="flex flex-col items-start gap-3">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-flex-color:number-sign-flat" size="24" /> Номер протокола:</label >
                  <input
                    v-model="localFilters.testProtocolNumber"
                    type="text"
                    placeholder="Поиск по номеру протокола..."
                    class="flex-1 shadow-sm px-4 py-2 rounded-md border w-full border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none transition text-sm"
                  />
                </div>
          
                <!-- Дата протокола (диапазон) -->
                <div class="flex flex-col items-start gap-3">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" />  Дата протокола:</label >
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.testReportDataStart"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.testReportDataEnd"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
          
                <!-- Результат испытаний (выпадающий список) -->
                <div class="flex flex-col items-start gap-3">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:mobilephone-action-voice-approved" size=""/>Результат испытания:</label >
                  <select
                    v-model="localFilters.testResult"
                    class="flex-1 shadow-sm px-4 py-2 rounded-md border w-full border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                  >
                    <option value="">Все</option>
                    <option value="Соответствует">Соответствует</option>
                    <option value="Не соответствует">Не соответствует</option>
                  </select>
                </div>
              </div>
            </fieldset>
          </div>
        </form>
      </div>
    </template>
    <template #footer>
      <!-- Кнопки действий -->
      <div class="flex justify-between w-full">
        <div class="flex items-end">
          <UFormField name="filterTemplate" class="flex items-center gap-2">
            <template #label>
              <span class="flex gap-1 mt-1">
                <UIcon name="octicon:repo-template-24" size="24" class="text-blue-600" />
                Выбрать шаблон
              </span>
            </template>
            <USelectMenu
              v-model="localFilters.materialName as any"
              :items="filterTemplates"
              :searchable="true"
              :search-input="{ placeholder: 'Введите шаблон...' }"
              class="shadow-sm min-w-50 "
/>
          </UFormField>
        </div>
        <div class="flex gap-3 " >
          <UButton
            @click="resetFilters"
            color="neutral"
            variant="outline"
            class="font-medium py-2 px-6 rounded-md transition text-sm"
          >
            <Icon name="system-uicons:reset" size="24" /> Сбросить всё
          </UButton>
          <LabFilterSavePopover />
          <UButton
            @click="applyFilters"
            type="submit"
            color="secondary"
            variant="outline"
            class="font-semibold py-2 px-7 rounded-md transition shadow-sm text-sm"
          >
            <Icon name="streamline-freehand-color:form-edition-clipboard-check" size="24" />
            Применить фильтр
          </UButton>
        </div>
      </div>

    </template>
  </UModal>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue' // ИСПРАВЛЕНО: Добавлены пропущенные импорты из Vue
import type { ITableFilter } from '@@/types/tableFilter' // ИСПРАВЛЕНО: Изменен путь с @@ на нормальный ~/
import { useTableFilterStore } from '~/stores/tableFilter'

// Инициализируем хранилище Pinia
const filterStore = useTableFilterStore()

// console.log('filterStore призагрузке = ', filterStore)
const { loadReference } = useReferenceDataLoader();

// Данные для выпадающих списков
const plp_items = ref<string[]>([]);
const objName_items = ref<string[]>([]);
const persProv_items = ref<string[]>([]);
const materials_items = ref<string[]>([]);
const manufacturer_items = ref<string[]>([]);
const testResultItems = ref(['Соответствует', 'Не соответствует']);
const isLoading = ref(false);
const filterTemplates = ref();

const props = defineProps<{
  onApply?: () => void
}>()

// ============================================
// ЗАГРУЗКА СПРАВОЧНИКОВ
// ============================================
async function loadReferenceData() {
  isLoading.value = true;
  
  const refData = await loadReference()
  if(refData){
    [plp_items.value, objName_items.value, persProv_items.value , materials_items.value, manufacturer_items.value] = refData
  }
  
}

// Локальное реактивное состояние формы (черновик)
const localFilters = reactive<ITableFilter>({
  plp: null,
  objName: null,
  samplActNumber: null,
  sDateStart: null,
  sDateEnd: null,
  sPlace: null,
  sProvaider: null,
  // ----------------------------
  receiveDateStart: null,
  receiveDateEnd: null,
  materialName: null,
  qualiDateStart: null,
  qualiDateEnd: null,
  qualiDocNumber: null,
  manufacturer: null,
  // ----------------------------
  testReportDataStart: null,
  testReportDataEnd: null,
  testResult: null,
  testProtocolNumber: null
})

// Функция очистки пустых строк перед сохранением в Pinia
const cleanFiltersBeforeSave = (filters: ITableFilter): ITableFilter => {
  const cleaned = { ...filters }
  for (const key in cleaned) {
    const k = key as keyof ITableFilter
    if (cleaned[k] === '') {
      cleaned[k] = null
    }
  }
  return cleaned
}

// Срабатывает в момент физического раскрытия оверлея на экране
onMounted(() => {
  // if (!filterStore.isLoaded) {
  //   filterStore.loadFromStorage()
  // }  
  // Синхронизируем: переносим данные из Pinia в инпуты нашей формы
  Object.assign(localFilters, filterStore.filter)
})
loadReferenceData()
// ======= СОБЫТИЯ (EMITS) =======
const emit = defineEmits<{
  (e: 'apply'): void    
  (e: 'reset'): void
  (e: 'close'): void
}>()

// ======= ПРИМЕНЕНИЕ ФИЛЬТРОВ =======
const applyFilters = async() => {
  // Очищаем пустые строки до null, чтобы Pinia понимала, что фильтр выключен
  // console.log('состояниефильтра при сохоанении ===> ', localFilters)
  const cleanedData = cleanFiltersBeforeSave(localFilters)  
  // Сохраняем в глобальный стейт и localStorage
  filterStore.setFilter(cleanedData)
  await nextTick()
  if (props.onApply) {
    props.onApply()
  }
  // Посылаем сигнал родителю
  emit('apply')
  emit('close') 
}

// ======= СБРОС ФИЛЬТРОВ =======
const resetFilters = () => {
  // 1. Очищаем данные в Pinia и в localStorage
  filterStore.resetFilter()
  // Стираем значения из инпутов на форме, заменяя их на чистые дефолтные null из стора
  Object.assign(localFilters, filterStore.filter)
  // 3. Посылаем сигнал родителю, чтобы таблица сразу обновилась
  emit('reset')
  // emit('close')
}
</script>


<style scoped>


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
