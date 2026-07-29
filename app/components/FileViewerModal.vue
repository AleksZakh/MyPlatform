<!-- components/FileViewerModal.vue -->
<template>
  <Transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-9999 flex items-center justify-center p-4"
      @mousedown.stop
      @mouseup.stop
      @click.stop
      @contextmenu.stop
      @wheel.stop
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
    >
      <!-- Затемненный фон -->
      <div
        class="absolute inset-0 bg-black/60 backdrop-blur-sm"
        @click="close"
      ></div>

      <!-- Контент модалки -->
      <div
        class="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        @click.stop
      >
        <!-- ===== ЗАГОЛОВОК ===== -->
        <div
          class="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0"
        >
          <div class="flex items-center gap-3 min-w-0">
            <!-- Иконка файла -->
            <div
              class="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
              :class="fileIconBgClass"
            >
              <Icon
                :name="fileIcon"
                class="w-5 h-5"
                :class="fileIconColorClass"
              />
            </div>

            <!-- Информация о файле -->
            <div class="min-w-0">
              <h3
                class="text-lg font-semibold text-gray-900 dark:text-white truncate"
              >
                {{ fileName }}
              </h3>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ fileType }} • {{ formattedFileSize }}
              </p>
            </div>
          </div>

          <!-- Кнопка закрытия -->
          <button
            @click="close"
            class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition shrink-0"
          >
            <Icon name="i-heroicons-x-mark" class="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <!-- ===== ТЕЛО (содержимое файла) ===== -->
        <div class="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900/50">
          <!-- Загрузка -->
          <div
            v-if="loading"
            class="flex flex-col items-center justify-center h-64"
          >
            <div
              class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"
            ></div>
            <p class="mt-4 text-gray-500">Загрузка файла...</p>
          </div>

          <!-- Ошибка -->
          <div
            v-else-if="error"
            class="flex flex-col items-center justify-center h-64 text-center"
          >
            <Icon
              name="i-heroicons-exclamation-triangle"
              class="w-12 h-12 text-red-500 mb-4"
            />
            <p class="text-gray-700 dark:text-gray-300">{{ error }}</p>
            <UButton
              @click="downloadFile"
              class="mt-4"
              color="primary"
              icon="i-heroicons-arrow-down-tray"
            >
              Скачать файл
            </UButton>
          </div>

          <!-- Изображения -->
          <div
            v-else-if="isImage"
            class="flex items-center justify-center min-h-75"
          >
            <img
              :src="fileUrl"
              :alt="fileName"
              class="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm"
              @error="handleImageError"
            />
          </div>

          <!-- PDF -->
          <div v-else-if="isPdf" class="w-full h-[70vh] min-h-100">
            <iframe 
              :src="fileUrl"
              type="application/pdf"
              class="w-full h-full rounded-lg shadow-sm"
            >
              <div
                class="flex flex-col items-center justify-center h-full text-center p-8"
              >
                <Icon
                  name="i-heroicons-document-text"
                  class="w-16 h-16 text-gray-300 mb-4"
                />
                <p class="text-gray-500 mb-4">Не удалось отобразить PDF</p>
                <UButton
                  @click="downloadFile"
                  color="primary"
                  icon="i-heroicons-arrow-down-tray"
                >
                  Скачать PDF
                </UButton>
              </div>
            </iframe>
          </div>

          <!-- Текстовые файлы -->
          <div
            v-else-if="isText"
            class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm"
          >
            <pre
              class="font-mono text-sm whitespace-pre-wrap overflow-auto max-h-[65vh] text-gray-800 dark:text-gray-200"
              >{{ textContent }}</pre>
          </div>

          <!-- Видео -->
          <div
            v-else-if="isVideo"
            class="flex items-center justify-center min-h-75"
          >
            <video
              :src="fileUrl"
              controls
              class="max-w-full max-h-[65vh] rounded-lg shadow-sm"
            >
              <p class="text-gray-500">Ваш браузер не поддерживает видео</p>
            </video>
          </div>

          <!-- Аудио -->
          <div
            v-else-if="isAudio"
            class="flex flex-col items-center justify-center min-h-50 p-8"
          >
            <Icon
              name="i-heroicons-musical-note"
              class="w-16 h-16 text-gray-300 mb-4"
            />
            <audio :src="fileUrl" controls class="w-full max-w-md"></audio>
          </div>

          <!-- Другие файлы -->
          <div
            v-else
            class="flex flex-col items-center justify-center min-h-75 text-center p-8"
          >
            <Icon :name="fileIcon" class="w-20 h-20 text-gray-300 mb-4" />
            <p class="text-gray-500 mb-2">
              Предпросмотр для этого типа файлов не поддерживается
            </p>
            <p class="text-sm text-gray-400 mb-4">
              Расширение: {{ fileExtension }}
            </p>
            <UButton
              @click="downloadFile"
              color="primary"
              icon="i-heroicons-arrow-down-tray"
            >
              Скачать файл
            </UButton>
          </div>
        </div>

        <!-- ===== ПОДВАЛ ===== -->
        <div
          class="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-900"
        >
          <div class="text-xs text-gray-400 truncate">
            <span v-if="fileSize">{{ fileSize }}</span>
            <span v-if="filePath" class="ml-2 font-mono">{{ filePath }}</span>
          </div>
          <div class="flex gap-2">
            <UButton
              v-if="canDownload"
              @click="downloadFile"
              variant="outline"
              color="neutral"
              icon="i-heroicons-arrow-down-tray"
            >
              Скачать
            </UButton>
            <UButton @click="close" variant="outline" color="neutral">
              Закрыть
            </UButton>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
