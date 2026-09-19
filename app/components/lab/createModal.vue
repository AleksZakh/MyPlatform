<template>
  <UModal
    :close="{
      onClick: () =>
        emit('close', false),
    }"
    class="custom-modal bg-sky-100 shadow-blue-200 max-h-full w-full border border-gray-300"
    :ui="{
      content:
        ' max-w-[1500px] bg-gray-100 overflow-x-hidden',
      body:
        'overflow-x-hidden',
    }"
  >
    <template #header>
      <div
        class="flex items-center justify-between w-full"
      >
        <div
          class="flex items-center gap-3"
        >
          <div
            class="text-2xl text-blue-500"
          >
            <Icon
              name="streamline-freehand-color:content-write"
              size="30"
            />
          </div>

          <div>
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white"
            >
              {{ modalTitle }}
            </h3>

            <p
              class="text-sm text-gray-500 dark:text-gray-400"
            >
              Заполните все обязательные поля
            </p>
          </div>
        </div>

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-x-mark-20-solid"
          class="rounded-full hover:bg-gray-100 transition-colors"
          @click="emit('close', false)"
        />
      </div>
    </template>


    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="modal-form w-full min-w-0 max-w-full overflow-x-hidden relative"
        @submit="handleSubmit"
      >
        <div
          class="parent grid gap-3 px-1 pb-2 bg-white"
        >
          <!-- ===================================== -->
          <!-- 1. ОТБОР ПРОБ -->
          <!-- ===================================== -->
          <div class="section-slot">
          <fieldset
            :disabled="
              baseSectionDisabled
            "
            class="border-2 border-gray-200 bg-white px-2 py-2 rounded-md"
            :class="{
              'opacity-60':
                baseSectionDisabled,
            }"
          >
            <legend
              class="text-xl font-normal gap-2 px-2 flex items-center"
            >
              <Icon
                name="streamline-freehand-color:business-product-supplier-1"
                size="24"
              />
              Отбор проб
            </legend>


            <p
              v-if="baseLockHint"
              class="mb-2 text-xs"
              :class="
                baseSectionDisabled
                  ? 'text-red-600'
                  : 'text-gray-500'
              "
            >
              {{ baseLockHint }}
            </p>


            <div
              class="flex flex-col gap-2"
            >
              <UFormField
                name="samplingTest.plpName"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    ПЛП
                  </span>
                </template>

                <USelectMenu
                  v-model="
                    state.samplingTest.plpName
                  "
                  :items="plpItems"
                  :searchable="true"
                  :search-input="{
                    placeholder:
                      'Введите название...',
                  }"
                  class="w-full shadow-sm"
                />
              </UFormField>


              <UFormField
                name="samplingTest.testObjectName"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Наименование объекта
                  </span>
                </template>

                <USelectMenu
                  v-model="
                    state.samplingTest
                      .testObjectName
                  "
                  :items="testObjectItems"
                  :searchable="true"
                  :search-input="{
                    placeholder:
                      'Введите название...',
                  }"
                  class="w-full min-w-0 shadow-sm"
                />
              </UFormField>


              <UFormField
                name="samplingTest.samplingActNumber"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Номер акта отбора проб
                  </span>
                </template>

                <UInput
                  v-model="
                    state.samplingTest
                      .samplingActNumber
                  "
                  class="w-full shadow-sm"
                />
              </UFormField>


              <UFormField
                name="samplingTest.samplingDocumentFile"
                :required="isCreateMode"
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Документ отбора проб
                  </span>
                </template>

                <DocumentUploadField
                  v-model="
                    state.samplingTest
                      .samplingDocumentFile
                  "
                  :existing-path="
                    dbResponse
                      ?.samplingDocumentPath
                  "
                  :disabled="
                    baseSectionDisabled
                  "
                  empty-hint="Для новой записи документ обязателен"
                />
              </UFormField>


              <UFormField
                name="samplingTest.samplingDate"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Дата отбора проб
                  </span>
                </template>

                <div
                  class="date-field-shell"
                  :class="{
                    'date-field-shell--error':
                      chronologyFieldErrors
                        .samplingDate,
                  }"
                >
                  <CustomDateInput
                                    v-model="
                                      state.samplingTest
                                        .samplingDate
                                    "
                                    :required="true"
                                    :min-value="minDate"
                                    :max-value="maxDate"
                                    :class="[
                                      'shadow-sm w-fit',
                                      {
                                        'chronology-date-error':
                                          chronologyFieldErrors
                                            .samplingDate,
                                      },
                                    ]"
                                  />
                </div>
              </UFormField>


              <UFormField
                name="samplingTest.testLocationName"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Место отбора проб
                  </span>
                </template>

                <UInput
                  v-model="
                    state.samplingTest
                      .testLocationName
                  "
                  class="w-full min-w-0 shadow-sm"
                />
              </UFormField>


              <UFormField
                name="samplingTest.inspectorName"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Лицо, предоставившее пробу
                  </span>
                </template>

                <USelectMenu
                  v-model="
                    state.samplingTest
                      .inspectorName
                  "
                  :items="inspectorItems"
                  create-item
                  :searchable="true"
                  :search-input="{
                    placeholder:
                      'Введите имя...',
                  }"
                  class="w-full shadow-sm"
                />
              </UFormField>


              <UFormField
                name="samplingTest.note"
              >
                <template #label>
                  <span
                    class="font-medium uppercase text-gray-900"
                  >
                    Примечание
                  </span>
                </template>

                <UTextarea
                  v-model="
                    state.samplingTest.note
                  "
                  autoresize
                  class="w-full overflow-auto shadow-sm"
                />
              </UFormField>
            </div>
          </fieldset>
          </div>


          <!-- ===================================== -->
          <!-- 2. ПОСТУПЛЕНИЕ МАТЕРИАЛА -->
          <!-- ===================================== -->
          <div class="section-slot">
          <fieldset
            :disabled="
              baseSectionDisabled
            "
            class="border-2 border-gray-200 px-2 py-2 rounded-md"
            :class="{
              'opacity-60':
                baseSectionDisabled,
            }"
          >
            <legend
              class="flex items-center gap-2 text-xl font-normal px-2"
            >
              <Icon
                name="streamline-freehand-color:module-building-blocks"
              />
              Поступление материала
            </legend>


            <p
              v-if="baseLockHint"
              class="mb-2 text-xs"
              :class="
                baseSectionDisabled
                  ? 'text-red-600'
                  : 'text-gray-500'
              "
            >
              {{ baseLockHint }}
            </p>


            <div
              class="flex flex-col gap-3"
            >
              <UFormField
                name="receiptMaterial.materialName"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Материал
                  </span>
                </template>

                <USelectMenu
                  v-model="
                    state.receiptMaterial
                      .materialName
                  "
                  :items="materialItems"
                  :searchable="true"
                  :search-input="{
                    placeholder:
                      'Введите материал...',
                  }"
                  class="w-full"
                />
              </UFormField>


              <UFormField
                name="receiptMaterial.receiptDate"
                required
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Дата поступления
                  </span>
                </template>

                <div
                  class="date-field-shell"
                  :class="{
                    'date-field-shell--error':
                      chronologyFieldErrors
                        .receiptDate,
                  }"
                >
                  <CustomDateInput
                                    v-model="
                                      state.receiptMaterial
                                        .receiptDate
                                    "
                                    :required="true"
                                    :min-value="minDate"
                                    :max-value="maxDate"
                                    :class="{
                                      'chronology-date-error':
                                        chronologyFieldErrors
                                          .receiptDate,
                                    }"
                                  />
                </div>
              </UFormField>


              <UFormField
                name="receiptMaterial.qualityDocumentDate"
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Дата документа о качестве
                  </span>
                </template>

                <div
                  class="date-field-shell"
                  :class="{
                    'date-field-shell--error':
                      chronologyFieldErrors
                        .qualityDocumentDate,
                  }"
                >
                  <CustomDateInput
                                    v-model="
                                      state.receiptMaterial
                                        .qualityDocumentDate
                                    "
                                    :required="false"
                                    :min-value="minDate"
                                    :max-value="maxDate"
                                    :class="{
                                      'chronology-date-error':
                                        chronologyFieldErrors
                                          .qualityDocumentDate,
                                    }"
                                  />
                </div>
              </UFormField>


              <UFormField
                name="receiptMaterial.qualityDocumentFile"
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Документ о качестве
                  </span>
                </template>

                <DocumentUploadField
                  v-model="
                    state.receiptMaterial
                      .qualityDocumentFile
                  "
                  :existing-path="
                    dbResponse
                      ?.receiptMaterial
                      ?.qualityDocumentPath
                  "
                  :disabled="
                    baseSectionDisabled
                  "
                  empty-hint="Документ о качестве необязателен"
                />
              </UFormField>


              <UFormField
                name="receiptMaterial.qualityDocumentNumber"
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Номер документа о качестве
                  </span>
                </template>

                <UInput
                  v-model="
                    state.receiptMaterial
                      .qualityDocumentNumber
                  "
                  class="w-full"
                />
              </UFormField>


              <UFormField
                name="receiptMaterial.manufacturerName"
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Предприятие изготовитель
                  </span>
                </template>

                <USelectMenu
                  v-model="
                    state.receiptMaterial
                      .manufacturerName
                  "
                  :items="
                    manufacturerItems.slice(
                      0,
                      200,
                    )
                  "
                  :searchable="true"
                  :search-input="{
                    placeholder:
                      'Введите производителя...',
                  }"
                  class="w-full min-w-0"
                />
              </UFormField>


              <UFormField
                name="receiptMaterial.note"
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                  >
                    Примечание
                  </span>
                </template>

                <UTextarea
                  v-model="
                    state.receiptMaterial.note
                  "
                  autoresize
                  class="w-full overflow-auto shadow-sm"
                />
              </UFormField>
            </div>
          </fieldset>
          </div>


          <!-- ===================================== -->
          <!-- 3. ПРОТОКОЛ ИСПЫТАНИЙ -->
          <!-- ===================================== -->
          <div class="section-slot">
          <fieldset
            :disabled="
              protocolSectionDisabled
            "
            class="border-2 border-gray-200 px-2 py-2 rounded-md"
            :class="{
              'opacity-60':
                protocolSectionDisabled,
            }"
          >
            <legend
              class="text-xl flex items-center gap-2 font-normal px-2"
            >
              <Icon
                name="streamline-freehand-color:task-list-pen"
              />

              Протокол испытаний

            </legend>


            <div
              class="flex flex-col gap-2"
              :class="{
                'opacity-50':
                  protocolSectionDisabled,
              }"
            >
              <p
                v-if="isCreateMode"
                class="text-xs text-gray-400 mb-1"
              >
                Протокол станет доступен после
                первого сохранения записи.
              </p>

              <p
                v-else-if="protocolLockHint"
                class="text-xs mb-2"
                :class="
                  protocolSectionDisabled
                    ? 'text-red-600'
                    : 'text-gray-500'
                "
              >
                {{ protocolLockHint }}
              </p>


              <UFormField
                name="testProtocol.protocolDate"
                :required="
                  requiresNewProtocol
                "
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                    :class="{
                      'text-gray-900':
                        !protocolSectionDisabled,
                      'text-gray-400':
                        protocolSectionDisabled,
                    }"
                  >
                    Дата
                  </span>
                </template>

                <div
                  class="date-field-shell"
                  :class="{
                    'date-field-shell--error':
                      chronologyFieldErrors
                        .protocolDate,
                  }"
                >
                  <CustomDateInput
                                    v-model="
                                      state.testProtocol
                                        .protocolDate
                                    "
                                    :required="
                                      requiresNewProtocol
                                    "
                                    :min-value="minDate"
                                    :max-value="maxDate"
                                    :disabled="
                                      protocolSectionDisabled
                                    "
                                    :class="{
                                      'chronology-date-error':
                                        chronologyFieldErrors
                                          .protocolDate,
                                    }"
                                  />
                </div>
              </UFormField>


              <UFormField
                name="testProtocol.protocolDocumentFile"
                :required="
                  requiresNewProtocol
                "
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                    :class="{
                      'text-gray-900':
                        !protocolSectionDisabled,
                      'text-gray-400':
                        protocolSectionDisabled,
                    }"
                  >
                    Документ
                  </span>
                </template>

                <DocumentUploadField
                  v-model="
                    state.testProtocol
                      .protocolDocumentFile
                  "
                  :existing-path="
                    dbResponse
                      ?.testProtocol
                      ?.protocolDocumentPath
                  "
                  :disabled="
                    protocolSectionDisabled
                  "
                  empty-hint="Для нового протокола документ обязателен"
                />
              </UFormField>


              <UFormField
                name="testProtocol.testResult"
                :required="
                  requiresNewProtocol
                "
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                    :class="{
                      'text-gray-900':
                        !protocolSectionDisabled,
                      'text-gray-400':
                        protocolSectionDisabled,
                    }"
                  >
                    Результат испытаний
                  </span>
                </template>

                <USelect
                  v-model="
                    state.testProtocol
                      .testResult
                  "
                  :items="testResultItems"
                  :disabled="
                    protocolSectionDisabled
                  "
                  class="w-full"
                />
              </UFormField>


              <UFormField
                name="testProtocol.protocolNumber"
                :required="
                  requiresNewProtocol
                "
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                    :class="{
                      'text-gray-900':
                        !protocolSectionDisabled,
                      'text-gray-400':
                        protocolSectionDisabled,
                    }"
                  >
                    Номер
                  </span>
                </template>

                <UInput
                  v-model="
                    state.testProtocol
                      .protocolNumber
                  "
                  class="w-full"
                  :disabled="
                    protocolSectionDisabled
                  "
                />
              </UFormField>


              <UFormField
                name="testProtocol.note"
              >
                <template #label>
                  <span
                    class="font-medium uppercase"
                    :class="{
                      'text-gray-900':
                        !protocolSectionDisabled,
                      'text-gray-400':
                        protocolSectionDisabled,
                    }"
                  >
                    Примечание
                  </span>
                </template>

                <UTextarea
                  v-model="
                    state.testProtocol.note
                  "
                  autoresize
                  class="w-full overflow-auto shadow-sm"
                  :disabled="
                    protocolSectionDisabled
                  "
                />
              </UFormField>
            </div>
          </fieldset>
          </div>
        </div>


        <div
          class="relative"
        >
          <div
            class="flex w-full gap-6 justify-end px-2 py-4"
          >
            <UButton
              type="button"
              variant="outline"
              color="neutral"
              label="Отменить"
              @click="
                emit('close', false)
              "
            />

            <UButton
              type="submit"
              variant="outline"
              color="primary"
              label="Сохранить"
              :loading="isSaved"
              :disabled="isSaved"
            />
          </div>
        </div>
      </UForm>
    </template>
  </UModal>
