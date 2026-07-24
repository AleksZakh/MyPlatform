<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    class="custom-modal bg-sky-100 shadow-blue-200 max-h-full"
    :ui="{ content: 'sm:max-w-none w-max' }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="flex items-center gap-3">
          <div class="text-2xl text-blue-500">
            <Icon name="streamline-freehand-color:content-write" size="30" />
          </div>
          <div>
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
              {{ modalTitle }}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Заполните все поля
            </p>
          </div>
        </div>
        <UButton
            variant="ghost"
            color="neutral"
            icon="i-heroicons-x-mark-20-solid"
            class="rounded-full hover:bg-gray-100 transition-colors"
            @click="emit('close', true);"
        />
      </div>
    </template>
    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4 relative"
        @submit="handleSubmit"
      >
        <!-- Контейнер для полей ввода (чтобы они не прижимались к линии) USelectMenu  -->
        <div class="space-y-4 space-x-2 px-2 -my-6 -mx-6 bg-gray-50 parent">
          <fieldset class="border-2 border-gray-200 px-2 py-1 rounded-md">
            <legend class="text-xl font-normal px-2">Отбор проб</legend>
            <div class="flex flex-col gap-3">
              <UFormField name="plp" label="ПЛП" required
                ><USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="min-w-70"
                  v-model="state.plp"
              /></UFormField>
              <UFormField name="objName" label="Наименование объекта" required
                ><USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="min-w-70 max-w-90"
                  v-model="state.objName"
              /></UFormField>
              <UFormField
                name="actNumber"
                label="Номер акта отборапроб"
                required
                ><UInput class="min-w-70" v-model="state.actNumber"
              /></UFormField>
              <UFormField name="sDoc" label="Документ отбора проб">
                <UInput
                  @change="
                    (e: Event) =>
                      sDocChange((e.target as HTMLInputElement).files!)
                  "
                  type="file"
                  class="min-w-50"
                />
              </UFormField>
              <UFormField name="sDate" label="Дата отбора проб" required
                ><CustomDateInput
                  v-model="state.sDate"
                  :required="true"
                  :min-value="minDate"
                  :max-value="maxDate"
              /></UFormField>
              <UFormField name="sPlace" label="Место отбора проб"
                ><USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="min-w-70 max-w-70"
                  v-model="state.sPlace"
              /></UFormField>
              <UFormField
                name="sPerson"
                label="Лицо, предоставившее пробу"
                required
                ><USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="min-w-70"
                  v-model="state.sPerson"
              /></UFormField>
              <UFormField name="sNote" label="Примечание"
                ><UTextarea
                  class="min-w-70 max-h-40 overflow-auto"
                  v-model="state.sNote"
                  autoresize
              /></UFormField>
            </div>
          </fieldset>

          <fieldset class="border-2 border-gray-200 px-2 py-1 rounded-md">
            <legend class="flex items-baseline gap-2 text-xl font-normal px-2">
              Поступление материала
              <USwitch color="info" default-value size="xs"/>
            </legend>
            <div class="flex flex-col gap-2">
              
              <UFormField name="material" label="Материал" required
                ><USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="min-w-70"
                  v-model="state.material"
              /></UFormField>
              <UFormField name="receiptDate" label="Дата поступления" required
                ><CustomDateInput
                  v-model="state.receiptDate"
                  :required="true"
                  :min-value="minDate"
                  :max-value="maxDate"
              /></UFormField>
              <UFormField name="qualDocDate" label="Дата документа о качестве"
                ><CustomDateInput
                  v-model="state.qualDocDate"
                  :required="false"
                  :min-value="minDate"
                  :max-value="maxDate"
              /></UFormField>
              <UFormField name="qualDoc" label="Документ о качестве">
                <UInput
                  @change="
                    (e: Event) =>
                      qualDocChange((e.target as HTMLInputElement).files!)
                  "
                  type="file"
                  class="min-w-50"
                />
              </UFormField>
              <UFormField
                name="qualDocNumber"
                label="Номер документа о качестве"
                ><UInput class="min-w-70" v-model="state.qualDocNumber"
              /></UFormField>
              <UFormField name="manufacturer" label="Предприятие изготовитель"
                ><UInput class="min-w-70" v-model="state.manufacturer"
              /></UFormField>
            </div>
          </fieldset>
          <fieldset class="border-2 border-gray-200 px-2 py-1 rounded-md">
            <legend class="text-xl flex items-baseline gap-1 font-normal px-2">
              Протокол испытаний
              <USwitch color="info" default-value size="xs"/>
            </legend>
            <div class="flex flex-col gap-2">
              <UFormField name="testProtocolDate" label="Дата" required
                ><CustomDateInput
                  v-model="state.testProtocolDate"
                  :required="true"
                  :min-value="minDate"
                  :max-value="maxDate"
              /></UFormField>
              <UFormField name="protocolDoc" label="Документ">
                <UInput
                  @change="
                    (e: Event) =>
                      protocolDocChange((e.target as HTMLInputElement).files!)
                  "
                  type="file"
                  class="min-w-50"
              /></UFormField>
              <UFormField name="testResult" label="Результат испытаний" required
                ><USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="min-w-70"
                  v-model="state.testResult"
              /></UFormField>
              <UFormField name="testProtocolNumber" label="Номер" required
                ><UInput class="min-w-70" v-model="state.testProtocolNumber"
              /></UFormField>
            </div>
          </fieldset>
        </div>

        <!-- Визуальный разделитель и блок кнопок -->
        <div class="relative">
          <div
            class="absolute left-0 right-0 mt-2 -mx-6 border-t border-gray-200 dark:border-gray-800"
          ></div>

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
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import * as z from 'zod';
import type { FormSubmitEvent } from '@nuxt/ui';
import { CalendarDate } from '@internationalized/date';
import { parseDate, getToday, dateToISOString } from '../../../utils/dateUtils'; // или '@/utils/dateUtils'

