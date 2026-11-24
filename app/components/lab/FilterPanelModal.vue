
<template>
  <UModal
    title="Настройка фильтра"
    description="Выбор условий для реестра входного контроля"
    @update:open="value => { if (!value) emit('close') }"
    :ui="{
      content: 'sm:max-w-4xl md:max-w-5xl lg:max-w-6xl xl:max-w-8xl w-full bg-gray-100'
    }"
  >
    
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <div class="text-2xl text-blue-500">
            <Icon name="streamline-freehand-color:book-bookmark" size="28" />
          </div>
          <div>
            <DialogTitle class="text-lg font-semibold text-gray-900 dark:text-white">
              Настройка фильтра
            </DialogTitle>
            <DialogDescription class="text-sm text-gray-500 dark:text-gray-400">
              настройка значений
            </DialogDescription>
          </div>
        </div>
        <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark-20-solid"
            aria-label="Закрыть фильтр"
            class="rounded-full hover:bg-gray-100 transition-colors"
            @click="emit('close')"
        />
      </div>
    </template>
    

    <template #body>
      <div class="panel-wrapper shadow-md">
        <form
          @submit.prevent="applyFilters"
          class="bg-white rounded-md gap-4 px-5 md:px-6 pt-6 md:pt-6 pb-6 md:pb-7 relative"
        >
          <div class="filter-status mb-4 text-sm" aria-live="polite">
            <span v-if="facetsLoading">Уточняем списки…</span>
            <span v-else-if="facetsError" class="text-red-600 dark:text-red-300">{{ facetsError }}</span>
            <span v-else-if="hasNoMatches">По выбранным условиям записей нет. Уберите или измените одно из условий.</span>
            <span v-else-if="facetTotal !== null">Подходящих записей: {{ facetTotal }}</span>
            <button v-if="facetsError && !dateError" type="button" class="ml-2 underline" @click="refreshFacets">Повторить</button>
            <p v-if="applyError" class="text-red-600 dark:text-red-300 mt-1" role="alert">{{ applyError }}</p>
          </div>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
            
            <fieldset class="border-2 border-gray-200 min-w-0 p-3 rounded-md bg-white/80">
              <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                <span><Icon name="streamline-freehand-color:business-product-supplier-1" size="24"/> Отбор проб</span>
              </legend>
              <div class="flex flex-col gap-3">
  
                
                <UFormField name="plp" >
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:content-paper-edit" size="24" /> ПЛП:</label>
                  </template>
                  <div class="flex items-center gap-1">
                    <USelectMenu
                      aria-label="ПЛП" :model-value="localFilters.plp ?? undefined"
                      @update:model-value="setFacet('plp', $event)"
                      :items="facetOptions.plp"
                      :loading="facetsLoading"
                      :disabled="facetsLoading"
                      :search-input="{ placeholder: 'Поиск в списке...' }"
                      class="w-full min-w-0 shadow-sm"
                    >
                      <template #empty>Нет подходящих значений</template>
                    </USelectMenu>
                    <button v-if="localFilters.plp" type="button" class="filter-clear"
                      aria-label="Очистить выбранное значение" title="Очистить" @click="setFacet('plp', null)">×</button>
                  </div>
                </UFormField>
                
                
                
                
                <UFormField name="objName">
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:tags-double" size="24" />Наименование объекта:</label>
                  </template>
                  <div class="flex items-center gap-1">
                    <USelectMenu
                      aria-label="Наименование объекта" :model-value="localFilters.objName ?? undefined"
                      @update:model-value="setFacet('objName', $event)"
                      :items="facetOptions.objName"
                      :loading="facetsLoading"
                      :disabled="facetsLoading"
                      :search-input="{ placeholder: 'Поиск в списке...' }"
                      class="w-full min-w-0 shadow-sm"
                    >
                      <template #empty>Нет подходящих значений</template>
                    </USelectMenu>
                    <button v-if="localFilters.objName" type="button" class="filter-clear"
                      aria-label="Очистить выбранное значение" title="Очистить" @click="setFacet('objName', null)">×</button>
                  </div>
                </UFormField>
              
          
                
                
          
                
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
          
                
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" /> Дата отбора:</label >
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.sDateStart" aria-label="Дата отбора с"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.sDateEnd" aria-label="Дата отбора по"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
          
                
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:gps-location-rectangle" size="24" /> Место отбора:</label >
                  <div class="flex items-center gap-1 w-full">
                    <USelectMenu aria-label="Место отбора" :model-value="localFilters.sPlace ?? undefined"
                      @update:model-value="setFacet('sPlace', $event)" :items="facetOptions.sPlace"
                      :loading="facetsLoading" :disabled="facetsLoading"
                      :search-input="{ placeholder: 'Поиск места отбора...' }" class="w-full min-w-0 shadow-sm">
                      <template #empty>Нет подходящих значений</template>
                    </USelectMenu>
                    <button v-if="localFilters.sPlace" type="button" class="filter-clear"
                      aria-label="Очистить место отбора" @click="setFacet('sPlace', null)">×</button>
                  </div>
                </div>
          
                
                <UFormField name="sPerson" >
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 " >
                    <Icon name="streamline-freehand-color:job-profile-search" size="24" />Кто предоставил:</label>
                  </template>
                  <div class="flex items-center gap-1">
                    <USelectMenu
                      aria-label="Кто предоставил пробу" :model-value="localFilters.sProvaider ?? undefined"
                      @update:model-value="setFacet('sProvaider', $event)"
                      :items="facetOptions.sProvaider"
                      :loading="facetsLoading"
                      :disabled="facetsLoading"
                      :search-input="{ placeholder: 'Поиск в списке...' }"
                      class="w-full min-w-0 shadow-sm"
                    >
                      <template #empty>Нет подходящих значений</template>
                    </USelectMenu>
                    <button v-if="localFilters.sProvaider" type="button" class="filter-clear"
                      aria-label="Очистить выбранное значение" title="Очистить" @click="setFacet('sProvaider', null)">×</button>
                  </div>
                </UFormField>
              </div>
            </fieldset>
  
            <fieldset class="border-2 border-gray-200 min-w-0 p-3 rounded-md bg-white/80">
              <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                <span> <Icon name="streamline-freehand-color:module-building-blocks" /> Материалы </span>
              </legend>
              <div class="flex flex-col gap-4">
                
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" />Дата поступления:</label>
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.receiveDateStart" aria-label="Дата поступления с"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.receiveDateEnd" aria-label="Дата поступления по"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
          
                
                <div class="material-selection">
                  <UFormField name="material">
                    <template #label>
                      <label class="font-semibold flex items-center gap-2 text-sm">
                        <Icon name="streamline-ultimate-color:road-straight" size="24" /> Материалы:
                      </label>
                    </template>
                    <USelectMenu v-model="selectedMaterials" multiple aria-label="Материалы"
                      :items="facetOptions.materialName" :loading="facetsLoading" :disabled="facetsLoading"
                      :content="{ side: 'bottom', align: 'start' }"
                      :search-input="{ placeholder: 'Найти материал...' }"
                      :ui="{ itemTrailing: 'hidden' }" class="shadow-sm w-full">
                      <template #default>
                        <span class="truncate">{{ selectedMaterials.length ? `Выбрано материалов: ${selectedMaterials.length}` : 'Выберите материалы' }}</span>
                      </template>
                      <template #item-leading="{ item }">
                        <span class="material-checkbox" :class="{ 'is-checked': selectedMaterials.includes(String(item)) }" aria-hidden="true">
                          {{ selectedMaterials.includes(String(item)) ? '✓' : '' }}
                        </span>
                      </template>
                      <template #empty>Нет материалов по остальным условиям</template>
                    </USelectMenu>
                  </UFormField>
                  <ul v-if="selectedMaterials.length" class="selected-materials" aria-label="Выбранные материалы">
                    <li v-for="material in selectedMaterials" :key="material">
                      <span>{{ material }}</span>
                      <button type="button" class="filter-clear" :aria-label="`Убрать материал ${material}`"
                        @click="selectedMaterials = selectedMaterials.filter(value => value !== material)">×</button>
                    </li>
                  </ul>
                  <p v-else class="text-xs mt-2 opacity-70">Без ограничения по материалам</p>
                  <p v-if="legacyMaterial" class="text-xs mt-2 opacity-70">Из старого шаблона: поиск по части названия. При изменении выбора будут использоваться точные названия.</p>
                  <button v-if="selectedMaterials.length" type="button" class="text-xs mt-2 underline"
                    @click="selectedMaterials = []">Очистить материалы</button>
                </div>

                
          
                
                <div class="flex flex-col items-start gap-1">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" /> Дата документа о качестве:</label>
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.qualiDateStart" aria-label="Дата документа о качестве с"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.qualiDateEnd" aria-label="Дата документа о качестве по"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
                
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
          
                
                <UFormField name="manufacturer">
                  <template #label>
                    <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-cyber-color:factory" size="24" /> Изготовитель:</label >
                  </template>
                  <div class="flex items-center gap-1">
                    <USelectMenu
                      aria-label="Изготовитель" :model-value="localFilters.manufacturer ?? undefined"
                      @update:model-value="setFacet('manufacturer', $event)"
                      :items="facetOptions.manufacturer"
                      :loading="facetsLoading"
                      :disabled="facetsLoading"
                      :search-input="{ placeholder: 'Поиск в списке...' }"
                      class="w-full min-w-0 shadow-sm"
                    >
                      <template #empty>Нет подходящих значений</template>
                    </USelectMenu>
                    <button v-if="localFilters.manufacturer" type="button" class="filter-clear"
                      aria-label="Очистить выбранное значение" title="Очистить" @click="setFacet('manufacturer', null)">×</button>
                  </div>
                </UFormField>
              </div>
            </fieldset>

            <fieldset class="border-2 border-gray-200 min-w-0 p-3 rounded-md bg-white/80">
              <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
                <span> <Icon name="streamline-freehand-color:task-list-pen" /> Испытания </span>
              </legend>
              <div class="flex flex-col gap-4">
                
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
          
                
                <div class="flex flex-col items-start gap-3">
                  <label class="font-semibold flex items-center gap-2 min-w-32 text-gray-700 text-sm" >
                    <Icon name="streamline-freehand-color:calendar-grid" size="24" />  Дата протокола:</label >
                  <div class="flex flex-1 flex-wrap items-center gap-2">
                    <input
                      v-model="localFilters.testReportDataStart" aria-label="Дата протокола с"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                    <span class="text-gray-400">—</span>
                    <input
                      v-model="localFilters.testReportDataEnd" aria-label="Дата протокола по"
                      type="date"
                      class="flex-1 shadow-sm min-w-30 px-3 py-2 rounded-md border border-gray-200 bg-white focus:border-brand focus:ring-2 focus:ring-brand/30 outline-none text-sm"
                    />
                  </div>
                </div>
          
                
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
      
      <div class="flex justify-between w-full">
        <div class="flex items-end">
          <UFormField name="filterTemplate" class="flex items-center gap-2"
          :ui="{
            container: 'flex items-center gap-2'
          }"
          >
            <template #label>
              <span class="flex gap-1 mt-1">
                <UIcon name="octicon:repo-template-24" size="24" class="text-blue-600" />
                Выбрать шаблон
              </span>
            </template>
            <USelectMenu
              v-model="filterTemplate"
              aria-label="Шаблон фильтра"
              :items="filterTemplatesNameList"
              :searchable="true"
              :search-input="{ placeholder: 'Введите шаблон...' }"
              @update:model-value="applyTemplate($event)"
              class="shadow-sm min-w-50 "
            />
            <UCheckbox color="info" v-model="onlyMine" label="только мои" @change="loadTemplates"/>
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
          <LabFilterSavePopover 
            :filters="localFilters"
            :author-email="currentUser?.email || 'anonymous'"
            :template-id="filters?.id"
            :template-name="filterTemplate"
            :is-default="filters?.isDefault"
          />
          <UButton
            @click="applyFilters"
            :disabled="!!dateError"
            type="button"
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
import { computed, reactive, ref, onMounted, nextTick } from 'vue'
import { DialogTitle, DialogDescription } from 'reka-ui'
import { storeToRefs } from 'pinia'
import type { ITableFilter } from '@@/types/tableFilter'
import { useTableFilterStore } from '~/stores/tableFilter'
import { useLabFilterFacets } from '~/composables/useLabFilterFacets'
import { normalizeLabFilters, materialFilterValues, labFilterDateError, type LabFacetKey } from '~~/shared/utils/lab-filter-values'