</template>


<script setup lang="ts">
import * as z from 'zod'

import type {
  FormSubmitEvent,
} from '@nuxt/ui'

import {
  CalendarDate,
} from '@internationalized/date'

import {
  computed,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'

import {
  getToday,
  parseDate,
} from '../../../utils/dateUtils'

import {
  getFileUrl,
} from '@@/utils/fileUrl'

import DocumentUploadField from '~/components/lab/DocumentUploadField.vue'

import type {
  IncomingControlRecord,
} from '~/composables/useLabDataLoader'


type ModalAction =
  | 'create'
  | 'edit'
  | 'view'


type SelectedRecord =
  Partial<IncomingControlRecord> & {
    action?: ModalAction
  }


interface EditWindowState {
  exists: boolean
  lockedByTime: boolean
  canEdit: boolean

  createdAt: string | null
  expiresAt: string | null

  remainingSeconds:
    | number
    | null
}


interface IncomingControlEditLocks {
  windowMinutes: number
  override: boolean

  base: EditWindowState
  protocol: EditWindowState
}


type DetailResponse = {
  success: boolean
  data: IncomingControlRecord

  serverNow: string
  editLocks:
    IncomingControlEditLocks
}


const props = defineProps<{
  count: number
  selectedRecord?: SelectedRecord
  reloadData:
    () => void | Promise<void>
}>()


const emit =
  defineEmits<{
    close: [boolean]
  }>()


const userStore =
  useUserStore()

const {
  user,
} = storeToRefs(userStore)

const {
  showTost,
} = useAppToasts()

const {
  loadReference,
} = useReferenceDataLoader()


const modalTitle =
  ref('')

const dbResponse =
  ref<IncomingControlRecord | null>(
    null,
  )


const editLocks =
  ref<IncomingControlEditLocks | null>(
    null,
  )

/**
 * Разница между часами сервера и браузера.
 * Countdown поэтому не зависит от часов пользователя.
 */
const serverClockOffsetMs =
  ref(0)

const clockTickMs =
  ref(
    Date.now(),
  )

let editLockTimer:
  ReturnType<
    typeof setInterval
  > | null = null


const isSaved =
  ref(false)

const minDate =
  new CalendarDate(
    2000,
    1,
    1,
  )

const maxDate =
  getToday()

const authorEmail =
  ref('noName')

const editorEmail =
  ref('noName')



const plpItems =
  ref<string[]>([])

const testObjectItems =
  ref<string[]>([])

const inspectorItems =
  ref<string[]>([])

const materialItems =
  ref<string[]>([])

const manufacturerItems =
  ref<string[]>([])

const testResultItems =
  ref([
    'Соответствует',
    'Не соответствует',
  ])


const isCreateMode =
  computed(
    () =>
      props.selectedRecord
        ?.action === 'create' ||
      !props.selectedRecord?.id,
  )


const hasExistingProtocol =
  computed(
    () =>
      !!dbResponse.value
        ?.testProtocol,
  )


const hasProtocolInput =
  computed(() => {
    const protocol =
      state.testProtocol

    return Boolean(
      protocol.protocolNumber
        .trim() ||
      protocol.protocolDate ||
      protocol.protocolDocumentFile ||
      protocol.testResult
        .trim() ||
      protocol.note
        .trim(),
    )
  })


const shouldSendProtocol =
  computed(
    () =>
      !isCreateMode.value &&
      (
        hasExistingProtocol.value ||
        hasProtocolInput.value
      ),
  )


const requiresNewProtocol =
  computed(
    () =>
      !isCreateMode.value &&
      !hasExistingProtocol.value &&
      hasProtocolInput.value,
  )


const effectiveServerNowMs =
  computed(
    () =>
      clockTickMs.value +
      serverClockOffsetMs.value,
  )


function remainingSecondsUntil(
  expiresAt:
    | string
    | null
    | undefined,
): number | null {
  if (!expiresAt) {
    return null
  }

  const expiresMs =
    Date.parse(
      expiresAt,
    )

  if (
    Number.isNaN(
      expiresMs,
    )
  ) {
    return null
  }

  return Math.max(
    0,
    Math.ceil(
      (
        expiresMs -
        effectiveServerNowMs.value
      ) /
      1000,
    ),
  )
}


const baseRemainingSeconds =
  computed(
    () =>
      remainingSecondsUntil(
        editLocks.value
          ?.base
          .expiresAt,
      ),
  )


const protocolRemainingSeconds =
  computed(
    () =>
      remainingSecondsUntil(
        editLocks.value
          ?.protocol
          .expiresAt,
      ),
  )


const baseSectionDisabled =
  computed(() => {
    if (isCreateMode.value) {
      return false
    }

    if (!editLocks.value) {
      return true
    }

    if (editLocks.value.override) {
      return false
    }

    return (
      baseRemainingSeconds.value !==
        null &&
      baseRemainingSeconds.value <=
        0
    )
  })


const protocolSectionDisabled =
  computed(() => {
    if (isCreateMode.value) {
      return true
    }

    if (!editLocks.value) {
      return true
    }

    /**
     * Протокол ещё НЕ создан:
     * он доступен сразу после первого сохранения записи,
     * даже если базовые 10 минут уже закончились.
     */
    if (!hasExistingProtocol.value) {
      return false
    }

    if (editLocks.value.override) {
      return false
    }

    return (
      protocolRemainingSeconds.value !==
        null &&
      protocolRemainingSeconds.value <=
        0
    )
  })


function formatRemainingTime(
  seconds:
    | number
    | null,
): string {
  if (
    seconds === null ||
    seconds <= 0
  ) {
    return '00:00'
  }

  const minutes =
    Math.floor(
      seconds /
      60,
    )

  const restSeconds =
    seconds %
    60

  return (
    `${String(minutes).padStart(2, '0')}:${String(restSeconds).padStart(2, '0')}`
  )
}


const baseLockHint =
  computed(() => {
    if (
      isCreateMode.value ||
      !editLocks.value
    ) {
      return ''
    }

    if (
      editLocks.value.override &&
      editLocks.value
        .base
        .lockedByTime
    ) {
      return (
        'Временная блокировка снята специальным правом.'
      )
    }

    if (
      baseSectionDisabled.value
    ) {
      return (
        '10-минутный срок редактирования истёк.'
      )
    }

    return (
      `До блокировки: ${formatRemainingTime(baseRemainingSeconds.value)}`
    )
  })


const protocolLockHint =
  computed(() => {
    if (
      isCreateMode.value ||
      !editLocks.value
    ) {
      return ''
    }

    if (!hasExistingProtocol.value) {
      return (
        'Протокол ещё не создан. Его можно добавить сейчас; после первого сохранения начнутся отдельные 10 минут.'
      )
    }

    if (
      editLocks.value.override &&
      editLocks.value
        .protocol
        .lockedByTime
    ) {
      return (
        'Временная блокировка протокола снята специальным правом.'
      )
    }

    if (
      protocolSectionDisabled.value
    ) {
      return (
        '10-минутный срок редактирования протокола истёк.'
      )
    }

    return (
      `До блокировки протокола: ${formatRemainingTime(protocolRemainingSeconds.value)}`
    )
  })


const schema =
  z.object({
    samplingTest:
      z.object({
        plpName:
          z.string()
            .trim()
            .min(
              1,
              'Поле ПЛП обязательно',
            ),

        testObjectName:
          z.string()
            .trim()
            .min(
              1,
              'Объект обязателен',
            ),

        samplingActNumber:
          z.string()
            .trim()
            .min(
              1,
              'Номер акта обязателен',
            ),

        samplingDate:
          z.any()
            .refine(
              value =>
                value !== null &&
                value !== undefined,
              'Выберите дату отбора проб',
            ),

        samplingDocumentFile:
          z.any()
            .nullable()
            .optional(),

        testLocationName:
          z.string()
            .trim()
            .min(
              1,
              'Место отбора обязательно',
            ),

        inspectorName:
          z.string()
            .trim()
            .min(
              1,
              'Укажите лицо, предоставившее пробу',
            ),

        note:
          z.string()
            .default(''),
      }),

    receiptMaterial:
      z.object({
        materialName:
          z.string()
            .trim()
            .min(
              1,
              'Материал обязателен',
            ),

        receiptDate:
          z.any()
            .refine(
              value =>
                value !== null &&
                value !== undefined,
              'Выберите дату поступления',
            ),

        qualityDocumentDate:
          z.any()
            .nullable()
            .optional(),

        qualityDocumentFile:
          z.any()
            .nullable()
            .optional(),

        qualityDocumentNumber:
          z.string()
            .default(''),

        manufacturerName:
          z.string()
            .default(''),

        note:
          z.string()
            .default(''),
      }),

    testProtocol:
      z.object({
        protocolNumber:
          z.string()
            .default(''),

        protocolDate:
          z.any()
            .nullable()
            .optional(),

        protocolDocumentFile:
          z.any()
            .nullable()
            .optional(),

        testResult:
          z.string()
            .default(''),

        note:
          z.string()
            .default(''),
      }),
  })
    .superRefine(
      (value, ctx) => {
        if (
          isCreateMode.value &&
          !value.samplingTest
            .samplingDocumentFile
        ) {
          ctx.addIssue({
            code:
              z.ZodIssueCode.custom,
            path: [
              'samplingTest',
              'samplingDocumentFile',
            ],
            message:
              'Для новой записи нужен документ отбора проб',
          })
        }


        if (
          requiresNewProtocol.value
        ) {
          if (
            !value.testProtocol
              .protocolDate
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                'testProtocol',
                'protocolDate',
              ],
              message:
                'Укажите дату протокола',
            })
          }

          if (
            !value.testProtocol
              .protocolNumber
              .trim()
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                'testProtocol',
                'protocolNumber',
              ],
              message:
                'Укажите номер протокола',
            })
          }

          if (
            !value.testProtocol
              .testResult
              .trim()
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                'testProtocol',
                'testResult',
              ],
              message:
                'Укажите результат испытаний',
            })
          }

          if (
            !value.testProtocol
              .protocolDocumentFile
          ) {
            ctx.addIssue({
              code:
                z.ZodIssueCode.custom,
              path: [
                'testProtocol',
                'protocolDocumentFile',
              ],
              message:
                'Для нового протокола нужен документ',
            })
          }
        }
      },
    )


