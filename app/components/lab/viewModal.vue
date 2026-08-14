<!-- components/lab/RecordViewModal.vue -->
<template>
  <UModal
    class="custom-modal "
    :ui="{ content: 'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full bg-gray-100' }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <div class="text-2xl text-blue-500">
            <Icon name="streamline-freehand-color:book-bookmark" size="28" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              Просмотр записи #{{ record?.index || '' }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Просмотр данных записи
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

    <template #body>
      <div class="flex flex-col w-full bg-white">
        <!-- Контейнер для полей -->
        <div class="grid grid-cols-2">

        </div>
        <div class="flex    parent">
          
          <!-- ===== БЛОК 1: Отбор проб ===== -->
          <fieldset class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80">
            <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
              <span><Icon name="streamline-freehand-color:business-product-supplier-1" size="24"/>Отбор проб</span>
              <span class="text-xs text-gray-400 font-light">(информация)</span>
            </legend>
            
            <div class="flex flex-col gap-x-6 gap-y-3 p-2">
              <!-- ПЛП -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">ПЛП</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50 font-medium">
                  {{ record?.['ПЛП'] || '—' }}
                </div>
              </div>
              
              <!-- Наименование объекта -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Наименование объекта</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Наименование объект'] || '—' }}
                </div>
              </div>
              
              <!-- Номер акта отбора проб -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Номер акта отбора проб</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50 font-mono">
                  {{ record?.['Номер акта отбора проб'] || '—' }}
                </div>
              </div>
              
              <!-- Документ отбора проб (ФАЙЛ) -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Документ отбора проб</label>
                <div class="mt-1">
                  <!-- ✅ КНОПКА ДЛЯ ОТКРЫТИЯ ВЛОЖЕННОЙ МОДАЛКИ -->
                  <UButton
                    v-if="response?.sDocPath"
                    variant="ghost"
                    color="primary"
                    size="sm"
                    class="px-0"
                    @click="openFileViewer(response.sDocPath)"
                  >
                    <Icon name="i-heroicons-document-text" class="mr-1" />
                    {{ getFileName(response.sDocPath) }}
                    <Icon name="i-heroicons-arrow-top-right-on-square" class="ml-1 w-4 h-4" />
                  </UButton>
                  <span v-else class="text-md text-gray-400">—</span>
                </div>
              </div>
              
              <!-- Дата отбора проб -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Дата отбора проб</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Дата отбора проб'] || '—' }}
                </div>
              </div>
              
              <!-- Место отбора проб -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Место отбора проб</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Место отбора проб'] || '—' }}
                </div>
              </div>
              
              <!-- Лицо, предоставившее пробу -->
              <div class="flex flex-col md:col-span-2">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Лицо, предоставившее пробу</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Лицо, предоставившее пробу'] || '—' }}
                </div>
              </div>
              
              <!-- Примечание -->
              <div class="flex flex-col md:col-span-2">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Примечание</label>
                <div class="mt-1 px-2 shadow-sm text-lg text-gray-800 min-w-70 bg-gray-100/50 p-2 rounded-md whitespace-pre-wrap max-h-24 overflow-y-auto">
                  {{ record?.['Примечание'] || '—' }}
                </div>
              </div>
            </div>
          </fieldset>

          <!-- ===== БЛОК 2: Поступление материала ===== -->
          <fieldset class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80">
            <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
              <span><Icon name="streamline-freehand-color:module-building-blocks" /> Материал</span>
              <span class="text-xs text-gray-400 font-light">(информация)</span>
            </legend>
            
            <div class="flex flex-col gap-x-6 gap-y-3 p-2">
              <!-- Материал -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Материал</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Наименование материала'] || '—' }}
                </div>
              </div>
              
              <!-- Дата поступления -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Дата поступления</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Дата поступления материала'] || '—' }}
                </div>
              </div>
              
              <!-- Дата документа о качестве -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Дата документа о качестве</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ formatDateTime(response?.qualDocDate) || '—' }}
                </div>
              </div>
              
              <!-- Документ о качестве (ФАЙЛ) -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Документ о качестве</label>
                <div class="mt-1">
                  <UButton
                    v-if="record?.['Документ о качестве']"
                    variant="ghost"
                    color="primary"
                    size="md"
                    class="p-1"
                    @click="openFileViewer(record?.['Документ о качестве'])"
                  >
                    <Icon name="i-heroicons-document-text" class="mr-1" />
                    {{ getFileName(record?.['Документ о качестве']) }}
                    <Icon name="i-heroicons-arrow-top-right-on-square" class="ml-1 w-4 h-4" />
                  </UButton>
                  <span v-else class="text-md text-gray-400">—</span>
                </div>
              </div>
              
              <!-- Номер документа о качестве -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Номер документа о качестве</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50 font-mono">
                  {{ response?.qualDocNumber || '—' }}
                </div>
              </div>
              
              <!-- Предприятие-изготовитель -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Предприятие-изготовитель</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Предприятие-изготовитель'] || '—' }}
                </div>
              </div>
            </div>
          </fieldset>

          <!-- ===== БЛОК 3: Протокол испытаний ===== -->
          <fieldset class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80">
            <legend class="text-xl font-normal px-2 flex items-center gap-2 bg-transparent">
              <span>
                <Icon name="streamline-freehand-color:task-list-pen" />
                Протокол испытаний
              </span>
              <span class="text-xs text-gray-400 font-light">(информация)</span>
            </legend>
            
            <div class="flex flex-col gap-x-6 gap-y-3 p-2">
              <!-- Дата -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Дата протокола</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50">
                  {{ record?.['Дата протокола'] || '—' }}
                </div>
              </div>
              
              <!-- Документ протокола (ФАЙЛ) -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Документ протокола</label>
                <div class="mt-1">
                  <UButton
                    v-if="response?.protocolDocPath"
                    variant="ghost"
                    color="primary"
                    size="sm"
                    class="px-0"
                    @click="openFileViewer(response.protocolDocPath)"
                  >
                    <Icon name="i-heroicons-document-text" class="mr-1" />
                    {{ getFileName(response.protocolDocPath) }}
                    <Icon name="i-heroicons-arrow-top-right-on-square" class="ml-1 w-4 h-4" />
                  </UButton>
                  <span v-else class="text-md text-gray-400">—</span>
                </div>
              </div>
              
              <!-- Результат испытаний -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Результат испытаний</label>
                <div class="mt-1">
                  <span 
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-md font-medium"
                    :class="getResultBadgeClass(record?.['Результат испытаний'])"
                  >
                    <span 
                      class="w-2 h-2 rounded-full"
                      :class="getResultDotClass(record?.['Результат испытаний'])"
                    ></span>
                    {{ record?.['Результат испытаний'] || '—' }}
                  </span>
                </div>
              </div>
              
              <!-- Номер протокола -->
              <div class="flex flex-col">
                <label class="text-xs font-medium text-gray-400 uppercase tracking-wider">Номер протокола</label>
                <div class="mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50 font-mono">
                  {{ record?.['Номер протокола'] || '—' }}
                </div>
              </div>
            </div>
          </fieldset>
        </div>
        <!-- Дополнительная информация -->
        <div class="text-xs text-gray-400 px-2 pt-4  grid grid-cols-2">
          <span class="">Создано: {{ formatDateTime(record?.createdAt) || '—' }}</span>
          <span class="">Обновлено: {{ formatDateTime(record?.updatedAt) || '—' }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full gap-4 justify-end pt-2">
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          label="Закрыть"
          @click="emit('close')"
        />
        <UButton
          type="button"
          color="neutral"
          variant="outline"
          label="✏️ Редактировать"
          @click="handleEdit"
        />
      </div>
    </template>

    <!-- ✅ ВЛОЖЕННАЯ МОДАЛКА ДЛЯ ПРОСМОТРА ФАЙЛА -->
    <template v-if="showFileViewer">
      <UModal v-model:open="showFileViewer" :ui="{ content: 'sm:max-w-4xl w-full' }">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Icon name="i-heroicons-document-text" class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ viewerFileName }}
                </h3>
                <p class="text-md text-gray-400 dark:text-gray-400">
                  Просмотр файла
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

        <template #body>
          <div class="max-h-[70vh] overflow-auto">
            <!-- Изображения -->
            <div v-if="isViewerImage" class="flex items-center justify-center min-h-75">
              <img 
                :src="viewerFileUrl" 
                :alt="viewerFileName"
                class="max-w-full max-h-[65vh] object-contain rounded-lg"
                @error="viewerError = 'Не удалось загрузить изображение'"
              />
            </div>
            
            <!-- PDF -->
            <div v-else-if="isViewerPdf" class="w-full h-[70vh] min-h-100">
              <object 
                :data="viewerFileUrl"
                type="application/pdf"
                class="w-full h-full rounded-lg"
              >
                <div class="flex flex-col items-center justify-center h-full text-center p-8">
                  <Icon name="i-heroicons-document-text" class="w-16 h-16 text-gray-300 mb-4" />
                  <p class="text-gray-400 mb-4">Не удалось отобразить PDF</p>
                  <UButton
                    @click="downloadViewerFile"
                    color="neutral"
                    variant="outline"
                    icon="i-heroicons-arrow-down-tray"
                  >
                    Скачать PDF
                  </UButton>
                </div>
              </object>
            </div>
            
            <!-- Другие файлы -->
            <div v-else class="flex flex-col items-center justify-center min-h-75 text-center p-8">
              <Icon name="i-heroicons-document" class="w-20 h-20 text-gray-300 mb-4" />
              <p class="text-gray-400 mb-2">Предпросмотр для этого типа файлов не поддерживается</p>
              <UButton
                @click="downloadViewerFile"
                color="neutral"
                variant="outline"
                icon="i-heroicons-arrow-down-tray"
              >
                Скачать файл
              </UButton>
            </div>
          </div>
        </template>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton
              @click="downloadViewerFile"
              variant="outline"
              color="neutral"
              icon="i-heroicons-arrow-down-tray"
            >
              Скачать
            </UButton>
            <UButton
              @click="() => { showFileViewer = false }"
              variant="outline"
              color="neutral"
            >
              Закрыть
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
  </UModal>
