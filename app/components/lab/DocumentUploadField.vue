<!-- app/components/lab/DocumentUploadField.vue -->

<template>
  <div
    class="min-w-0 w-full"
  >
    <input
      ref="inputRef"
      type="file"
      class="hidden"
      :accept="accept"
      :disabled="disabled"
      :aria-invalid="invalid || !!selectionError"
      :aria-describedby="hintId"
      @change="handleFileChange"
    >


    <div
      class="document-drop-zone flex min-w-0 items-center gap-2 rounded-md border bg-white px-2 py-2 transition"
      :data-dragging="dragDepth > 0 && !disabled"
      @dragenter.prevent.stop="dragEnter"
      @dragover.prevent.stop="dragOver"
      @dragleave.prevent.stop="dragLeave"
      @drop.prevent.stop="dropFile"
      :class="[
        dragDepth > 0 && !disabled ? 'ring-2 ring-sky-500 bg-sky-50' : '',
        selectionError ? 'border-red-500' : '', 
        invalid
          ? 'border-red-500 ring-1 ring-red-500'
          : modelValue
            ? 'border-green-500'
            : 'border-gray-300',

        disabled
          ? 'cursor-not-allowed bg-gray-50 opacity-60'
          : 'hover:border-gray-400',
      ]"
    >
      <UButton
        type="button"
        size="sm"
        variant="outline"
        color="neutral"
        :disabled="disabled"
        class="shrink-0"
        @click="openPicker"
      >
        <Icon
          name="streamline-freehand-color:office-folder"
          size="18"
        />

        {{
          modelValue || existingPath
            ? 'Заменить'
            : 'Выбрать файл'
        }}
      </UButton>


      <div
        class="min-w-0 flex-1"
      >
        <div
          class="truncate text-sm"
          :class="
            modelValue || existingPath
              ? 'text-gray-800'
              : 'text-gray-400'
          "
          :title="displayName"
        >
          {{ displayName }}
        </div>

        <div
          class="mt-0.5 text-xs text-gray-400"
        >
          <template
            v-if="modelValue"
          >
            Новый файл ·
            {{ formatFileSize(modelValue.size) }}
          </template>

          <template
            v-else-if="existingPath"
          >
            Документ уже прикреплён
          </template>

          <template
            v-else
          >
            {{ emptyHint }}
          </template>
        </div>
      </div>


      <a
        v-if="
          existingPath &&
          !modelValue &&
          !disabled
        "
        :href="getFileUrl(existingPath)"
        target="_blank"
        rel="noopener noreferrer"
        class="shrink-0 rounded-md p-1.5 text-blue-600 hover:bg-blue-50"
        title="Открыть прикреплённый документ"
        @click.stop
      >
        <Icon
          name="streamline-freehand-color:bookmarks-document"
          size="20"
        />
      </a>


      <UButton
        v-if="modelValue"
        type="button"
        size="xs"
        variant="ghost"
        color="error"
        icon="i-heroicons-x-mark"
        :disabled="disabled"
        class="shrink-0"
        title="Убрать выбранный файл"
        @click="clearSelectedFile"
      />
    </div>
    <p :id="hintId" class="mt-1 text-xs text-gray-500" aria-live="polite">{{ disabled ? 'Выбор файла недоступен' : dragDepth > 0 ? 'Отпустите файл для выбора' : 'Перетащите сюда один файл или нажмите «Выбрать файл». JFIF поддерживается.' }}</p>
    <p v-if="selectionError" class="mt-1 text-sm text-red-600" role="alert">{{ selectionError }}</p>
  </div>
</template>


<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  useId,
} from 'vue'

import { LAB_DOCUMENT_ACCEPT, documentSelectionError } from '~~/shared/utils/document-selection'

import {
  getFileUrl,
} from '@@/utils/fileUrl'


const props = withDefaults(
  defineProps<{
    modelValue:
      File | null

    existingPath?:
      string | null

    disabled?:
      boolean

    invalid?:
      boolean

    accept?:
      string

    emptyHint?:
      string
  }>(),
  {
    existingPath:
      null,

    disabled:
      false,

    invalid:
      false,

    accept:
      LAB_DOCUMENT_ACCEPT,

    emptyHint:
      'PDF, Word, Excel или изображение',
  },
)


const emit =
  defineEmits<{
    'update:modelValue':
      [File | null]
  }>()


const inputRef =
  ref<HTMLInputElement | null>(
    null,
  )


const displayName =
  computed(() => {
    if (props.modelValue) {
      return props.modelValue.name
    }

    if (props.existingPath) {
      return getFileName(
        props.existingPath,
      )
    }

    return 'Файл не выбран'
  })


function getFileName(
  path: string,
): string {
  return (
    path
      .replaceAll('\\', '/')
      .split('/')
      .filter(Boolean)
      .at(-1) ||
    path
  )
}


function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} Б`
  }

  const kilobytes =
    bytes /
    1024

  if (kilobytes < 1024) {
    return (
      `${kilobytes.toFixed(1)} КБ`
    )
  }

  return (
    `${(
      kilobytes /
      1024
    ).toFixed(1)} МБ`
  )
}


function openPicker() {
  if (props.disabled) {
    return
  }

  inputRef.value?.click()
}


const selectionError = ref('')
const dragDepth = ref(0)
const hintId = useId()
watch(() => props.disabled, () => { dragDepth.value = 0; selectionError.value = '' })

function selectFiles(files: File[]) {
  if (props.disabled) return
  const error = documentSelectionError(files, props.accept)
  selectionError.value = error || ''
  if (!error) emit('update:modelValue', files[0]!)
}
function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  // Canceling the native picker keeps the current selection.
  if (input.files?.length) selectFiles(Array.from(input.files))
  input.value = ''
}
function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types || []).includes('Files')
}
function dragEnter(event: DragEvent) {
  if (!props.disabled && hasFiles(event)) dragDepth.value++
}
function dragOver(event: DragEvent) {
  if (event.dataTransfer) event.dataTransfer.dropEffect = !props.disabled && hasFiles(event) ? 'copy' : 'none'
}
function dragLeave() { dragDepth.value = Math.max(0, dragDepth.value - 1) }
function dropFile(event: DragEvent) {
  dragDepth.value = 0
  if (props.disabled) return
  const items = Array.from(event.dataTransfer?.items || [])
  if (items.some(item => item.webkitGetAsEntry?.()?.isDirectory)) {
    selectionError.value = 'Перетаскивайте файл, а не папку.'
    return
  }
  selectFiles(Array.from(event.dataTransfer?.files || []))
}


function clearSelectedFile() {
  if (props.disabled) return
  selectionError.value = ''
  emit(
    'update:modelValue',
    null,
  )

  if (inputRef.value) {
    inputRef.value.value = ''
  }
}
</script>
