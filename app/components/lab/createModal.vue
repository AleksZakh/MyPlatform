<template>
  <UModal
    :close="{ onClick: () => emit('close', false) }"
    class="custom-modal bg-sky-100 shadow-blue-200 max-h-full w-full border border-gray-300"
    :ui="{ content: 'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl bg-gray-100' }"
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
        class="w-full relative"
        @submit="handleSubmit"
      >
        <!-- Контейнер для полей ввода (чтобы они не прижимались к линии) USelectMenu  -->
        <div class="grid grid-cols-3 gap-3 px-1 pb-2 bg-white parent">
          <fieldset class="border-2 border-gray-200 bg-white px-2 py-2 rounded-md">
            <legend class="text-xl font-normal gap-2 px-2 flex items-center"><Icon name="streamline-freehand-color:business-product-supplier-1" size="24"/> Отбор проб</legend>
            <div class="flex flex-col gap-2">
              <UFormField name="plp" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    ПЛП
                  </span>
                </template>
                <USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="w-full shadow-sm"
                  v-model="state.plp"
              /></UFormField>
              <UFormField name="objName" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    Наименование объекта
                  </span>
                </template>
                <USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="w-full shadow-sm"
                  v-model="state.objName"
                />
              </UFormField>
              <UFormField name="actNumber" required >
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    Номер акта отборапроб
                  </span>
                </template>
                <UInput class="w-full shadow-sm" v-model="state.actNumber" />
              </UFormField>
              <UFormField name="sDoc">
                <template #label>
                  <div class="flex items-end gap-2">
                    <span class="font-medium uppercase text-gray-900">
                      Документ отбора проб
                    </span> 
                    <!-- Добавлена проверка на существование пути к файлу: dbResponse?.sDocPath -->
                    <div v-if="state.sDate && dbResponse?.sDocPath" class="flex items-center border border-green-600 p-1 bg-green-50 rounded-sm hover:border-gray-200 transition-colors">
                      <a :href="getFileUrl(dbResponse.sDocPath)" class="flex items-center m-0 p-0 h-fit w-fit doc-link" target="_blank">
                        <Icon name="streamline-freehand-color:bookmarks-document" class="p-0 m-0"/>
                      </a>
                    </div>
                  </div>
                </template>
                <UInput
                  @change="
                    (e: Event) =>
                      sDocChange((e.target as HTMLInputElement).files!)
                  "
                  type="file"
                  class="w-full shadow-sm"
                />
              </UFormField>
              
              <UFormField name="sDate" required >                
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    Дата отбора проб
                  </span>
                </template>
                <CustomDateInput v-model="state.sDate" :required="true" :min-value="minDate" :max-value="maxDate" class="shadow-sm w-fit" />
              </UFormField>
              <UFormField name="sPlace">
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    Место отбора проб
                  </span>
                </template>
                <USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="w-full shadow-sm"
                  v-model="state.sPlace"
                />
              </UFormField>
              <UFormField name="sPerson" required >
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    Лицо, предоставившее пробу
                  </span>
                </template>
                <USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="w-full shadow-sm"
                  v-model="state.sPerson"
                />
              </UFormField>
              <UFormField name="sNote" >
                <template #label>
                  <span class="font-medium uppercase text-gray-900">
                    Примечание
                  </span>
                </template>
                <UTextarea
                  class="w-full overflow-auto shadow-sm"
                  v-model="state.sNote"
                  autoresize
                />
              </UFormField>
            </div>
          </fieldset>

          <fieldset class="border-2 border-gray-200 px-2 py-2 rounded-md">
            <legend class="flex items-center gap-2 text-xl font-normal px-2">
              <Icon name="streamline-freehand-color:module-building-blocks" />
              Поступление материала
              <USwitch color="info" v-model="isMaterialActive" size="xs"/>
            </legend>
            <div class="flex flex-col gap-4" :class="{' opacity-50': !isMaterialActive,}">              
              <UFormField name="material" :disabled="isMaterialActive" required>
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                    Материал
                  </span>
                </template>
                <USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="w-full"
                  v-model="state.material"
                  :disabled="!isMaterialActive"
                />
              </UFormField>
              <UFormField name="receiptDate"  required>
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                    Дата поступления
                  </span>
                </template>
                <CustomDateInput
                  v-model="state.receiptDate"
                  :required="true"
                  :min-value="minDate"
                  :max-value="maxDate"
                  :disabled="!isMaterialActive"
                />
              </UFormField>
              <UFormField name="qualDocDate" >
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                    Дата документа о качестве
                  </span>
                </template>
                <CustomDateInput
                  v-model="state.qualDocDate"
                  :required="false"
                  :min-value="minDate"
                  :max-value="maxDate"
                  :disabled="!isMaterialActive"
              /></UFormField>
              <UFormField name="qualDoc" >
                <template #label>
                  <div class="flex items-end gap-2">
                    <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                      Документ о качестве
                    </span>
                    <!-- Отображение ссылки на файл документа о качестве -->
                    <div v-if="isMaterialActive && dbResponse?.qualityDocument" class="flex items-center border border-green-600 p-1 bg-green-50 rounded-sm hover:border-gray-200 transition-colors">
                      <a :href="getFileUrl(dbResponse.qualityDocument)" class="flex items-center m-0 p-0 h-fit w-fit doc-link" target="_blank">
                        <Icon name="streamline-freehand-color:bookmarks-document" class="p-0 m-0"/>
                      </a>
                    </div>
                  </div>
                </template>
                <UInput
                  @change="
                    (e: Event) =>
                      qualDocChange((e.target as HTMLInputElement).files!)
                  "
                  type="file"
                  class="w-full"
                  :disabled="!isMaterialActive"
                />
              </UFormField>
              <UFormField name="qualDocNumber" >
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                    Номер документа о качестве
                  </span>
                </template>
                <UInput class="w-full" v-model="state.qualDocNumber" :disabled="!isMaterialActive"/>
              </UFormField>
              <UFormField name="manufacturer" >
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                    Предприятие изготовитель
                  </span>
                </template>
                <UInput class="w-full" v-model="state.manufacturer" :disabled="!isMaterialActive"/>
              </UFormField>
            </div>
          </fieldset>
          <fieldset class="border-2 border-gray-200 px-2 py-2 rounded-md ">
            <legend class="text-xl flex items-center gap-1 font-normal px-2">
              <Icon name="streamline-freehand-color:task-list-pen" />
              Протокол испытаний
              <USwitch color="info" v-model="isTestActive" size="xs"/>
            </legend>
            <div class="flex flex-col gap-2" :class="{' opacity-50': !isTestActive,}">
              <UFormField name="testProtocolDate"  required >
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isTestActive, 'text-gray-400': !isTestActive }">
                    Дата
                  </span>               
                </template>
                <CustomDateInput
                  v-model="state.testProtocolDate"
                  :required="true"
                  :min-value="minDate"
                  :max-value="maxDate"
                  :disabled="!isTestActive"
                />
              </UFormField>
              <UFormField name="protocolDoc" >
                <template #label>
                  <div class="flex items-end gap-2">
                    <span class="font-medium uppercase" :class="{ 'text-gray-900': isTestActive, 'text-gray-400': !isTestActive }">
                      Документ
                    </span>
                    <!-- Отображение ссылки на файл документа о качестве -->
                    <div v-if="isTestActive && dbResponse?.protocolDocPath" class="flex items-center border border-green-600 p-1 bg-green-50 rounded-sm hover:border-gray-200 transition-colors">
                      <a :href="getFileUrl(dbResponse.protocolDocPath)" class="flex items-center m-0 p-0 h-fit w-fit doc-link" target="_blank">
                        <Icon name="streamline-freehand-color:bookmarks-document" class="p-0 m-0"/>
                      </a>
                    </div>
                  </div>
                </template>
                <UInput
                  @change="
                    (e: Event) =>
                      protocolDocChange((e.target as HTMLInputElement).files!)
                  "
                  type="file"
                  class="w-full"
                  :disabled="!isTestActive"
              />
              </UFormField>
              <UFormField name="testResult"  required>
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isTestActive, 'text-gray-400': !isTestActive }">
                    Результат испытаний
                  </span>
                </template>
                <USelectMenu
                  :items="items"
                  @create="onCreate"
                  create-item
                  class="w-full"
                  :class="{
                    'border-2 border-green-100 ring-2 ring-green-100': state.testResult === 'Соответствует',
                    'border-2 border-red-100 ring-2 ring-red-100': state.testResult === 'Не соответствует',
                    'border border-gray-100': !state.testResult || state.testResult === ''
                  }"
                  v-model="state.testResult"
                  :disabled="!isTestActive"
                />
              </UFormField>
              <UFormField name="testProtocolNumber"  required>
                <template #label>
                  <span class="font-medium uppercase" :class="{ 'text-gray-900': isMaterialActive, 'text-gray-400': !isMaterialActive }">
                    Номер
                  </span>
                </template>
                <UInput class="w-full" v-model="state.testProtocolNumber" :disabled="!isTestActive"/>
              </UFormField>
            </div>
          </fieldset>
        </div>

        <!-- Визуальный разделитель и блок кнопок -->
        <div class="relative">
          <div class="flex w-full gap-6 justify-end px-2 py-4 ">
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
import {getFileUrl} from '@@/utils/fileUrl'
const userStore = useUserStore();
const { user } = storeToRefs(userStore);