</template>

<script setup lang="ts">
// ======= ИМПОРТЫ =======
import { ref, computed } from 'vue';

// ======= ПРОПСЫ =======
const props = defineProps<{
  record: any
}>()
const response = ref();


onMounted(async () => {
  console.log('Данные пользователя на клиенте === ', props.record);
  
  if (props.record.action === 'view') {
    try {
      // Добавляем await для ожидания ответа и проверяем регистр ID (id или ID)
      const recordId = props.record.id || props.record.ID || props.record.index;
      // @ts-ignore
      response.value = await $fetch(`/api/incoming-control/${recordId}`);
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    }
  }
  
  console.log('ответ от сервера response ===> ', response);
});



// ======= СОБЫТИЯ =======
const emit = defineEmits<{
  (e: 'close'): void
  (e: 'edit', id: number): void   // ← передаем id
}>()

// ======= СОСТОЯНИЯ ДЛЯ ВЛОЖЕННОЙ МОДАЛКИ =======
const showFileViewer = ref(false)
const viewerFilePath = ref('')
const viewerFileName = ref('')
const viewerError = ref('')

// ======= МЕТОДЫ ======

function formatDateTime(date: string | Date | null): string {
  if (!date) return '—'
  try {
    return new Date(date).toLocaleDateString('ru-RU')
  } catch {
    return '—'
  }
}