// ======= ИМПОРТЫ =======
import { ref, computed, watch } from 'vue';

// ======= ПРОПСЫ =======
const props = defineProps<{
  modelValue: boolean;
  filePath: string;
  fileName?: string;
}>();

// ======= СОБЫТИЯ =======
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'close'): void;
}>();

// ======= СОСТОЯНИЯ =======
const loading = ref(false);
const error = ref<string | null>(null);
const textContent = ref('');

// ======= ВЫЧИСЛЯЕМЫЕ СВОЙСТВА =======
const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
    if (!value) emit('close');
  },
});

const fileUrl = computed(() => {
  if (!props.filePath) return '';
  if (
    props.filePath.startsWith('http://') ||
    props.filePath.startsWith('https://')
  ) {
    console.log(props.filePath)
    return props.filePath;
  }
  // Убираем дублирующиеся слеши
  const cleanPath = props.filePath.replace(/^\/+/, '');
  console.log(cleanPath)
  return `/${cleanPath}`;
});

const fileName = computed(() => {
  if (props.fileName) return props.fileName;
  if (!props.filePath) return 'Файл';
  return props.filePath.split('/').pop() || 'Файл';
});

const fileExtension = computed(() => {
  const name = fileName.value;
  const ext = name.split('.').pop()?.toLowerCase() || '';
  return ext;
});

const fileType = computed(() => {
  const types: Record<string, string> = {
    pdf: 'PDF документ',
    doc: 'Документ Word',
    docx: 'Документ Word',
    xls: 'Таблица Excel',
    xlsx: 'Таблица Excel',
    ppt: 'Презентация',
    pptx: 'Презентация',
    jpg: 'Изображение',
    jpeg: 'Изображение',
    png: 'Изображение',
    gif: 'Изображение',
    svg: 'Изображение',
    webp: 'Изображение',
    bmp: 'Изображение',
    txt: 'Текстовый файл',
    csv: 'CSV файл',
    json: 'JSON файл',
    xml: 'XML файл',
    html: 'HTML файл',
    css: 'CSS файл',
    js: 'JavaScript файл',
    ts: 'TypeScript файл',
    mp4: 'Видео',
    webm: 'Видео',
    avi: 'Видео',
    mov: 'Видео',
    mkv: 'Видео',
    mp3: 'Аудио',
    wav: 'Аудио',
    ogg: 'Аудио',
    flac: 'Аудио',
  };
  return types[fileExtension.value] || 'Файл';
});

const fileSize = ref('');
const formattedFileSize = computed(() => fileSize.value || 'Размер не указан');

const fileIcon = computed(() => {
  const icons: Record<string, string> = {
    pdf: 'i-heroicons-document-text',
    doc: 'i-heroicons-document-text',
    docx: 'i-heroicons-document-text',
    xls: 'i-heroicons-document-text',
    xlsx: 'i-heroicons-document-text',
    ppt: 'i-heroicons-document-text',
    pptx: 'i-heroicons-document-text',
    jpg: 'i-heroicons-photo',
    jpeg: 'i-heroicons-photo',
    png: 'i-heroicons-photo',
    gif: 'i-heroicons-photo',
    svg: 'i-heroicons-photo',
    webp: 'i-heroicons-photo',
    bmp: 'i-heroicons-photo',
    txt: 'i-heroicons-document-text',
    csv: 'i-heroicons-document-text',
    json: 'i-heroicons-document-text',
    xml: 'i-heroicons-document-text',
    html: 'i-heroicons-code-bracket',
    css: 'i-heroicons-code-bracket',
    js: 'i-heroicons-code-bracket',
    ts: 'i-heroicons-code-bracket',
    mp4: 'i-heroicons-video-camera',
    webm: 'i-heroicons-video-camera',
    mp3: 'i-heroicons-musical-note',
    wav: 'i-heroicons-musical-note',
  };
  return icons[fileExtension.value] || 'i-heroicons-document';
});

