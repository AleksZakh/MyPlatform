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
          @click="emit('close', true)"
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
        <!-- Контейнер для полей ввода -->
        <div class="grid grid-cols-3 gap-3 px-1 pb-2 bg-white parent">
          <!-- ===== БЛОК 1: Отбор проб ===== -->
          <fieldset class="border-2 border-gray-200 bg-white px-2 py-2 rounded-md">
            <legend class="text-xl font-normal gap-2 px-2 flex items-center">
              <Icon name="streamline-freehand-color:business-product-supplier-1" size="24"/>
              Отбор проб
            </legend>
            <div class="flex flex-col gap-2">
              <!-- ПЛП -->
              <UFormField name="plp" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">ПЛП</span>
                </template>
                <USelectMenu
                  v-model="state.plp"
                  :items="plp_items"
                  :searchable="true"
                  :search-input="{ placeholder: 'Введите название...' }"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary',
                    position: 'popper',
                    virtualize: true
                  }"
                  class="w-full shadow-sm"
                />
              </UFormField>

              <!-- Наименование объекта -->
              <UFormField name="objName" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">Наименование объекта</span>
                </template>
                <USelectMenu
                  v-model="state.objName"
                  :items="objName_items"
                  :searchable="true"
                  :search-input="{ placeholder: 'Введите название...' }"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary',
                    position: 'popper',
                    virtualize: true
                  }"
                  class="w-full shadow-sm"
                />
              </UFormField>

              <!-- Номер акта отбора проб -->
              <UFormField name="actNumber" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">Номер акта отбора проб</span>
                </template>
                <UInput
                  v-model="state.actNumber"
                  class="w-full shadow-sm"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>

              <!-- Документ отбора проб -->
              <UFormField name="sDoc">
                <template #label>
                  <div class="flex items-end gap-2">
                    <span class="font-medium uppercase text-gray-900">Документ отбора проб</span>
                    <div
                      v-if="dbResponse && dbResponse['Документ отбора проб']"
                      class="flex items-center border border-green-600 p-1 bg-green-50 rounded-sm hover:border-gray-200 transition-colors"
                    >
                      <a
                        :href="getFileUrl(dbResponse['Документ отбора проб'])"
                        class="flex items-center m-0 p-0 h-fit w-fit doc-link"
                        target="_blank"
                      >
                        <Icon name="streamline-freehand-color:bookmarks-document" class="p-0 m-0"/>
                      </a>
                    </div>
                  </div>
                </template>
                <UInput
                  @change="(e: Event) => sDocChange((e.target as HTMLInputElement).files!)"
                  type="file"
                  class="w-full shadow-sm"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>

              <!-- Дата отбора проб -->
              <UFormField name="sDate" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">Дата отбора проб</span>
                </template>
                <CustomDateInput
                  v-model="state.sDate"
                  :required="true"
                  :min-value="minDate"
                  :max-value="maxDate"
                  class="shadow-sm w-fit"
                />
              </UFormField>

              <!-- Место отбора проб -->
              <UFormField name="sPlace">
                <template #label>
                  <span class="font-medium uppercase text-gray-900">Место отбора проб</span>
                </template>
                <UInput
                  v-model="state.sPlace"
                  class="shadow-sm w-88"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>

              <!-- Лицо, предоставившее пробу -->
              <UFormField name="sPerson" required>
                <template #label>
                  <span class="font-medium uppercase text-gray-900">Лицо, предоставившее пробу</span>
                </template>
                <USelectMenu
                  v-model="state.sPerson"
                  :items="persProv_items"
                  create-item
                  :searchable="true"
                  :search-input="{ placeholder: 'Введите имя...' }"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary',
                    position: 'popper',
                    virtualize: true
                  }"
                  class="w-full shadow-sm"
                />
              </UFormField>

              <!-- Примечание -->
              <UFormField name="sNote">
                <template #label>
                  <span class="font-medium uppercase text-gray-900">Примечание</span>
                </template>
                <UTextarea
                  v-model="state.sNote"
                  autoresize
                  class="w-full overflow-auto shadow-sm"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>
            </div>
          </fieldset>

          <!-- ===== БЛОК 2: Поступление материала ===== -->
          <fieldset class="border-2 border-gray-200 px-2 py-2 rounded-md">
            <legend class="flex items-center gap-2 text-xl font-normal px-2">
              <Icon name="streamline-freehand-color:module-building-blocks" />
              Поступление материала
              <USwitch color="info" v-model="isMaterialActive" size="xs"/>
            </legend>
            <div class="flex flex-col gap-4" :class="{'opacity-50': !isMaterialActive}">
              <!-- Материал -->
              <UFormField name="material" :disabled="isMaterialActive" required>
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isMaterialActive,
                    'text-gray-400': !isMaterialActive
                  }">
                    Материал
                  </span>
                </template>
                <USelectMenu
                  v-model="state.material"
                  :items="materials_items"
                  :searchable="true"
                  :search-input="{ placeholder: 'Введите материал...' }"
                  :disabled="!isMaterialActive"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary',
                    position: 'popper',
                    virtualize: true
                  }"
                  class="w-full"
                />
              </UFormField>

              <!-- Дата поступления -->
              <UFormField name="receiptDate" required>
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isMaterialActive,
                    'text-gray-400': !isMaterialActive
                  }">
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

              <!-- Дата документа о качестве -->
              <UFormField name="qualDocDate">
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isMaterialActive,
                    'text-gray-400': !isMaterialActive
                  }">
                    Дата документа о качестве
                  </span>
                </template>
                <CustomDateInput
                  v-model="state.qualDocDate"
                  :required="false"
                  :min-value="minDate"
                  :max-value="maxDate"
                  :disabled="!isMaterialActive"
                />
              </UFormField>

              <!-- Документ о качестве -->
              <UFormField name="qualDoc">
                <template #label>
                  <div class="flex items-end gap-2">
                    <span class="font-medium uppercase" :class="{
                      'text-gray-900': isMaterialActive,
                      'text-gray-400': !isMaterialActive
                    }">
                      Документ о качестве
                    </span>
                    <div
                      v-if="isMaterialActive && dbResponse && dbResponse['Документ о качестве']"
                      class="flex items-center border border-green-600 p-1 bg-green-50 rounded-sm hover:border-gray-200 transition-colors"
                    >
                      <a
                        :href="getFileUrl(dbResponse['Документ о качестве'])"
                        class="flex items-center m-0 p-0 h-fit w-fit doc-link"
                        target="_blank"
                      >
                        <Icon name="streamline-freehand-color:bookmarks-document" class="p-0 m-0"/>
                      </a>
                    </div>
                  </div>
                </template>
                <UInput
                  @change="(e: Event) => qualDocChange((e.target as HTMLInputElement).files!)"
                  type="file"
                  class="w-full"
                  :disabled="!isMaterialActive"
                />
              </UFormField>

              <!-- Номер документа о качестве -->
              <UFormField name="qualDocNumber">
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isMaterialActive,
                    'text-gray-400': !isMaterialActive
                  }">
                    Номер документа о качестве
                  </span>
                </template>
                <UInput
                  v-model="state.qualDocNumber"
                  class="w-full"
                  :disabled="!isMaterialActive"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>

              <!-- Предприятие изготовитель -->
              <UFormField name="manufacturer">
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isMaterialActive,
                    'text-gray-400': !isMaterialActive
                  }">
                    Предприятие изготовитель
                  </span>
                </template>
                <USelectMenu
                  v-model="state.manufacturer"
                  :items="manufacturer_items.slice(0, 200)"
                  :searchable="true"
                  :search-input="{ placeholder: 'Введите производителя...' }"
                  :disabled="!isMaterialActive"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary',
                    position: 'popper',
                    virtualize: true
                  }"
                  class="w-full"
                />
              </UFormField>
            </div>
          </fieldset>

          <!-- ===== БЛОК 3: Протокол испытаний ===== -->
          <fieldset class="border-2 border-gray-200 px-2 py-2 rounded-md">
            <legend class="text-xl flex items-center gap-1 font-normal px-2">
              <Icon name="streamline-freehand-color:task-list-pen" />
              Протокол испытаний
              <USwitch color="info" v-model="isTestActive" size="xs"/>
            </legend>
            <div class="flex flex-col gap-2" :class="{'opacity-50': !isTestActive}">
              <!-- Дата протокола -->
              <UFormField name="testProtocolDate" required>
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isTestActive,
                    'text-gray-400': !isTestActive
                  }">
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

              <!-- Документ протокола -->
              <UFormField name="protocolDoc">
                <template #label>
                  <div class="flex items-end gap-2">
                    <span class="font-medium uppercase" :class="{
                      'text-gray-900': isTestActive,
                      'text-gray-400': !isTestActive
                    }">
                      Документ
                    </span>
                    <div
                      v-if="isTestActive && dbResponse && dbResponse['Документ протокола']"
                      class="flex items-center border border-green-600 p-1 bg-green-50 rounded-sm hover:border-gray-200 transition-colors"
                    >
                      <a
                        :href="getFileUrl(dbResponse['Документ протокола'])"
                        class="flex items-center m-0 p-0 h-fit w-fit doc-link"
                        target="_blank"
                      >
                        <Icon name="streamline-freehand-color:bookmarks-document" class="p-0 m-0"/>
                      </a>
                    </div>
                  </div>
                </template>
                <UInput
                  @change="(e: Event) => protocolDocChange((e.target as HTMLInputElement).files!)"
                  type="file"
                  class="w-full"
                  :disabled="!isTestActive"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>

              <!-- Результат испытаний -->
              <UFormField name="testResult" required>
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isTestActive,
                    'text-gray-400': !isTestActive
                  }">
                    Результат испытаний
                  </span>
                </template>
                <USelect
                  v-model="state.testResult"
                  :items="testResultItems"
                  :disabled="!isTestActive"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary',
                    class: {
                      base: [
                        'relative group rounded-md inline-flex items-center disabled:cursor-not-allowed disabled:opacity-75 transition-colors',
                        {
                          'border-2 border-green-100 ring-2 ring-green-100': state.testResult === 'Соответствует',
                          'border-2 border-red-100 ring-2 ring-red-100': state.testResult === 'Не соответствует'
                        }
                      ]
                    }
                  }"
                  class="w-full"
                />
              </UFormField>

              <!-- Номер протокола -->
              <UFormField name="testProtocolNumber" required>
                <template #label>
                  <span class="font-medium uppercase" :class="{
                    'text-gray-900': isMaterialActive,
                    'text-gray-400': !isMaterialActive
                  }">
                    Номер
                  </span>
                </template>
                <UInput
                  v-model="state.testProtocolNumber"
                  class="w-full"
                  :disabled="!isTestActive"
                  :ui="{
                    size: 'md',
                    variant: 'outline',
                    color: 'primary'
                  }"
                />
              </UFormField>
            </div>
          </fieldset>
        </div>

        <!-- Блок кнопок -->
        <div class="relative">
          <div class="flex w-full gap-6 justify-end px-2 py-4">
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              label="Отменить"
              @click="emit('close', false)"
              :ui="{
                size: 'md',
                variant: 'outline',
                color: 'neutral'
              }"
            />
            <UButton
              type="submit"
              variant="outline"
              color="primary"
              label="Сохранить"
              :ui="{
                size: 'md',
                variant: 'outline',
                color: 'primary'
              }"
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
import { parseDate, getToday, dateToISOString } from '../../../utils/dateUtils';
import { getFileUrl } from '@@/utils/fileUrl';
import { refDebounced } from '@vueuse/core';