const props = defineProps<{
  count: number;
  selectedRecord?: {
    action?: string;
    'Дата отбора проб'?: string;
    'Дата поступления материала'?: string;
    'Дата протокола'?: string;
    'Документ о качестве'?: string;
    'Лицо, предоставившее пробу'?: string;
    'Место отбора проб'?: string;
    'Наименование материала'?: string;
    'Наименование объект'?: string;
    'Номер акта отбора проб'?: string;
    'Номер протокола'?: string;
    ПЛП?: string;
    'Предприятие-изготовитель'?: string;
    Примечание?: string;
    'Результат испытаний'?: string;
    [key: string]: any;
  };
  reloadData: Function;
}>();
const emit = defineEmits<{ close: [boolean] }>();

const items = ref(['Backlog', 'Todo', 'In Progress', 'Done']);
const value = ref('Backlog');
const modalTitle = ref('');
const {showTost} = useAppToasts()

function onCreate(newItem: string) {
  items.value.push(newItem);
  value.value = newItem;
}
const inputDate = useTemplateRef('inputDate');
const minDate = new CalendarDate(2000, 1, 1);
const maxDate = getToday();

// Настройки ограничений
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Мегабайт
const ACCEPTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Вынесем переиспользуемый валидатор файла
const fileValidator = z
  .instanceof(File, { message: 'Пожалуйста, выберите корректный файл' })
  .refine(
    (file) => file.size <= MAX_FILE_SIZE,
    `Максимальный размер файла — 5 МБ.`
  )
  .refine(
    (file) => ACCEPTED_FILE_TYPES.includes(file.type),
    'Допустимые форматы: .jpg, .png, .pdf, .doc, .docx, .txt'
  )
  .nullable() // Позволяет полю быть null, если файл не выбран
  .optional(); // Позволяет полю отсутствовать в объекте