const fileIconBgClass = computed(() => {
  const ext = fileExtension.value;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
    return 'bg-purple-100 dark:bg-purple-900/30';
  }
  if (ext === 'pdf') {
    return 'bg-red-100 dark:bg-red-900/30';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'bg-blue-100 dark:bg-blue-900/30';
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return 'bg-green-100 dark:bg-green-900/30';
  }
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
    return 'bg-pink-100 dark:bg-pink-900/30';
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return 'bg-yellow-100 dark:bg-yellow-900/30';
  }
  return 'bg-gray-100 dark:bg-gray-800';
});

const fileIconColorClass = computed(() => {
  const ext = fileExtension.value;
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
    return 'text-purple-600 dark:text-purple-400';
  }
  if (ext === 'pdf') {
    return 'text-red-600 dark:text-red-400';
  }
  if (['doc', 'docx'].includes(ext)) {
    return 'text-blue-600 dark:text-blue-400';
  }
  if (['xls', 'xlsx'].includes(ext)) {
    return 'text-green-600 dark:text-green-400';
  }
  if (['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(ext)) {
    return 'text-pink-600 dark:text-pink-400';
  }
  if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  return 'text-gray-600 dark:text-gray-400';
});

const isImage = computed(() => {
  return ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp'].includes(
    fileExtension.value
  );
});

const isPdf = computed(() => fileExtension.value === 'pdf');

const isText = computed(() => {
  return ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'ts'].includes(
    fileExtension.value
  );
});

const isVideo = computed(() => {
  return ['mp4', 'webm', 'avi', 'mov', 'mkv'].includes(fileExtension.value);
});

const isAudio = computed(() => {
  return ['mp3', 'wav', 'ogg', 'flac'].includes(fileExtension.value);
});

const canDownload = computed(() => {
  return true;
});

// ======= МЕТОДЫ =======
function close() {
  isOpen.value = false;
}

function downloadFile() {
  if (!fileUrl.value) return;
  window.open(fileUrl.value, '_blank');
}

function handleImageError() {
  error.value = 'Не удалось загрузить изображение';
}

// ======= ЗАГРУЗКА ТЕКСТОВЫХ ФАЙЛОВ =======
async function loadTextContent() {
  if (!isText.value || !fileUrl.value) return;
  if (textContent.value) return;

  loading.value = true;
  error.value = null;

  try {
    const response = await fetch(fileUrl.value);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    textContent.value = await response.text();
  } catch (err) {
    error.value =
      err instanceof Error ? err.message : 'Не удалось загрузить файл';
    console.error('Ошибка загрузки текста:', err);
  } finally {
    loading.value = false;
  }
}

// ======= ПОЛУЧЕНИЕ РАЗМЕРА ФАЙЛА =======
async function getFileSize() {
  if (!fileUrl.value) return;

  try {
    const response = await fetch(fileUrl.value, { method: 'HEAD' });
    const size = response.headers.get('content-length');
    if (size) {
      const bytes = parseInt(size);
      if (bytes < 1024) {
        fileSize.value = `${bytes} Б`;
      } else if (bytes < 1024 * 1024) {
        fileSize.value = `${(bytes / 1024).toFixed(1)} КБ`;
      } else if (bytes < 1024 * 1024 * 1024) {
        fileSize.value = `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
      } else {
        fileSize.value = `${(bytes / 1024 / 1024 / 1024).toFixed(1)} ГБ`;
      }
    }
  } catch (err) {
    console.warn('Не удалось получить размер файла:', err);
  }
}

// ======= СЛЕЖЕНИЕ ЗА ОТКРЫТИЕМ =======
watch(
  isOpen,
  (newVal) => {
    if (newVal) {
      // Сброс ошибок при открытии
      error.value = null;
      textContent.value = '';

      // Загружаем текстовое содержимое
      if (isText.value) {
        loadTextContent();
      }

      // Получаем размер файла
      getFileSize();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
/* Анимация появления */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-active .relative,
.fade-leave-active .relative {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.fade-enter-from .relative,
.fade-leave-to .relative {
  transform: scale(0.95) translateY(10px);
  opacity: 0;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Кастомный скролл */
.overflow-auto::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

.overflow-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-auto::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

.dark .overflow-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.dark .overflow-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>