// ============================================
// ИМПОРТЫ И НАСТРОЙКИ
// ============================================
const userStore = useUserStore();
const { user } = storeToRefs(userStore);
const { showTost } = useAppToasts();

// ============================================
// ПРОПСЫ И EMITS
// ============================================
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

// ============================================
// СОСТОЯНИЕ
// ============================================
const modalTitle = ref('');
const dbResponse = ref();
const isMaterialActive = ref(false);
const isTestActive = ref(false);
const minDate = new CalendarDate(2000, 1, 1);
const maxDate = getToday();
const authorEmail = ref();
const editorEmail = ref();

// Данные для выпадающих списков
const plp_items = ref<string[]>([]);
const objName_items = ref<string[]>([]);
const persProv_items = ref<string[]>([]);
const materials_items = ref<string[]>([]);
const manufacturer_items = ref<string[]>([]);
const testResultItems = ref(['Соответствует', 'Не соответствует']);

// Состояние загрузки
const isLoading = ref(false);
const searchQuery = ref('');

// ============================================
// ВАЛИДАЦИЯ
// ============================================
const getFileValidator = (isActive: Ref<boolean>) => {
  return z.any().nullable().optional();
};

const schema = z.object({
  plp: z.string().min(1, 'Поле ПЛП обязательно для ввода'),
  objName: z.string().min(1, 'Название объекта является обязательным'),
  actNumber: z.string().min(1, 'Номер акта обязателен для ввода'),
  sDoc: getFileValidator(isMaterialActive),
  sDate: z.any().refine((val) => val !== null && val !== undefined, 'Пожалуйста, выберите дату'),
  sPlace: z.string().default(''),
  sPerson: z.string().default(''),
  sNote: z.string().default(''),
  material: z.string().default(''),
  receiptDate: z.any().refine((val) => (val !== null && val !== undefined) || isMaterialActive, 'Пожалуйста, выберите дату'),
  qualDocDate: z.any().refine((val) => (val !== null && val !== undefined) || isMaterialActive, 'Пожалуйста, выберите дату'),
  qualDoc: getFileValidator(isMaterialActive),
  qualDocNumber: z.string().default(''),
  manufacturer: z.string().default(''),
  testProtocolDate: z.any().refine((val) => (val !== null && val !== undefined) || isTestActive, 'Пожалуйста, выберите дату'),
  protocolDoc: getFileValidator(isTestActive),
  testResult: z.string().default(''),
  testProtocolNumber: z.string().default(''),
});

