<template>
  <UFormField :label="label" :required="required">
    <UInputDate
      ref="inputDate"
      v-model="localValue"
      :min-value="minValue"
      :max-value="maxValue"
    >
      <template #trailing>
        <div class="flex items-center gap-1 relative">
          <!-- Кнопка очистки -->
          <UButton
            v-if="localValue"
            color="neutral"
            variant="link"
            size="sm"
            icon="i-lucide-x"
            aria-label="Clear date"
            class="px-0 absolute -right-7 top-0 text-red-300 hover:text-red-500 transform -translate-y-1/2"
            @click="clearDate"
          />

          <!-- Кнопка календаря -->
          <UPopover v-model:open="isPopoverOpen" :reference="inputDate?.inputsRef?.[3]?.$el">
            <UButton
              color="neutral"
              variant="link"
              size="sm"
              icon="streamline-freehand-color:calendar-grid"
              aria-label="Select a date"
              class="px-0"
            />

            <template #content>
              <div class="flex flex-col gap-4">
                <UCalendar v-model="localValue" class="p-2" variant="subtle" @update:model-value="onCalendarSelect"/>
                <UButton color="neutral" variant="outline" class="justify-center" @click="localValue = today(getLocalTimeZone()); isPopoverOpen = false"> Сегодня </UButton>
              </div>
            </template>
          </UPopover>
        </div>
      </template>
    </UInputDate>
  </UFormField>
</template>
<!-- components/CustomDateInput.vue -->
<script setup lang="ts">
import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';

const isPopoverOpen = ref(false);

interface Props {
  modelValue?: CalendarDate | null;
  minValue?: CalendarDate;
  maxValue?: CalendarDate;
  placeholder?: string;
  required?: boolean;
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: null,
  minValue: undefined,
  maxValue: undefined,
  required: false,
  label: '',
});

const emit = defineEmits<{
  'update:modelValue': [value: CalendarDate | null];
}>();

const inputDate = useTemplateRef('inputDate');

// Локальное состояние для v-model
const localValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const onCalendarSelect = (value: any) => {
  if (value instanceof CalendarDate) {
    localValue.value = value;      // обновляем значение
    isPopoverOpen.value = false;   // ← ЗАКРЫВАЕМ ПОПАП
  }
};

// Обработчик для очистки даты
const clearDate = () => {
  emit('update:modelValue', null);
};
</script>

