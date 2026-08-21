<template v-if="showFileViewer">
    <UModal class="custom-modal "
        :ui="{ content: 'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full bg-gray-100' }"
    >
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
          <div class="w-full max-h-[70vh] overflow-y-auto -mx-6 px-6">
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
            <div v-else-if="isViewerPdf" class=" h-[70vh] min-h-100 pdf-viewer-wrapper flex items-center justify-center  overflow-y-auto">
              <ClientOnly>
                <VuePdfEmbed
                  :source="viewerFileUrl"
                  class="w-full pdf-canvas-stretched"
                  :config="{
                    enablePrint: true,
                    enableDownload: true,
                    renderMode: 'canvas'
                  }"
                  verbosity: 0 
                />

                <!-- Фоллбек (запасной вариант) на случай ошибки загрузки библиотеки -->
                <template #fallback>
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
                </template>
              </ClientOnly>
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
              @click="emit('close')"
              variant="outline"
              color="neutral"
            >
              Закрыть
            </UButton>
          </div>
        </template>
      </UModal>
    </template>

<script setup lang="ts">
const VuePdfEmbed = defineAsyncComponent(() => import('vue-pdf-embed'));

const viewerFilePath = ref('');
const viewerFileName = ref('');
const viewerError = ref('');

const props = defineProps<{
  path: any
}>()

onMounted(async () => {
    console.log('props ====> ', props.path)
    if (!props.path) return
    viewerFilePath.value = '/files/'+props.path
    viewerFileName.value = getFileName(props.path)
    viewerError.value = ''
})

// ======= СОБЫТИЯ =======
const emit = defineEmits<{
  (e: 'close'): void
}>()

function getFileName(path: string): string {
  if (!path) return '—'
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}

async function isFileExist(path: string): Promise<boolean> {
  try {
    const url = `https://space.avtodor-eng.ru/${path}`;
    console.log('Проверка PATH:', url);
    
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Файл существует, статус:', response.status);
      return true;
    } else {
      console.log('❌ Файл не найден, статус:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Ошибка при проверке файла:', error);
    return false;
  }
}


function openFileViewer(path: string) {
  if (!path) return
    viewerFilePath.value = '/files/'+path
    viewerFileName.value = getFileName(path)
    viewerError.value = ''
    // showFileViewer.value = true
}

function downloadViewerFile() {
  if (!viewerFilePath.value) return
  const url = viewerFilePath.value.startsWith('/') 
    ? viewerFilePath.value 
    : `/${viewerFilePath.value}`

  console.log('url ----------> ', url)
  window.open(url, '_blank')
}

// ======= ВЫЧИСЛЯЕМЫЕ СВОЙСТВА ДЛЯ ПРОСМОТРА ФАЙЛА =======
const viewerFileUrl = computed(() => {
  if (!viewerFilePath.value) return ''
  if (viewerFilePath.value.startsWith('http://') || viewerFilePath.value.startsWith('https://')) {
    return viewerFilePath.value
  }
  const cleanPath = viewerFilePath.value.replace(/^\/+/, '')
  console.log('ссылка на файл === ', `/${cleanPath}`)
  isFileExist(cleanPath);
  return `/${cleanPath}`
})

const viewerFileExtension = computed(() => {
  const name = viewerFileName.value
  // console.log('viewerFileName.value ===> ', name.split('.').pop()?.toLowerCase() || '')
  return name.split('.').pop()?.toLowerCase() || ''
})

const isViewerImage = computed(() => {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(viewerFileExtension.value)
})

const isViewerPdf = computed(() => {
  return viewerFileExtension.value === 'pdf'
})


</script>


<style lang="css" scoped>

</style>