const schema = z.object({
  plp: z.string().min(1, 'Пожалуйста, введите логин'),
  objName: z.string().min(1, 'Пожалуйста, введите пароль'),
  actNumber: z.string().min(1, 'Пожалуйста, введите номер акта'),
  sDoc: fileValidator.default(null),
  sDate: z
    .any()
    .refine(
      (val) => val !== null && val !== undefined,
      'Пожалуйста, выберите дату'
    ),
  sPlace: z.string().default(''),
  sPerson: z.string().default(''),
  sNote: z.string().default(''),
  material: z.string().default(''),
  receiptDate: z
    .any()
    .refine(
      (val) => val !== null && val !== undefined,
      'Пожалуйста, выберите дату'
    ),
  qualDocDate: z
    .any()
    .refine(
      (val) => val !== null && val !== undefined,
      'Пожалуйста, выберите дату'
    ),
  qualDoc: fileValidator.default(null),
  qualDocNumber: z.string().default(''),
  manufacturer: z.string().default(''),
  testProtocolDate: z
    .any()
    .refine(
      (val) => val !== null && val !== undefined,
      'Пожалуйста, выберите дату'
    ),
  protocolDoc: fileValidator.default(null),
  testResult: z.string().default(''),
  testProtocolNumber: z.string().default(''),
});

type Schema = z.output<typeof schema>;
// Выводим тип схемы для TypeScript
export type IncomingControlSchema = z.infer<typeof schema>;

// 2. ЕДИНСТВЕННЫЙ источник правды для структуры полей
const getInitialState = (): Schema => ({
  plp: '',
  objName: '',
  actNumber: '',
  sDoc: null as File | null,
  sDate: shallowRef(getToday()),
  sPlace: '',
  sPerson: '',
  sNote: '',
  material: '',
  receiptDate: shallowRef(getToday()),
  qualDocDate: shallowRef(getToday()),
  qualDoc: null as File | null,
  qualDocNumber: '',
  manufacturer: '',
  testProtocolDate: shallowRef(getToday()),
  protocolDoc: null as File | null,
  testResult: '',
  testProtocolNumber: '',
});

// 3. Создаем state на основе фабрики дефолтных значений
const state = reactive<Schema>(getInitialState());

// Функции-обработчики для каждого поля файла
const sDocChange = (files: FileList) => {
  if (files && files.length) state.sDoc = files[0] ?? null;
};

const qualDocChange = (files: FileList) => {
  if (files && files.length) state.qualDoc = files[0] ?? null;
};

const protocolDocChange = (files: FileList) => {
  if (files && files.length) state.protocolDoc = files[0] ?? null;
};

// 4. Сброс формы
function resetForm() {
  Object.assign(state, getInitialState());
}

// 5. Заполнение формы данными из таблицы
function fillFormWithData(data: any) {
  if (!data) return;

  state.plp = data['ПЛП'] || '';
  state.objName = data['Наименование объект'] || '';
  state.actNumber = data['Номер акта отбора проб'] || '';
  state.sDate = parseDate(data['Дата отбора проб']) || shallowRef(getToday());
  state.sPlace = data['Место отбора проб'] || '';
  state.sPerson = data['Лицо, предоставившее пробу'] || '';
  state.sNote = data['Примечание'] || '';
  state.material = data['Наименование материала'] || '';
  state.receiptDate =
    parseDate(data['Дата поступления материала']) || shallowRef(getToday());
  state.qualDocDate =
    parseDate(data['Дата протокола']) || shallowRef(getToday());
  // state.qualDoc = data['Документ о качестве'] || ''
  state.qualDocNumber = data['Номер протокола'] || '';
  state.manufacturer = data['Предприятие-изготовитель'] || '';
  state.testProtocolDate =
    parseDate(data['Дата протокола']) || shallowRef(getToday());
  // state.protocolDoc = data['Документ протокола'] || ''
  state.testResult = data['Результат испытаний'] || '';
  state.testProtocolNumber = data['Номер протокола'] || '';
}