function getFileName(path: string): string {
  if (!path) return '—'
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

function openFileViewer(path: string) {
  if (!path) return
  viewerFilePath.value = '/files/'+path
  viewerFileName.value = getFileName(path)
  viewerError.value = ''
  showFileViewer.value = true
}

function downloadViewerFile() {
  if (!viewerFilePath.value) return
  const url = viewerFilePath.value.startsWith('/') 
    ? viewerFilePath.value 
    : `/${viewerFilePath.value}`
  window.open(url, '_blank')
}

function getResultBadgeClass(result: string): string {
  if (!result) return 'bg-gray-100 text-gray-600'
  if (result.toLowerCase().includes('не соответствует')) {
    return 'bg-red-100 text-red-700'
  }
  if (result.toLowerCase().includes('соответствует')) {
    return 'bg-green-100 text-green-700'
  }
  return 'bg-gray-100 text-gray-600'
}

function getResultDotClass(result: string): string {
  if (!result) return 'bg-gray-400'
  if (result.toLowerCase().includes('не соответствует')) return 'bg-red-500'
  if (result.toLowerCase().includes('соответствует')) return 'bg-green-500'
  return 'bg-gray-400'
}

function handleEdit() {
  console.log('редактирование')
  emit('edit', props.record.id)
  emit('close')
}

// ======= ВЫЧИСЛЯЕМЫЕ СВОЙСТВА ДЛЯ ПРОСМОТРА ФАЙЛА =======
const viewerFileUrl = computed(() => {
  if (!viewerFilePath.value) return ''
  if (viewerFilePath.value.startsWith('http://') || viewerFilePath.value.startsWith('https://')) {
    return viewerFilePath.value
  }
  const cleanPath = viewerFilePath.value.replace(/^\/+/, '')
  return `/${cleanPath}`
})

const viewerFileExtension = computed(() => {
  const name = viewerFileName.value
  return name.split('.').pop()?.toLowerCase() || ''
})

const isViewerImage = computed(() => {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(viewerFileExtension.value)
})

const isViewerPdf = computed(() => {
  return viewerFileExtension.value === 'pdf'
})
</script>l

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
</style>