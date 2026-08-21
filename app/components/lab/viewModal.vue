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
              <span><Icon name="streamline-freehand-color:business-product-supplier-1" size="24"/> Отбор проб</span>
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
                    @click="fileViewerOpen(response.sDocPath)"
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
                    @click="fileViewerOpen(record?.['Документ о качестве'])"
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
                    @click="fileViewerOpen(response.protocolDocPath)"
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
        <div class="  text-gray-400 p-2  flex justify-center gap-70">
          <div class="flex items-center gap-2">
            <span class="text-xs">Создано: </span>
            <span class="text-sm text-gray-600">{{ authorInfo?.shortName || response?.authorEmail || '—' }} {{ formatDateTime(response?.createdAt) || '—' }}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs">Обновлено: </span>
            <span class="text-sm text-gray-600">{{ editorInfo?.shortName || response?.editorEmail || '—' }} {{ formatDateTime(response?.createdAt) || '—' }}</span>

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

    
  </UModal>
</template>

<script setup lang="ts">
// ======= ИМПОРТЫ =======
import { ref, computed } from 'vue';
import fViewerModal from '~/components/lab/FileViewerModal.vue';

// ======= ПРОПСЫ =======
const props = defineProps<{
  record: any
}>()
const response = ref();
const authorInfo = ref();
const editorInfo = ref();

const overlay = useOverlay();
const modalFViewer = overlay.create(fViewerModal);


onMounted(async () => {
  // console.log('Данные пользователя на клиенте === ', props.record);
  
  if (props.record.action === 'view') {
    try {
      // Добавляем await для ожидания ответа и проверяем регистр ID (id или ID)
      const recordId = props.record.id || props.record.ID || props.record.index;
      // @ts-ignore
      response.value = await $fetch(`/api/incoming-control/${recordId}`);
      if(response.value){
        authorInfo.value = await searchUserInAD({'authorEmail':response.value.authorEmail})
        editorInfo.value = await searchUserInAD({'authorEmail':response.value.editorEmail})
        // console.log('authorInfo ====> ', authorInfo.value)
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных:', error);
    }
  }
  
  // console.log('ответ от сервера response ===> ', response);
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

function fileViewerOpen(path: string) {
  if (!path) return
  modalFViewer.open({
    path: path

  })
}




</script>

<style scoped>

/* Контейнер-обертка с прокруткой, если страниц много */
.pdf-viewer-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

/* Глубокий селектор (deep), чтобы добраться до canvas внутри библиотеки */
.pdf-canvas-stretched :deep(canvas) {
  width: 100% !important;
  height: auto !important;
  display: block;
}

/* Стили для внутренней обертки самой библиотеки */
.pdf-canvas-stretched :deep(.vue-pdf-embed__page) {
  width: 100% !important;
  margin-bottom: 16px; /* Небольшой отступ между страницами, если они идут друг за другом */
}

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