type Schema =
  z.output<typeof schema>


function getInitialState():
  Schema {
  return {
    samplingTest: {
      plpName: '',
      testObjectName: '',
      samplingActNumber: '',
      samplingDate: null,
      samplingDocumentFile: null,
      testLocationName: '',
      inspectorName: '',
      note: '',
    },

    receiptMaterial: {
      materialName: '',
      receiptDate: null,
      qualityDocumentDate: null,
      qualityDocumentFile: null,
      qualityDocumentNumber: '',
      manufacturerName: '',
      note: '',
    },

    testProtocol: {
      protocolNumber: '',
      protocolDate: null,
      protocolDocumentFile: null,
      testResult: '',
      note: '',
    },
  }
}


const state =
  reactive<Schema>(
    getInitialState(),
  )


const chronologyFieldErrors =
  computed(() => {
    const samplingDate =
      dateToApiValue(
        state.samplingTest
          .samplingDate,
      )

    const receiptDate =
      dateToApiValue(
        state.receiptMaterial
          .receiptDate,
      )

    const qualityDocumentDate =
      dateToApiValue(
        state.receiptMaterial
          .qualityDocumentDate,
      )

    const protocolDate =
      dateToApiValue(
        state.testProtocol
          .protocolDate,
      )


    const qualitySamplingConflict =
      !!(
        qualityDocumentDate &&
        samplingDate &&
        qualityDocumentDate >
          samplingDate
      )


    const samplingReceiptConflict =
      !!(
        samplingDate &&
        receiptDate &&
        samplingDate >
          receiptDate
      )


    const receiptProtocolConflict =
      !!(
        shouldSendProtocol.value &&
        receiptDate &&
        protocolDate &&
        receiptDate >
          protocolDate
      )


    return {
      qualityDocumentDate:
        qualitySamplingConflict,

      samplingDate:
        qualitySamplingConflict ||
        samplingReceiptConflict,

      receiptDate:
        samplingReceiptConflict ||
        receiptProtocolConflict,

      protocolDate:
        receiptProtocolConflict,
    }
  })


