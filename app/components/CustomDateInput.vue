<!-- components/CustomDateInput.vue -->
<script setup lang="ts">
import { CalendarDate } from '@internationalized/date'

interface Props {
  modelValue?: CalendarDate | null
  minValue?: CalendarDate
  maxValue?: CalendarDate
  placeholder?: string
  required?: boolean
  label?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  minValue: undefined,
  maxValue: undefined,
  required: false,
  label: ''
})

const emit = defineEmits<{
  'update:modelValue': [value: CalendarDate | null]
}>()

const inputDate = useTemplateRef('inputDate')

// Локальное состояние для v-model
const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// Обработчик для очистки даты
const clearDate = () => {
  emit('update:modelValue', null)
}
</script>

<template>
  <UFormField :label="label" :required="required">
    <UInputDate
      ref="inputDate"
      v-model="localValue"
      :min-value="minValue"
      :max-value="maxValue"
    >
      <template #trailing>
        <div class="flex items-center gap-1">
          <!-- Кнопка очистки -->
          <!-- <UButton
            v-if="localValue"
            color="neutral"
            variant="link"
            size="sm"
            icon="i-lucide-x"
            aria-label="Clear date"
            class="px-0"
            @click="clearDate"
          /> -->
          
          <!-- Кнопка календаря -->
          <UPopover :reference="inputDate?.inputsRef?.[3]?.$el">
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="streamline-freehand-color:calendar-grid"
              aria-label="Select a date"
              class="px-0"
            />

            <template #content>
              <UCalendar v-model="localValue" class="p-2" />
            </template>
          </UPopover>
        </div>
      </template>
    </UInputDate>
  </UFormField>
</template>