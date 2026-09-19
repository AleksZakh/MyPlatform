<template>
  <UModal
    class="custom-modal"
    :ui="{
      content:
        'sm:max-w-3xl md:max-w-4xl lg:max-w-5xl xl:max-w-6xl w-full bg-gray-100',
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
              name="streamline-freehand-color:book-bookmark"
              size="28"
            />
          </div>

          <div>
            <h3
              class="text-lg font-semibold text-gray-900 dark:text-white"
            >
              Просмотр записи — Акт №
              {{ data?.samplingActNumber || '—' }}
            </h3>

            <p
              class="text-sm text-gray-500 dark:text-gray-400"
            >
              Просмотр данных записи
            </p>
          </div>
        </div>

        <UButton
          variant="ghost"
          color="neutral"
          icon="i-heroicons-x-mark-20-solid"
          class="rounded-full hover:bg-gray-100 transition-colors"
          @click="emit('close')"
        />
      </div>
    </template>


    <template #body>
      <div
        v-if="loading"
        class="py-16 text-center text-gray-500"
      >
        Загрузка записи...
      </div>


      <div
        v-else-if="!data"
        class="py-16 text-center text-gray-500"
      >
        Не удалось загрузить запись
      </div>


      <div
        v-else
        class="flex flex-col w-full bg-white"
      >
        <div
          class="flex parent"
        >
          <!-- ================================= -->
          <!-- ОТБОР ПРОБ -->
          <!-- ================================= -->
          <fieldset
            class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80"
          >
            <legend
              class="text-xl font-normal px-2 flex items-center gap-2"
            >
              <Icon
                name="streamline-freehand-color:business-product-supplier-1"
                size="24"
              />
              Отбор проб
            </legend>


            <div
              class="flex flex-col gap-y-3 p-2"
            >
              <InfoValue
                label="ПЛП"
                :value="
                  data.plp?.name
                "
              />

              <InfoValue
                label="Наименование объекта"
                :value="
                  data.testLocation
                    ?.testObject
                    ?.name
                "
              />

              <InfoValue
                label="Номер акта отбора проб"
                :value="
                  data.samplingActNumber
                "
                mono
              />

              <FileValue
                label="Документ отбора проб"
                :path="
                  data.samplingDocumentPath
                "
                @open="
                  fileViewerOpen
                "
              />

              <InfoValue
                label="Дата отбора проб"
                :value="
                  formatDate(
                    data.samplingDate,
                  )
                "
              />

              <InfoValue
                label="Место отбора проб"
                :value="
                  data.testLocation?.name
                "
              />

              <InfoValue
                label="Лицо, предоставившее пробу"
                :value="
                  data.inspector?.name
                "
              />

              <InfoValue
                label="Примечание"
                :value="
                  data.note
                "
                multiline
              />
            </div>
          </fieldset>


          <!-- ================================= -->
          <!-- ПОСТУПЛЕНИЕ МАТЕРИАЛА -->
          <!-- ================================= -->
          <fieldset
            class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80"
          >
            <legend
              class="text-xl font-normal px-2 flex items-center gap-2"
            >
              <Icon
                name="streamline-freehand-color:module-building-blocks"
              />
              Поступление материала
            </legend>


            <div
              class="flex flex-col gap-y-3 p-2"
            >
              <InfoValue
                label="Материал"
                :value="
                  data.receiptMaterial
                    ?.material
                    ?.name
                "
              />

              <InfoValue
                label="Дата поступления"
                :value="
                  formatDate(
                    data.receiptMaterial
                      ?.receiptDate,
                  )
                "
              />

              <InfoValue
                label="Дата документа о качестве"
                :value="
                  formatDate(
                    data.receiptMaterial
                      ?.qualityDocumentDate,
                  )
                "
              />

              <FileValue
                label="Документ о качестве"
                :path="
                  data.receiptMaterial
                    ?.qualityDocumentPath
                "
                @open="
                  fileViewerOpen
                "
              />

              <InfoValue
                label="Номер документа о качестве"
                :value="
                  data.receiptMaterial
                    ?.qualityDocumentNumber
                "
                mono
              />

              <InfoValue
                label="Предприятие-изготовитель"
                :value="
                  data.receiptMaterial
                    ?.manufacturer
                    ?.name
                "
              />

              <InfoValue
                label="Примечание"
                :value="
                  data.receiptMaterial
                    ?.note
                "
                multiline
              />
            </div>
          </fieldset>


          <!-- ================================= -->
          <!-- ПРОТОКОЛ -->
          <!-- ================================= -->
          <fieldset
            class="border-2 border-gray-200 mx-4 px-2 py-1 rounded-md bg-white/80"
          >
            <legend
              class="text-xl font-normal px-2 flex items-center gap-2"
            >
              <Icon
                name="streamline-freehand-color:task-list-pen"
              />
              Протокол испытаний
            </legend>


            <div
              v-if="data.testProtocol"
              class="flex flex-col gap-y-3 p-2"
            >
              <InfoValue
                label="Дата протокола"
                :value="
                  formatDate(
                    data.testProtocol
                      .protocolDate,
                  )
                "
              />

              <FileValue
                label="Документ протокола"
                :path="
                  data.testProtocol
                    .protocolDocumentPath
                "
                @open="
                  fileViewerOpen
                "
              />

              <div
                class="flex flex-col"
              >
                <label
                  class="text-xs font-medium text-gray-400 uppercase tracking-wider"
                >
                  Результат испытаний
                </label>

                <div
                  class="mt-1"
                >
                  <span
                    class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-md font-medium"
                    :class="
                      getResultBadgeClass(
                        data.testProtocol
                          .testResult,
                      )
                    "
                  >
                    <span
                      class="w-2 h-2 rounded-full"
                      :class="
                        getResultDotClass(
                          data.testProtocol
                            .testResult,
                        )
                      "
                    />

                    {{
                      data.testProtocol
                        .testResult ||
                      '—'
                    }}
                  </span>
                </div>
              </div>

              <InfoValue
                label="Номер протокола"
                :value="
                  data.testProtocol
                    .protocolNumber
                "
                mono
              />

              <InfoValue
                label="Примечание"
                :value="
                  data.testProtocol
                    .note
                "
                multiline
              />
            </div>


            <div
              v-else
              class="p-4 text-gray-400"
            >
              Протокол пока не создан.
            </div>
          </fieldset>
        </div>


        <div
          class="text-gray-400 p-2 flex justify-center gap-16"
        >
          <div
            class="flex items-center gap-2"
          >
            <span
              class="text-xs"
            >
              Создано:
            </span>

            <span
              class="text-sm text-gray-600"
            >
              {{
                authorInfo?.shortName ||
                data.authorEmail ||
                '—'
              }}
              {{
                formatDateTime(
                  data.createdAt,
                )
              }}
            </span>
          </div>


          <div
            class="flex items-center gap-2"
          >
            <span
              class="text-xs"
            >
              Обновлено:
            </span>

            <span
              class="text-sm text-gray-600"
            >
              {{
                editorInfo?.shortName ||
                data.editorEmail ||
                '—'
              }}
              {{
                formatDateTime(
                  data.editedAt,
                )
              }}
            </span>
          </div>
        </div>
      </div>
    </template>


    <template #footer>
      <div
        class="flex w-full gap-4 justify-end pt-2"
      >
        <UButton
          type="button"
          variant="outline"
          color="neutral"
          label="Закрыть"
          @click="emit('close')"
        />

        <UButton
          v-if="data"
          type="button"
          color="neutral"
          variant="outline"
          label="✏️ Редактировать"
          @click="handleEdit"
        />
      </div>
    </template>
  </UModal>