function resetForm() {
  Object.assign(
    state,
    getInitialState(),
  )

  dbResponse.value = null
  editLocks.value = null

  serverClockOffsetMs.value = 0

}


function fillFormWithData(
  record:
    IncomingControlRecord,
) {
  state.samplingTest.plpName =
    record.plp?.name ?? ''

  state.samplingTest.testObjectName =
    record.testLocation
      ?.testObject
      ?.name ?? ''

  state.samplingTest.samplingActNumber =
    record.samplingActNumber ?? ''

  state.samplingTest.samplingDate =
    parseDate(
      record.samplingDate,
    )

  state.samplingTest.samplingDocumentFile =
    null

  state.samplingTest.testLocationName =
    record.testLocation
      ?.name ?? ''

  state.samplingTest.inspectorName =
    record.inspector
      ?.name ?? ''

  state.samplingTest.note =
    record.note ?? ''


  const receipt =
    record.receiptMaterial

  state.receiptMaterial.materialName =
    receipt?.material
      ?.name ?? ''

  state.receiptMaterial.receiptDate =
    parseDate(
      receipt?.receiptDate,
    )

  state.receiptMaterial.qualityDocumentDate =
    parseDate(
      receipt
        ?.qualityDocumentDate,
    )

  state.receiptMaterial.qualityDocumentFile =
    null

  state.receiptMaterial.qualityDocumentNumber =
    receipt
      ?.qualityDocumentNumber ?? ''

  state.receiptMaterial.manufacturerName =
    receipt
      ?.manufacturer
      ?.name ?? ''

  state.receiptMaterial.note =
    receipt?.note ?? ''


  const protocol =
    record.testProtocol

  state.testProtocol.protocolNumber =
    protocol
      ?.protocolNumber ?? ''

  state.testProtocol.protocolDate =
    parseDate(
      protocol
        ?.protocolDate,
    )

  state.testProtocol.protocolDocumentFile =
    null

  state.testProtocol.testResult =
    protocol
      ?.testResult ?? ''

  state.testProtocol.note =
    protocol?.note ?? ''

}