type Schema = z.output<typeof schema>;

// ============================================
// СОСТОЯНИЕ ФОРМЫ
// ============================================
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

const state = reactive<Schema>(getInitialState());

// ============================================
// МЕТОДЫ ДЛЯ ФАЙЛОВ
// ============================================
const sDocChange = (files: FileList) => {
  if (files && files.length) state.sDoc = files[0] ?? null;
};

const qualDocChange = (files: FileList) => {
  if (files && files.length) state.qualDoc = files[0] ?? null;
};

const protocolDocChange = (files: FileList) => {
  if (files && files.length) state.protocolDoc = files[0] ?? null;
};

// ============================================
// ЗАГРУЗКА СПРАВОЧНИКОВ
// ============================================
async function loadReferenceData() {
  isLoading.value = true;
  try {
    const [plpData, objNameData, persProvData, materialsData, manufacturerData] = await Promise.all([
      $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'plp', field: 'name' } }),
      $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'testObject', field: 'name' } }),
      $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'inspector', field: 'name' } }),
      $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'material', field: 'name' } }),
      $fetch('/api/incoming-control/fieldsInfo', { query: { model: 'manufacturer', field: 'name' } }),
    ]);
    
    plp_items.value = plpData || [];
    objName_items.value = objNameData || [];
    persProv_items.value = persProvData || [];
    materials_items.value = materialsData || [];
    manufacturer_items.value = manufacturerData || [];
  } catch (error) {
    console.error('Ошибка загрузки справочников:', error);
    showTost('Ошибка!', 'Не удалось загрузить справочные данные', 'error', 'fxemoji:warningsign', 5000);
  } finally {
    isLoading.value = false;
  }
}