</template>


<script setup lang="ts">
import {
  defineComponent,
  h,
  onMounted,
  ref,
  resolveComponent,
} from 'vue'

import fViewerModal from '~/components/lab/FileViewerModal.vue'

import type {
  IncomingControlRecord,
} from '~/composables/useLabDataLoader'


type DetailResponse = {
  success: boolean
  data: IncomingControlRecord
}


const props =
  defineProps<{
    record:
      Partial<IncomingControlRecord> & {
        action?: string
      }
  }>()


const emit =
  defineEmits<{
    close: []
    edit: [id: number]
  }>()


const loading =
  ref(false)

const data =
  ref<IncomingControlRecord | null>(
    null,
  )

const authorInfo =
  ref<any>(null)

const editorInfo =
  ref<any>(null)


const overlay =
  useOverlay()

const modalFViewer =
  overlay.create(
    fViewerModal,
  )


const InfoValue =
  defineComponent({
    props: {
      label: {
        type: String,
        required: true,
      },

      value: {
        type: [
          String,
          Number,
        ],
        default: null,
      },

      mono: {
        type: Boolean,
        default: false,
      },

      multiline: {
        type: Boolean,
        default: false,
      },
    },

    setup(componentProps) {
      return () =>
        h(
          'div',
          {
            class:
              'flex flex-col',
          },
          [
            h(
              'label',
              {
                class:
                  'text-xs font-medium text-gray-400 uppercase tracking-wider',
              },
              componentProps.label,
            ),

            h(
              'div',
              {
                class: [
                  'mt-1 px-2 shadow-sm rounded-sm text-lg text-gray-800 min-w-70 bg-gray-50',

                  componentProps.mono
                    ? 'font-mono'
                    : '',

                  componentProps.multiline
                    ? 'whitespace-pre-wrap max-h-24 overflow-y-auto p-2'
                    : '',
                ],
              },
              componentProps.value ||
                '—',
            ),
          ],
        )
    },
  })