// 6. Наблюдатель за открытием/закрытием/редактированием
watch(
  () => props.selectedRecord,
  (newVal) => {
    if (newVal?.action === 'edit' || newVal?.action === 'view') {
      fillFormWithData(newVal);
      modalTitle.value =
        newVal?.action === 'edit'
          ? 'Редактирование записи'
          : newVal?.['Наименование объект'] || 'Просмотр записи';
    } else if (newVal?.action === 'create' || !newVal) {
      modalTitle.value = 'Создание новой записи'
      resetForm();
    }
  },
  { immediate: true }
);

// Обработчик нажатия кнопки "Сохранить"
async function handleSubmit(event: FormSubmitEvent<Schema>) {
  // 1. Преобразуем даты в формат ISO строки перед упаковкой
  const sDateStr = dateToISOString(event.data.sDate);
  const receiptDateStr = dateToISOString(event.data.receiptDate);
  const qualDocDateStr = dateToISOString(event.data.qualDocDate);
  const testProtocolDateStr = dateToISOString(event.data.testProtocolDate);

  // 2. Создаем объект FormData для multipart-отправки (текст + файлы)
  const formData = new FormData();

  // 3. Заполняем FormData всеми полями из event.data
  Object.keys(event.data).forEach((key) => {
    const value = event.data[key as keyof Schema];
    // console.log('event.data ===>  ', event.data)

    // Заменяем оригинальные объекты дат на подготовленные ISO строки
    if (key === 'sDate') {
      formData.append(key, sDateStr);
    } else if (key === 'receiptDate') {
      formData.append(key, receiptDateStr);
    } else if (key === 'qualDocDate') {
      formData.append(key, qualDocDateStr);
    } else if (key === 'testProtocolDate') {
      formData.append(key, testProtocolDateStr);
    }
    // Если это файл (даже если null, multer/nitro пропустит или обработает корректно)
    else if (value instanceof File) {
      formData.append(key, value);
    }
    // Все остальные текстовые/строковые поля (проверяем, чтобы не отправить undefined строкой)
    else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  // Логика отправки данных в зависимости от экшена
  if (props.selectedRecord?.action === 'edit') {
    console.log(
      'Редактирование записи, добавляем id:',
      props.selectedRecord.ID
    );
    try {
      const response = await $fetch<{ success: boolean; error?: string }>(
        `/api/incoming-control/${props.selectedRecord.ID}`,
        {
          method: 'PUT',
          body: formData, // Передаем FormData вместо event.data
        }
      );

      if (response.success) {
        props.reloadData();
        showTost('Успех!', `Данные записи о ${event.data.objName} успешно обновлены.`, 'success', 'streamline-freehand-color:form-validation-check-double', 3000)
        
      } else {
        console.log('response =====> ', response)
        showTost('Ошибка!', `Не удалось обновить данные о ${event.data.objName}. ${response?.error}`, 'error', 'fxemoji:warningsign', 5000);
      }
    } catch (error) {
      console.error('Ошибка обновления:', error);
    showTost('Ошибка!', `Не удалось обновить данные. ${error}.`, 'error', 'fxemoji:warningsign', 5000);
    }
  } else if (props.selectedRecord?.action === 'create') {
    console.log('Создание новой записи');
    try {
      // console.log('Сохранение данных formData ===> ', formData)
      const response = await $fetch<{ success: boolean; error?: string }>(
        '/api/incoming-control',
        {
          method: 'POST',
          body: formData, // Передаем FormData вместо event.data
        }
      );

      if (response.success) {
        props.reloadData();
        showTost('Успех!', `Данные записи о ${event.data.objName} успешно сохранены.`, 'success', 'streamline-freehand-color:form-validation-check-double', 2000)
      } else {
        showTost('Ошибка!', `Не удалось сохранить данные о ${event.data.objName}.`, 'error', 'streamline-freehand-color:alerts-warning-triangle', 5000);
      }
    } catch (error) {
      console.error('Ошибка отправки:', error);
      showTost('Ошибка!', `Не удалось сохранить данные. ${error}.`, 'error', 'streamline-freehand-color:alerts-warning-triangle', 5000);
    }
  }

  emit('close', true);
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
</style>