// ============================================
// УПРАВЛЕНИЕ ФОРМОЙ
// ============================================
function resetForm() {
  Object.assign(state, getInitialState());
}

function fillFormWithData(data: any, dbData: any) {
  if (!data) return;
  
  state.plp = data['ПЛП'] || '';
  state.objName = data['Наименование объекта'] || '';
  state.actNumber = data['Номер акта отбора проб'] || '';
  state.sDate = parseDate(data['Дата отбора проб']) || null;
  state.sPlace = data['Место отбора проб'] || '';
  state.sPerson = data['Лицо, предоставившее пробу'] || '';
  state.sNote = data['Примечание (акт)'] || '';
  state.material = data['Наименование материала'] || '';
  state.receiptDate = parseDate(data['Дата поступления материала']) || null;
  
  if (dbData) {
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

// ============================================
// НАБЛЮДАТЕЛИ
// ============================================
watch(
  () => props.selectedRecord,
  async (newVal) => {
    if (newVal?.action === 'edit' || newVal?.action === 'view') {
      const dbData = await $fetch(`/api/incoming-control/${newVal.ID}`);
      dbResponse.value = dbData.data;
      
      if (dbData.data['Дата поступления материала'] || dbData.data['Наименование материала']) {
        isMaterialActive.value = true;
      }
      if (dbData.data['Дата протокола'] || dbData.data['Номер протокола'] || dbData.data['Результат испытаний']) {
        isTestActive.value = true;
      }
      
      fillFormWithData(newVal, dbData.data);
      modalTitle.value = newVal?.action === 'edit'
        ? `Редактирование записи - Акт № ${newVal['Номер акта отбора проб']}`
        : newVal['Наименование объект'] || 'Просмотр записи';
    } else if (newVal?.action === 'create' || !newVal) {
      modalTitle.value = 'Создание новой записи';
      resetForm();
      isMaterialActive.value = false;
      isTestActive.value = false;
    }
  },
  { immediate: true }
);

watch(
  user,
  (newUser) => {
    if (newUser) {
      authorEmail.value = (newUser as any)?.email || 'noName';
      editorEmail.value = (newUser as any)?.email || 'noName';
    }
  },
  { immediate: true }
);

// ============================================
// ОТПРАВКА ФОРМЫ
// ============================================
async function handleSubmit(event: FormSubmitEvent<Schema>) {
  // Преобразуем даты
  const sDateStr = event.data.sDate ? dateToISOString(event.data.sDate) : null;
  const receiptDateStr = event.data.receiptDate ? dateToISOString(event.data.receiptDate) : null;
  const qualDocDateStr = event.data.qualDocDate ? dateToISOString(event.data.qualDocDate) : null;
  const testProtocolDateStr = event.data.testProtocolDate ? dateToISOString(event.data.testProtocolDate) : null;

  const formData = new FormData();
  formData.append('authorEmail', authorEmail.value || 'noName');

  // Заполняем FormData
  Object.keys(event.data).forEach((key) => {
    const value = event.data[key as keyof Schema];
    
    if (key === 'sDate' && sDateStr) {
      formData.append(key, sDateStr);
    } else if (key === 'receiptDate' && receiptDateStr) {
      formData.append(key, receiptDateStr);
    } else if (key === 'qualDocDate' && qualDocDateStr) {
      formData.append(key, qualDocDateStr);
    } else if (key === 'testProtocolDate' && testProtocolDateStr) {
      formData.append(key, testProtocolDateStr);
    } else if (value instanceof File) {
      formData.append(key, value);
    } else if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  try {
    const url = props.selectedRecord?.action === 'edit'
      ? `/api/incoming-control/${props.selectedRecord.ID}`
      : '/api/incoming-control';
    
    const method = props.selectedRecord?.action === 'edit' ? 'PUT' : 'POST';
    
    if (method === 'PUT') {
      formData.append('editorEmail', editorEmail.value || 'noName');
    }

    const response = await $fetch<{ success: boolean; error?: string }>(url, {
      method,
      body: formData,
    });

    if (response.success) {
      props.reloadData();
      showTost(
        'Успех!',
        `Данные записи успешно ${method === 'PUT' ? 'обновлены' : 'сохранены'}`,
        'success',
        'streamline-freehand-color:form-validation-check-double',
        3000
      );
      emit('close', true);
    } else {
      showTost('Ошибка!', response.error || 'Не удалось сохранить данные', 'error', 'fxemoji:warningsign', 5000);
    }
  } catch (error) {
    console.error('Ошибка сохранения:', error);
    showTost('Ошибка!', `Не удалось сохранить данные: ${error}`, 'error', 'fxemoji:warningsign', 5000);
  }
}

// ============================================
// ЖИЗНЕННЫЙ ЦИКЛ
// ============================================
onMounted(() => {
  loadReferenceData();
});

// ============================================
// ЭКСПОРТЫ
// ============================================
defineExpose({
  resetForm,
  loadReferenceData,
});
</script>

<style scoped>
.doc-link {
  display: flex !important;
}

.parent {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(max-content, 1fr));
  width: max-content;
  min-width: 100%;
}

.parent > *:last-child {
  margin-bottom: 16px;
}

/* Оптимизация для виртуальной прокрутки */
:deep(.uselectmenu-content) {
  will-change: transform;
}

:deep(.uselectmenu-viewport) {
  scroll-behavior: smooth;
}
</style>