async function loadReferenceData() {
  const refData =
    await loadReference()

  if (!refData) {
    return
  }

  const [
    plps = [],
    testObjects = [],
    inspectors = [],
    materials = [],
    manufacturers = [],
  ] =
    refData as Array<
      string[] | undefined
    >

  plpItems.value = plps
  testObjectItems.value = testObjects
  inspectorItems.value = inspectors
  materialItems.value = materials
  manufacturerItems.value = manufacturers
}



function dateToApiValue(
  value:
    | CalendarDate
    | null
    | undefined,
): string | null {
  if (!value) {
    return null
  }

  const month =
    String(value.month)
      .padStart(
        2,
        '0',
      )

  const day =
    String(value.day)
      .padStart(
        2,
        '0',
      )

  return (
    `${value.year}-${month}-${day}`
  )
}


function buildFormData(
  formState: Schema,
): FormData {
  const formData =
    new FormData()


  const payload = {
    samplingTest: {
      samplingActNumber:
        formState.samplingTest
          .samplingActNumber,

      samplingDate:
        dateToApiValue(
          formState.samplingTest
            .samplingDate,
        )!,

      note:
        formState.samplingTest
          .note,

      plpName:
        formState.samplingTest
          .plpName,

      testObjectName:
        formState.samplingTest
          .testObjectName,

      testLocationName:
        formState.samplingTest
          .testLocationName,

      inspectorName:
        formState.samplingTest
          .inspectorName,
    },

    receiptMaterial: {
      materialName:
        formState.receiptMaterial
          .materialName,

      manufacturerName:
        formState.receiptMaterial
          .manufacturerName ||
        null,

      receiptDate:
        dateToApiValue(
          formState.receiptMaterial
            .receiptDate,
        )!,

      qualityDocumentDate:
        dateToApiValue(
          formState.receiptMaterial
            .qualityDocumentDate,
        ),

      qualityDocumentNumber:
        formState.receiptMaterial
          .qualityDocumentNumber ||
        null,

      note:
        formState.receiptMaterial
          .note,
    },

    testProtocol:
      shouldSendProtocol.value
        ? {
            protocolNumber:
              formState.testProtocol
                .protocolNumber,

            protocolDate:
              dateToApiValue(
                formState.testProtocol
                  .protocolDate,
              ),

            testResult:
              formState.testProtocol
                .testResult,

            note:
              formState.testProtocol
                .note,
          }
        : null,
  }


  formData.append(
    'payload',
    JSON.stringify(
      payload,
    ),
  )


  const samplingFile =
    formState.samplingTest
      .samplingDocumentFile

  if (
    samplingFile instanceof
      File
  ) {
    formData.append(
      'samplingDocumentFile',
      samplingFile,
    )
  }


  const qualityFile =
    formState.receiptMaterial
      .qualityDocumentFile

  if (
    qualityFile instanceof
      File
  ) {
    formData.append(
      'qualityDocumentFile',
      qualityFile,
    )
  }


  const protocolFile =
    formState.testProtocol
      .protocolDocumentFile

  if (
    protocolFile instanceof
      File
  ) {
    formData.append(
      'protocolDocumentFile',
      protocolFile,
    )
  }


  return formData
}