const props = defineProps<{
  count: number;
  selectedRecord?: {
    action?: string;
    'Дата отбора проб'?: string;
    'Дата поступления материала'?: string;
    'Дата документа о качестве'?: string;
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
let dbResponse = ref()

function onCreate(newItem: string) {
  items.value.push(newItem);
  value.value = newItem;
}
const isMaterialActive= ref(false);
const isTestActive= ref(false);
const minDate = new CalendarDate(2000, 1, 1);
const maxDate = getToday();
const authorEmail = ref();
const editorEmail = ref();

// Настройки ограничений
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Мегабайт
const ACCEPTED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Создаем отдельные валидаторы для каждого поля файла
const getFileValidator = (isActive: Ref<boolean>) => {
  return z
    .any()
    .refine(
      (val) => {
        // Если блок неактивен - файл не требуется
        if (!isActive.value) return true;
        
        // Проверяем наличие файла
        if (val === null || val === undefined) return false;
        
        // Файл считается валидным если:
        // 1. Это File объект
        if (val instanceof File) return true;
        
        // 2. Это строка с путем к существующему файлу (при редактировании)
        if (typeof val === 'string' && val.length > 0) return true;
        
        return false;
      },
      { message: 'Пожалуйста, выберите корректный файл (pdf, jpg)' }
    )
    .refine(
      (val) => {
        // Проверка размера файла
        if (!isActive.value || !val) return true;
        if (typeof val === 'string') return true; // Существующий файл
        if (val instanceof File) {
          return val.size <= MAX_FILE_SIZE;
        }
        return true;
      },
      `Максимальный размер файла — 5 МБ.`
    )
    .refine(
      (val) => {
        // Проверка типа файла
        if (!isActive.value || !val) return true;
        if (typeof val === 'string') return true; // Существующий файл
        if (val instanceof File) {
          return ACCEPTED_FILE_TYPES.includes(val.type);
        }
        return true;
      },
      'Допустимые форматы: .jpg, .png, .pdf, .doc, .docx, .txt'
    )
    .nullable()
    .optional();
};

const schema = z.object({
  plp: z.string().min(1, 'Поле ПЛП обязательно для ввода'),
  objName: z.string().min(1, 'Название объекта является обязательным'),
  actNumber: z.string().min(1, 'Дата обязательна для ввода'),
  sDoc: getFileValidator(isMaterialActive),
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
      (val) => ((val !== null && val !== undefined) || isMaterialActive),
      'Пожалуйста, выберите дату'
    ),
  qualDocDate: z
    .any()
    .refine(
      (val) => ((val !== null && val !== undefined) || isMaterialActive),
      'Пожалуйста, выберите дату'
    ),
  qualDoc: getFileValidator(isMaterialActive),
  qualDocNumber: z.string().default(''),
  manufacturer: z.string().default(''),
  testProtocolDate: z
    .any()
    .refine(
      (val) => ((val !== null && val !== undefined) || isTestActive),
      'Пожалуйста, выберите дату'
    ),
  protocolDoc: getFileValidator(isTestActive), // Используем обновленный валидатор
  testResult: z.string().default(''),
  testProtocolNumber: z.string().default(''),
});

type Schema = z.output<typeof schema>;
// Выводим тип схемы для TypeScript
export type IncomingControlSchema = z.infer<typeof schema>;

// 2. Структура полей
const getInitialState = (): any => ({
  plp: '',
  objName: '',
  actNumber: '',
  sDoc: null as File | string | null,
  sDate: null,
  sPlace: '',
  sPerson: '',
  sNote: '',
  material: '',
  receiptDate: null,
  qualDocDate: null,
  qualDoc: null as File | string | null,
  qualDocNumber: '',
  manufacturer: '',
  testProtocolDate: null,
  protocolDoc: null as File | string | null,
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
function fillFormWithData(data: any, dbData: any) {
  if (!data) return;

  state.plp = data['ПЛП'] || '';
  state.objName = data['Наименование объект'] || '';
  state.actNumber = data['Номер акта отбора проб'] || '';
  state.sDate = parseDate(data['Дата отбора проб']) || null;
  state.sPlace = data['Место отбора проб'] || '';
  state.sPerson = data['Лицо, предоставившее пробу'] || '';
  state.sNote = data['Примечание'] || '';
  state.material = data['Наименование материала'] || '';
  state.receiptDate = parseDate(data['Дата поступления материала']) || null;
  
  if (dbData) {
    // Все файловые поля сохраняем как строки (пути к файлам)
    state.sDoc = dbData.sDocPath || '';
    state.qualDoc = dbData.qualityDocument || '';
    state.protocolDoc = dbData.protocolDocPath || '';
    
    state.qualDocDate = parseDate(dbData.qualDocDate);
    state.qualDocNumber = dbData.qualDocNumber || '';
  } else {
    state.sDoc = data['Документ отбора проб'] || '';
    state.qualDoc = data['Документ о качестве'] || '';
    state.protocolDoc = data['Документ протокола'] || '';
    
    state.qualDocDate = parseDate(data['Дата документа о качестве']);
    state.qualDocNumber = data['Номер протокола'] || '';
  }
  
  state.manufacturer = data['Предприятие-изготовитель'] || '';
  state.testProtocolDate = parseDate(data['Дата протокола']) || null;
  state.testResult = data['Результат испытаний'] || '';
  state.testProtocolNumber = data['Номер протокола'] || '';
}


// 6. Наблюдатель за открытием/закрытием/редактированием
watch(
  () => props.selectedRecord,
  async (newVal) => {
    if (newVal?.action === 'edit' || newVal?.action === 'view') {
      // console.log('newVal ====> ', newVal)
      const dbData = await $fetch(`/api/incoming-control/${newVal.ID}`);
      dbResponse.value = dbData;
      // console.log('dbResponse = ', dbResponse.value)
      if(dbData.qualDocDate || dbData.materialName){
        isMaterialActive.value = true;
      }
      if(dbData.protocolNumber){
        isTestActive.value = true;
      }
      fillFormWithData(newVal, dbData);
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

watch(
  user,
  (newUser) => {
    if (newUser) {
      // console.log('Сессия успешно считана и обновилась:', newUser);
      //@ts-ignore
      authorEmail.value = newUser?.email;
      //@ts-ignore
      editorEmail.value = newUser?.email;
      
    }
  },
  { immediate: true }
); // immediate проверит значение сразу при старте

// Обработчик нажатия кнопки "Сохранить"
async function handleSubmit(event: FormSubmitEvent<Schema>) {
  // 1. Преобразуем даты в формат ISO строки перед упаковкой
  let sDateStr:any, receiptDateStr:any, qualDocDateStr:any, testProtocolDateStr:any;
  if(event.data.sDate) sDateStr = dateToISOString(event.data.sDate);
  if(event.data.receiptDate) receiptDateStr = dateToISOString(event.data.receiptDate);
  if(event.data.qualDocDate) qualDocDateStr = dateToISOString(event.data.qualDocDate);
  if(event.data.testProtocolDate) testProtocolDateStr = dateToISOString(event.data.testProtocolDate);

  // 2. Создаем объект FormData для multipart-отправки (текст + файлы)
  const formData = new FormData();
  // @ts-ignore
  if(authorEmail.value){
    // @ts-ignore
    formData.append('authorEmail', authorEmail.value);
  } else {
    formData.append('authorEmail', 'noName');
    // @ts-ignore
    formData.append('editorEmail', 'noName');
  }
  

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
    // @ts-ignore
    formData.append('editorEmail', editorEmail.value);
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

onMounted(() => {
  // console.log('Данные пользователя на клиенте === ', user);
  // @ts-ignore
  // userDep.value = adUser.department || '';
});


</script>

<style scoped>
.doc-link{
  display: flex !important;
}

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