interface FilterTemplate {
  id: number
  name: string
  authorEmail: string
  filters: Partial<ITableFilter>
  isDefault: boolean
  timestamp: string
}
defineProps<{ onApply?: () => void }>()
const emit = defineEmits<{ (e: 'apply'): void; (e: 'reset'): void; (e: 'close'): void }>()
const filterStore = useTableFilterStore()
const localFilters = reactive<ITableFilter>(normalizeLabFilters(filterStore.filter))
const { options: facetOptions, total: facetTotal, loading: facetsLoading, error: facetsError,
  refresh: refreshFacets, hasNoMatches } = useLabFilterFacets(() => localFilters)
const dateError = computed(() => labFilterDateError(localFilters))
const applyError = ref('')
const legacyMaterial = computed(() => typeof localFilters.materialName === 'string')
const selectedMaterials = computed<string[]>({
  get: () => materialFilterValues(localFilters.materialName),
  set: values => { localFilters.materialName = materialFilterValues(values) },
})
function setFacet(key: Exclude<LabFacetKey, 'materialName'>, value: unknown) {
  localFilters[key] = typeof value === 'string' ? value : null
  localFilters.exactFields = [...new Set([...(localFilters.exactFields || []), key])]
}
const testResultItems = ['Соответствует', 'Не соответствует']
const filterTemplatesList = ref<FilterTemplate[]>([])
const filterTemplatesNameList = computed(() => filterTemplatesList.value.map(template => template.name))
const filterTemplate = ref<string>()
const filters = ref<FilterTemplate>()
const onlyMine = ref(true)
const { user: currentUser } = storeToRefs(useUserStore())