watch(
  () =>
    props.selectedRecord,
  async newValue => {
    isSaved.value = false

    if (
      newValue?.action ===
        'edit' ||
      newValue?.action ===
        'view'
    ) {
      if (!newValue.id) {
        showTost(
          'Ошибка!',
          'Не удалось определить ID записи',
          'error',
          'fxemoji:warningsign',
          5000,
        )

        return
      }


      try {
        const response =
          await $fetch<DetailResponse>(
            `/api/incoming-control/${newValue.id}`,
          )

        dbResponse.value =
          response.data

        editLocks.value =
          response.editLocks

        serverClockOffsetMs.value =
          Date.parse(
            response.serverNow,
          ) -
          Date.now()

        clockTickMs.value =
          Date.now()

        fillFormWithData(
          response.data,
        )

        modalTitle.value =
          newValue.action ===
            'edit'
            ? `Редактирование записи — Акт № ${response.data.samplingActNumber}`
            : `Просмотр записи — Акт № ${response.data.samplingActNumber}`

      } catch (error) {
        console.error(
          'Ошибка загрузки записи:',
          error,
        )

        showTost(
          'Ошибка!',
          'Не удалось загрузить запись',
          'error',
          'fxemoji:warningsign',
          5000,
        )
      }

      return
    }


    modalTitle.value =
      'Создание новой записи'

    resetForm()
  },
  {
    immediate: true,
  },
)


