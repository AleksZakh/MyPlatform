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
      @change="handleFileChange"
    >


    <div
      class="flex min-w-0 items-center gap-2 rounded-md border bg-white px-2 py-2 transition"
      :class="[
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
  </div>
</template>


<script setup lang="ts">
import {
  computed,
  ref,
} from 'vue'

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
      '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png',

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


function handleFileChange(
  event: Event,
) {
  const input =
    event.target as
      HTMLInputElement

  const file =
    input.files?.[0] ??
    null

  if (file) {
    emit(
      'update:modelValue',
      file,
    )
  }

  /**
   * Нативное поле сразу очищаем.
   * Выбранный File хранится в Vue state,
   * поэтому название появляется с ПЕРВОГО выбора.
   * Заодно пользователь сможет повторно выбрать
   * тот же самый файл.
   */
  input.value = ''
}


function clearSelectedFile() {
  emit(
    'update:modelValue',
    null,
  )

  if (inputRef.value) {
    inputRef.value.value = ''
  }
}
</script>
