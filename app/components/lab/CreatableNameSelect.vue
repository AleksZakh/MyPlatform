<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(defineProps<{
  modelValue: string
  items: string[]
  placeholder?: string
  loading?: boolean
  disabled?: boolean
  label?: string
}>(), { label: 'Название' })
const emit = defineEmits<{ 'update:modelValue': [string] }>()
const open = ref(false)
const editing = ref(false)
const original = ref('')
// Keep recent-use order; an old/custom value remains selectable.
const options = computed(() => [...new Set([...props.items, ...(props.modelValue ? [props.modelValue] : [])])])
function select(value: unknown) {
  if (!props.disabled) emit('update:modelValue', String(value ?? ''))
}
function create(value: string) {
  if (props.disabled) return
  const name = value.trim()
  if (!name) return
  const existing = props.items.find(item => item.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'))
  emit('update:modelValue', existing ?? name)
  open.value = false
}
function edit() {
  if (props.disabled) return
  original.value = props.modelValue
  open.value = false
  editing.value = true
}
function finish() {
  if (props.disabled) return
  const name = props.modelValue.trim()
  if (name) create(name)
  else emit('update:modelValue', '')
  editing.value = false
}
function cancel() {
  if (!props.disabled) emit('update:modelValue', original.value)
  editing.value = false
}
watch(() => props.disabled, value => { if (value) editing.value = false })
</script>

<template>
  <div class="min-w-0">
    <div class="flex items-start gap-2 min-w-0">
      <UInput
        v-if="editing"
        :model-value="modelValue"
        :disabled="disabled"
        :aria-label="label"
        :placeholder="placeholder"
        autofocus
        class="flex-1 min-w-0"
        @update:model-value="select"
        @blur="() => { if (!disabled) emit('update:modelValue', modelValue.trim()) }"
        @keydown.enter.prevent="finish"
        @keydown.esc.stop.prevent="cancel"
      />
      <USelectMenu
        v-else
        v-model:open="open"
        :model-value="modelValue || undefined"
        :items="options"
        :loading="loading"
        :disabled="disabled"
        :aria-label="label"
        :placeholder="placeholder || 'Выберите или создайте новый вариант'"
        :search-input="{ placeholder: 'Поиск или новый вариант…' }"
        :create-item="{ when: 'always', position: 'top' }"
        class="flex-1 min-w-0 shadow-sm"
        @update:model-value="select"
        @create="create"
      >
        <template #create-item-label="{ item }">Создать: «{{ item }}»</template>
      </USelectMenu>
      <UButton
        type="button"
        color="neutral"
        variant="outline"
        :icon="editing ? 'i-heroicons-check' : 'i-heroicons-pencil-square'"
        :disabled="disabled || (!editing && !modelValue)"
        :aria-label="editing ? 'Применить название' : `Создать вариант на основе выбранного: ${label}`"
        :title="editing ? 'Применить название' : 'Изменить название для новой записи'"
        @click="editing ? finish() : edit()"
      />
    </div>
    <p v-if="editing" class="mt-1 text-xs text-gray-500">
      Измените название. Новый вариант появится в справочнике после сохранения карточки; исходный останется.
    </p>
  </div>
</template>