watch(
  user,
  newUser => {
    if (!newUser) {
      return
    }

    authorEmail.value =
      (newUser as any)
        ?.email ||
      'noName'

    editorEmail.value =
      (newUser as any)
        ?.email ||
      'noName'
  },
  {
    immediate: true,
  },
)


function validateChronology(
  formState: Schema,
): string | null {
  const samplingDate =
    dateToApiValue(
      formState.samplingTest
        .samplingDate,
    )

  const receiptDate =
    dateToApiValue(
      formState.receiptMaterial
        .receiptDate,
    )

  const qualityDocumentDate =
    dateToApiValue(
      formState.receiptMaterial
        .qualityDocumentDate,
    )

  const protocolDate =
    dateToApiValue(
      formState.testProtocol
        .protocolDate,
    )


  if (
    qualityDocumentDate &&
    samplingDate &&
    qualityDocumentDate >
      samplingDate
  ) {
    return (
      'Дата документа о качестве не может быть позже даты отбора проб.'
    )
  }


  if (
    samplingDate &&
    receiptDate &&
    samplingDate >
      receiptDate
  ) {
    return (
      'Дата отбора проб не может быть позже даты поступления материала.'
    )
  }


  if (
    shouldSendProtocol.value &&
    receiptDate &&
    protocolDate &&
    receiptDate >
      protocolDate
  ) {
    return (
      'Дата протокола не может быть раньше даты поступления материала.'
    )
  }


  return null
}


function getApiErrorInfo(
  error: unknown,
): {
  status: number | null
  message: string
} {
  const apiError =
    error as any

  const rawStatus =
    apiError?.statusCode ??
    apiError?.status ??
    apiError?.response?.status ??
    apiError?.data?.statusCode ??
    null

  const status =
    Number.isFinite(
      Number(rawStatus),
    )
      ? Number(rawStatus)
      : null

  const message =
    apiError?.data
      ?.statusMessage ||
    apiError?.data
      ?.message ||
    apiError?.statusMessage ||
    (
      error instanceof Error
        ? error.message
        : 'Неизвестная ошибка'
    )


  return {
    status,
    message,
  }
}


