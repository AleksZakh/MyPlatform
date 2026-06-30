
<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    :title="`Новая запись реестра`"
    description="Заполните все поля"
    class="custom-modal"
    :ui="{ content: 'sm:max-w-none w-max' }"
  >
    <template #body>
      <UForm :state="state" class="space-y-4 relative " @submit="onSubmit">
        
        <!-- Контейнер для полей ввода (чтобы они не прижимались к линии) USelectMenu  -->
        <div class="space-y-4 space-x-2  px-2 -my-6 -mx-6 bg-gray-50 parent">

          <fieldset class="border-2 border-gray-200 px-2 py-1 rounded-md">
            <legend class="text-xl font-normal px-2">Отбор проб</legend>
            <div class="flex flex-col gap-3" >
              <UFormField label="ПЛП" required><USelectMenu class="min-w-70" v-model="state.plp" /></UFormField>
              <UFormField label="Наименование объекта" required><USelectMenu class="min-w-70" v-model="state.objName" /></UFormField>
              <UFormField label="Номер акта отборапроб" required><UInput class="min-w-70" v-model="state.actNumber" /></UFormField>
              <UFormField label="Документ отбора проб" ><UInput type="file" class="min-w-50" v-model="state.sDoc" /></UFormField>
              <UFormField label="Дата отбора проб" required><CustomDateInput v-model="state.sDate" :required="true" :min-value="minDate" :max-value="maxDate"/></UFormField>
              <UFormField label="Место отбора проб" ><USelectMenu class="min-w-70 max-w-70" v-model="state.sPlace" /></UFormField>
              <UFormField label="Лицо, предоставившее пробу" required><USelectMenu class="min-w-70" v-model="state.sPerson" /></UFormField>
              <UFormField label="Примечание" ><UTextarea class="min-w-70 max-h-40 overflow-auto" v-model="state.sNote" autoresize  /></UFormField>
            </div>
          </fieldset>

          <fieldset class="border-2 border-gray-200 px-2 py-1 rounded-md">
            <legend class="text-xl font-normal px-2">Поступление материала</legend>
            <div class="flex flex-col gap-2" >
              <UFormField label="Материал" required><USelectMenu class="min-w-70" v-model="state.material" /></UFormField>              
              <UFormField label="Дата поступления" required><CustomDateInput v-model="state.receiptDate" :required="true" :min-value="minDate" :max-value="maxDate"/></UFormField>              
              <UFormField label="Дата документа о качестве" ><CustomDateInput v-model="state.qualDocDate" :required="false" :min-value="minDate" :max-value="maxDate"/></UFormField>              
              <UFormField label="Документ о качестве" ><UInput type="file" class="min-w-50" v-model="state.qualDoc" /></UFormField>
              <UFormField label="Номер документа о качестве" ><UInput class="min-w-70" v-model="state.qualDocNumber" /></UFormField>
              <UFormField label="Предприятие изготовитель" ><UInput class="min-w-70" v-model="state.manufacturer" /></UFormField>
            </div>
          </fieldset>
          <fieldset class="border-2 border-gray-200 px-2 py-1 rounded-md">
            <legend class="text-xl font-normal px-2">Протокол испытаний</legend>
            <div class="flex flex-col gap-2" >
              <UFormField label="Дата" required><CustomDateInput v-model="state.testProtocolData" :required="true" :min-value="minDate" :max-value="maxDate"/></UFormField>
              <UFormField label="Документ" ><UInput type="file" class="min-w-50" v-model="state.protocolDoc" /></UFormField>
              <UFormField label="Результат испытаний" required><USelectMenu class="min-w-70" v-model="state.testResult" /></UFormField>
              <UFormField label="Номер" required><UInput class="min-w-70" v-model="state.testProtocolNumber" /></UFormField>
            </div>
          </fieldset>
        </div>

        <!-- Визуальный разделитель и блок кнопок -->
        <div class="relative ">
          <div class="absolute left-0 right-0 mt-2 -mx-6 border-t border-gray-200 dark:border-gray-800"></div>
          
          <div class="flex w-full gap-6 justify-end pt-8 mt-4">
            <UButton 
              type="button" 
              variant="outline" 
              color="neutral" 
              label="Отменить" 
              @click="emit('close', false)" 
            />
            <UButton 
              type="submit" 
              variant="outline"
              color="primary" 
              label="Сохранить"
              @click="emit('close', true)"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
  import * as v from 'valibot'
  import type { FormSubmitEvent } from '@nuxt/ui';
  import { CalendarDate } from '@internationalized/date';
  import { parseDate, getToday } from '../../../utils/dateUtils' // или '@/utils/dateUtils'

  const props = defineProps<{
    count: number
    selectedRecord?: {
      action?: string
      'Дата отбора проб'?: string
      'Дата поступления материала'?: string
      'Дата протокола'?: string
      'Документ о качестве'?: string
      'Лицо, предоставившее пробу'?: string
      'Место отбора проб'?: string
      'Наименование материала'?: string
      'Наименование объект'?: string
      'Номер акта отбора проб'?: string
      'Номер протокола'?: string
      'ПЛП'?: string
      'Предприятие-изготовитель'?: string
      'Примечание'?: string
      'Результат испытаний'?: string
      [key: string]: any
    }
  }>()  
  const emit = defineEmits<{ close: [boolean] }>();
  const toast = useToast();


  const inputDate = useTemplateRef('inputDate');
  const minDate = new CalendarDate(2023, 9, 1)
  const maxDate = getToday()

  const schema = v.object({
    // email: v.pipe(v.string(), v.email('Invalid email')),
    // password: v.pipe(v.string(), v.minLength(8, 'Must be at least 8 characters'))
  })

  type Schema = v.InferOutput<typeof schema>

  const state = reactive({
    plp: '',
    objName: '',
    actNumber: '',
    sDoc: '',
    sDate: shallowRef(new CalendarDate(2023, 9, 10)),
    sPlace: '',
    sPerson: '',
    sNote: '',
    material: '',
    receiptDate: shallowRef(new CalendarDate(2023, 9, 10)),
    qualDocDate: shallowRef(new CalendarDate(2023, 9, 10)),
    qualDoc: '',
    qualDocNumber: '',
    manufacturer: '',
    testProtocolData: shallowRef(new CalendarDate(2023, 9, 10)),
    protocolDoc: '',
    testResult: '',
    testProtocolNumber: ''
  });

  // Заполнение формы данными из пропсов
  function fillFormWithData(data: any) {
    if (!data) return

    state.plp = data['ПЛП'] || ''
    state.objName = data['Наименование объект'] || ''
    state.actNumber = data['Номер акта отбора проб'] || ''
    state.sDate = parseDate(data['Дата отбора проб']) || new CalendarDate(2023, 9, 10)
    state.sPlace = data['Место отбора проб'] || ''
    state.sPerson = data['Лицо, предоставившее пробу'] || ''
    state.sNote = data['Примечание'] || ''
    state.material = data['Наименование материала'] || ''
    state.receiptDate = parseDate(data['Дата поступления материала']) || new CalendarDate(2023, 9, 10)
    state.qualDocDate = parseDate(data['Дата протокола']) || new CalendarDate(2023, 9, 10)
    // state.qualDoc = data['Документ о качестве'] || ''
    state.qualDocNumber = data['Номер протокола'] || ''
    state.manufacturer = data['Предприятие-изготовитель'] || ''
    state.testProtocolData = parseDate(data['Дата протокола']) || new CalendarDate(2023, 9, 10)
    state.testResult = data['Результат испытаний'] || ''
    state.testProtocolNumber = data['Номер протокола'] || ''
  }

  watch(() => props.selectedRecord, (newVal) => {
    if (newVal?.action === 'edit') {
      fillFormWithData(newVal)
    }
  }, { immediate: true })

  async function onSubmit(event: FormSubmitEvent<Schema>) {
    toast.add({ title: 'Успех!', description: 'Данные новой записи успешно сохранены.', color: 'success' })
    console.log(event.data)
  }

</script>

<style scoped>

.parent {
  display: inline-grid; 
  /* 3 колонки: минимум контент, максимум 1 часть оставшегося пространства */
  grid-template-columns: repeat(3, minmax(max-content, 1fr));
  
  /* Разрешает родителю растягиваться под контент, если он инлайновый */
  width: max-content; 
  min-width: 100%;
}

.parent > *:last-child {
  margin-bottom: 16px;
}

/* Или задаем свои отступы */
/* .custom-modal :deep([data-slot="body"]) {
  padding: 0.5rem 1rem !important;
} */

/* Можно также через класс */
/* .custom-modal :deep(.modal-body) {
  padding: 0 !important;
} */
</style>