const FileValue =
  defineComponent({
    emits: [
      'open',
    ],

    props: {
      label: {
        type: String,
        required: true,
      },

      path: {
        type: String,
        default: null,
      },
    },

    setup(
      componentProps,
      {
        emit:
          emitComponent,
      },
    ) {
      return () =>
        h(
          'div',
          {
            class:
              'flex flex-col',
          },
          [
            h(
              'label',
              {
                class:
                  'text-xs font-medium text-gray-400 uppercase tracking-wider',
              },
              componentProps.label,
            ),

            componentProps.path
              ? h(
                  resolveComponent(
                    'UButton',
                  ),
                  {
                    variant:
                      'ghost',
                    color:
                      'primary',
                    size:
                      'sm',
                    class:
                      'px-0 w-fit',
                    onClick:
                      () =>
                        emitComponent(
                          'open',
                          componentProps.path,
                        ),
                  },
                  {
                    default:
                      () =>
                        getFileName(
                          componentProps.path!,
                        ),
                  },
                )
              : h(
                  'span',
                  {
                    class:
                      'text-md text-gray-400 mt-1',
                  },
                  '—',
                ),
          ],
        )
    },
  })


function formatDate(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return '—'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value
  }

  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    },
  ).format(date)
}


function formatDateTime(
  value:
    | string
    | null
    | undefined,
): string {
  if (!value) {
    return ''
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return ''
  }

  return date.toLocaleString(
    'ru-RU',
  )
}


function getFileName(
  path: string,
): string {
  return (
    path
      .split('/')
      .filter(Boolean)
      .at(-1) ||
    path
  )
}


function getResultBadgeClass(
  result:
    | string
    | null
    | undefined,
): string {
  const normalized =
    result
      ?.toLowerCase()
      .trim() ?? ''

  if (
    normalized.includes(
      'не соответствует',
    )
  ) {
    return (
      'bg-red-100 text-red-700'
    )
  }

  if (
    normalized.includes(
      'соответствует',
    )
  ) {
    return (
      'bg-green-100 text-green-700'
    )
  }

  return (
    'bg-gray-100 text-gray-600'
  )
}


function getResultDotClass(
  result:
    | string
    | null
    | undefined,
): string {
  const normalized =
    result
      ?.toLowerCase()
      .trim() ?? ''

  if (
    normalized.includes(
      'не соответствует',
    )
  ) {
    return 'bg-red-500'
  }

  if (
    normalized.includes(
      'соответствует',
    )
  ) {
    return 'bg-green-500'
  }

  return 'bg-gray-400'
}


function handleEdit() {
  if (!data.value) {
    return
  }

  emit(
    'edit',
    data.value.id,
  )

  emit('close')
}


function fileViewerOpen(
  path: string,
) {
  if (!path) {
    return
  }

  modalFViewer.open({
    path,
  })
}


onMounted(
  async () => {
    const recordId =
      props.record.id

    if (!recordId) {
      return
    }

    loading.value = true

    try {
      const response =
        await $fetch<DetailResponse>(
          `/api/incoming-control/${recordId}`,
        )

      data.value =
        response.data


      if (
        data.value.authorEmail
      ) {
        try {
          authorInfo.value =
            await searchUserInAD({
              authorEmail:
                data.value.authorEmail,
            })
        } catch {
          authorInfo.value = null
        }
      }


      if (
        data.value.editorEmail
      ) {
        try {
          editorInfo.value =
            await searchUserInAD({
              authorEmail:
                data.value.editorEmail,
            })
        } catch {
          editorInfo.value = null
        }
      }

    } catch (error) {
      console.error(
        'Ошибка загрузки записи:',
        error,
      )

      data.value = null

    } finally {
      loading.value = false
    }
  },
)
</script>


<style scoped>
legend {
  background:
    transparent !important;
}

.parent {
  border-radius: 8px;
  padding: 6px 8px;
}

fieldset {
  transition:
    all 0.2s ease;
}

fieldset:hover {
  border-color: #94a3b8;
}
</style>