async function handleSubmit(
  event:
    FormSubmitEvent<Schema>,
) {
  if (isSaved.value) {
    showTost(
      'Внимание!',
      'Данные уже отправляются. Пожалуйста, подождите.',
      'warning',
      'fxemoji:hourglass',
      3000,
    )

    return
  }


  const chronologyMessage =
    validateChronology(
      event.data,
    )


  if (chronologyMessage) {
    showTost(
      'Проверьте введённые даты',
      chronologyMessage,
      'warning',
      'fxemoji:warningsign',
      6000,
    )

    return
  }


  isSaved.value = true


  try {
    const recordId =
      props.selectedRecord?.id

    const method =
      isCreateMode.value
        ? 'POST'
        : 'PUT'

    const url =
      method === 'POST'
        ? '/api/incoming-control'
        : `/api/incoming-control/${recordId}`


    const response =
      await $fetch<{
        success: boolean
        error?: string
      }>(
        url,
        {
          method,
          body:
            buildFormData(
              event.data,
            ),
        },
      )


    if (!response.success) {
      throw new Error(
        response.error ||
        'Не удалось сохранить данные',
      )
    }


    showTost(
      'Успех!',
      method === 'PUT'
        ? 'Данные записи успешно обновлены'
        : 'Данные записи успешно сохранены',
      'success',
      'streamline-freehand-color:form-validation-check-double',
      3000,
    )


    emit(
      'close',
      true,
    )


    /**
     * Не держим модальное окно открытым,
     * пока большая таблица перечитывается с сервера.
     */
    void Promise.resolve(
      props.reloadData(),
    ).catch(
        error => {
          console.error(
            'Фоновое обновление Реестра завершилось ошибкой:',
            error,
          )

          showTost(
            'Запись сохранена',
            'Данные сохранены, но таблицу не удалось обновить автоматически. Обновите Реестр.',
            'warning',
            'fxemoji:warningsign',
            5000,
          )
        },
      )

  } catch (error) {
    const {
      status,
      message,
    } =
      getApiErrorInfo(
        error,
      )


    if (
      status !== null &&
      status >= 400 &&
      status < 500
    ) {
      showTost(
        'Проверьте введённые данные',
        message,
        'warning',
        'fxemoji:warningsign',
        6000,
      )

      return
    }


    console.error(
      'Ошибка сохранения:',
      error,
    )


    showTost(
      'Ошибка сервера',
      'Не удалось сохранить данные. Повторите попытку или обратитесь к администратору.',
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isSaved.value = false
  }
}


onMounted(
  async () => {
    await loadReferenceData()

    editLockTimer =
      setInterval(
        () => {
          clockTickMs.value =
            Date.now()
        },
        1000,
      )
  },
)


onUnmounted(
  () => {
    if (editLockTimer) {
      clearInterval(
        editLockTimer,
      )

      editLockTimer = null
    }
  },
)


defineExpose({
  resetForm,
  loadReferenceData,
})
</script>


<style scoped>
.modal-form {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow-x: hidden;
  box-sizing: border-box;
}

.date-field-shell {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  padding: 1px;
  border: 2px solid transparent;
  border-radius: 0.5rem;
  box-sizing: border-box;
  transition:
    border-color 0.15s ease,
    background-color 0.15s ease;
}

.date-field-shell--error {
  border-color: #ef4444;
  background-color: #fef2f2;
}

.parent {
  display: grid !important;
  width: 100% !important;
  min-width: 0 !important;
  max-width: 100% !important;
  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );
  align-items: stretch;
  box-sizing: border-box;
  overflow-x: hidden;
}

/*
 * Размером колонки управляет обычный div.
 * fieldset больше не участвует напрямую в расчёте grid track,
 * поэтому его intrinsic/min-content width не может раздвигать сетку.
 */
.section-slot {
  width: 100%;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  box-sizing: border-box;
}

.section-slot > fieldset {
  width: 100%;
  min-width: 0 !important;
  min-inline-size: 0 !important;
  max-width: 100%;
  height: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.section-slot > fieldset > * {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.section-slot legend {
  max-width: 100%;
}

.section-slot p,
.section-slot label,
.section-slot span {
  overflow-wrap: anywhere;
}

.parent :deep(input),
.parent :deep(textarea),
.parent :deep(button),
.parent :deep([role="combobox"]) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

.parent :deep(.w-full) {
  min-width: 0 !important;
  max-width: 100% !important;
}

@media (max-width: 980px) {
  .parent {
    grid-template-columns:
      1fr;
    overflow-x: hidden;
  }

  .section-slot {
    width: 100%;
    max-width: 100%;
  }
}

.parent > .section-slot:last-child {
  margin-bottom: 16px;
}

:deep(.uselectmenu-content) {
  will-change: transform;
}

:deep(.uselectmenu-viewport) {
  scroll-behavior: smooth;
}
</style>