async function loadTemplates() {
  try {
    const response = await $fetch('/api/lab/filter-template', { params: { onlyMine: onlyMine.value } })
    if (response?.success) filterTemplatesList.value = response.data as FilterTemplate[]
  } catch {
    applyError.value = 'Не удалось загрузить шаблоны. Условия фильтра можно задать вручную.'
  }
}
function applyTemplate(name: unknown) {
  const template = filterTemplatesList.value.find(item => item.name === name)
  if (!template) return
  filters.value = template
  Object.assign(localFilters, normalizeLabFilters(template.filters))
  applyError.value = ''
}
// Reopening the modal always preserves the currently applied filter.
onMounted(loadTemplates)
async function applyFilters() {
  applyError.value = dateError.value
  if (applyError.value) return
  try {
    filterStore.setFilter(normalizeLabFilters(localFilters))
    await nextTick()
    emit('apply')
    emit('close')
  } catch (error) {
    applyError.value = error instanceof Error ? error.message : 'Не удалось применить фильтр.'
  }
}
function resetFilters() {
  Object.assign(localFilters, normalizeLabFilters())
  filterTemplate.value = undefined
  filters.value = undefined
  applyError.value = ''
}
</script>


<style scoped>
.material-selection { border-block: 2px solid var(--space-border, #cbd5e1); padding-block: 12px; }
.selected-materials { margin-top: 8px; max-height: 160px; overflow-y: auto; padding: 0; list-style: none; }
.selected-materials li { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 5px 0; font-size: 13px; border-bottom: 1px solid var(--space-border, #e2e8f0); }
.selected-materials li span { overflow-wrap: anywhere; }
.filter-clear { flex-shrink: 0; padding: 2px 7px; font-size: 20px; cursor: pointer; opacity: .8; }
.filter-clear:hover { opacity: 1; }
.material-checkbox { display: inline-flex; align-items: center; justify-content: center; width: 17px; height: 17px; border: 1px solid currentColor; border-radius: 3px; flex-shrink: 0; }
.material-checkbox.is-checked { background: #2563eb; color: white; border-color: #2563eb; }



/* Кастомный скролл */
.panel-wrapper::-webkit-scrollbar {
  width: 4px;
}

.panel-wrapper::-webkit-scrollbar-track {
  background: var(--space-bg, #f1f1f1);
  border-radius: 2px;
}

.panel-wrapper::-webkit-scrollbar-thumb {
  background: var(--space-raised, #c1c1c1);
  border-radius: 2px;
}

.panel-wrapper::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
