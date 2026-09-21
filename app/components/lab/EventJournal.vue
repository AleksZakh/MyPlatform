<template>
  <div class="journal-page">
    <section class="journal-card">
      <header class="journal-header">
        <div>
          <p class="eyebrow">
            Лабораторный контроль
          </p>

          <h1 class="journal-title">
            Журнал лабораторных событий
          </h1>

          <p class="journal-subtitle">
            Отбор проб, поступление материалов и протоколы испытаний
          </p>
        </div>

        <div class="journal-counter">
          Всего событий:
          <strong>{{ total }}</strong>
        </div>
      </header>


      <div class="type-tabs">
        <button
          v-for="item in typeItems"
          :key="item.value"
          type="button"
          class="type-tab"
          :class="{
            'type-tab--active':
              filters.type === item.value,
          }"
          @click="selectType(item.value)"
        >
          <Icon
            :name="item.icon"
            size="18"
          />

          <span>
            {{ item.label }}
          </span>
        </button>
      </div>


      <div class="filters">
        <div class="search-field">
          <Icon
            name="i-heroicons-magnifying-glass"
            class="search-icon"
          />

          <input
            v-model="filters.search"
            type="text"
            class="filter-input filter-input--search"
            placeholder="Поиск по акту, материалу, объекту, месту, протоколу..."
          >
        </div>

        <input
          v-model="filters.actor"
          type="text"
          class="filter-input"
          placeholder="Автор / редактор"
        >

        <input
          v-model="filters.dateFrom"
          type="date"
          class="filter-input filter-input--date"
          title="Дата создания: с"
        >

        <input
          v-model="filters.dateTo"
          type="date"
          class="filter-input filter-input--date"
          title="Дата создания: по"
        >

        <UButton
          label="Сбросить"
          icon="i-heroicons-x-mark"
          color="neutral"
          variant="outline"
          :disabled="!hasFilters"
          @click="resetFilters"
        />
      </div>


      <div class="table-shell">
        <div
          v-if="isLoading"
          class="loading-state"
        >
          <div class="spinner" />
          <span>Загрузка журнала...</span>
        </div>

        <table
          v-else
          class="journal-table"
        >
          <thead>
            <tr>
              <th>
                Событие
              </th>

              <th>
                Основные данные
              </th>

              <th>
                Дата события
              </th>

              <th>
                Создано
              </th>

              <th>
                Автор
              </th>

              <th>
                Последнее изменение
              </th>

              <th>
                Редактор
              </th>

              <th class="history-column">
                История
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="rows.length === 0">
              <td
                colspan="8"
                class="empty-cell"
              >
                По заданным условиям событий не найдено
              </td>
            </tr>

            <tr
              v-for="row in rows"
              :key="`${row.entityType}:${row.entityId}`"
              class="journal-row"
              @dblclick="openHistory(row)"
            >
              <td>
                <div class="event-kind">
                  <span
                    class="event-icon"
                    :class="eventIconClass(row.eventType)"
                  >
                    <Icon
                      :name="eventIcon(row.eventType)"
                      size="18"
                    />
                  </span>

                  <div class="min-w-0">
                    <div class="event-label">
                      {{ eventLabel(row.eventType) }}
                    </div>

                    <div class="entity-id">
                      ID {{ row.entityId }}
                    </div>
                  </div>
                </div>
              </td>

              <td>
                <div
                  class="event-title"
                  :title="row.title"
                >
                  {{ row.title }}
                </div>

                <div
                  v-if="row.subtitle"
                  class="event-subtitle"
                  :title="row.subtitle"
                >
                  {{ row.subtitle }}
                </div>
              </td>

              <td class="date-cell">
                {{ formatBusinessDate(row.businessDate) }}
              </td>

              <td class="date-cell">
                <span>
                  {{ formatDateTime(row.createdAt) }}
                </span>
              </td>

              <td>
                <span
                  class="actor"
                  :title="row.authorEmail || ''"
                >
                  {{ shortActor(row.authorEmail) }}
                </span>
              </td>

              <td class="date-cell">
                <template v-if="row.editedAt">
                  {{ formatDateTime(row.editedAt) }}
                </template>

                <span
                  v-else
                  class="muted"
                >
                  —
                </span>
              </td>

              <td>
                <span
                  v-if="row.editedAt"
                  class="actor"
                  :title="row.editorEmail || ''"
                >
                  {{ shortActor(row.editorEmail) }}
                </span>

                <span
                  v-else
                  class="muted"
                >
                  —
                </span>
              </td>

              <td class="history-cell">
                <button
                  type="button"
                  class="history-button"
                  title="Открыть историю события"
                  @click="openHistory(row)"
                >
                  <Icon
                    name="i-heroicons-clock"
                    size="18"
                  />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>


      <footer class="pagination">
        <div class="pagination-info">
          <template v-if="total > 0">
            Показано
            {{ (page - 1) * pageSize + 1 }}
            –
            {{ Math.min(page * pageSize, total) }}
            из {{ total }}
          </template>

          <template v-else>
            Нет записей
          </template>
        </div>

        <div class="pagination-controls">
          <UButton
            label="Назад"
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="page <= 1 || isLoading"
            @click="previousPage"
          />

          <span class="page-indicator">
            {{ page }} / {{ totalPages }}
          </span>

          <UButton
            label="Вперёд"
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="
              page >= totalPages ||
              isLoading
            "
            @click="nextPage"
          />
        </div>
      </footer>
    </section>


    <Teleport to="body">
      <div
        v-if="isHistoryOpen"
        class="modal-overlay"
        @mousedown.self="closeHistory"
      >
        <section
          class="history-modal"
          role="dialog"
          aria-modal="true"
        >
          <header class="history-header">
            <div class="min-w-0">
              <p class="eyebrow">
                История лабораторного события
              </p>

              <h2 class="history-title">
                {{ selectedRow?.title || 'Событие' }}
              </h2>

              <p
                v-if="selectedRow?.subtitle"
                class="history-subtitle"
              >
                {{ selectedRow.subtitle }}
              </p>
            </div>

            <button
              type="button"
              class="modal-close"
              title="Закрыть"
              @click="closeHistory"
            >
              <Icon
                name="i-heroicons-x-mark"
                size="21"
              />
            </button>
          </header>


          <div
            v-if="isLoadingHistory"
            class="loading-state history-loading"
          >
            <div class="spinner" />
            <span>Загрузка истории...</span>
          </div>

          <template v-else-if="historyResponse">
            <div class="history-summary">
              <div class="summary-card">
                <span class="summary-label">
                  Создано
                </span>

                <strong>
                  {{
                    historyResponse.summary.created
                      ? formatDateTime(
                          historyResponse.summary.created.timestamp,
                        )
                      : 'Нет данных'
                  }}
                </strong>

                <span class="summary-actor">
                  {{
                    historyResponse.summary.created?.actor.display ||
                    '—'
                  }}
                </span>
              </div>

              <div class="summary-card">
                <span class="summary-label">
                  Изменений
                </span>

                <strong>
                  {{ historyResponse.summary.updatesCount }}
                </strong>

                <span class="summary-actor">
                  Всего записей истории:
                  {{ historyResponse.summary.totalEvents }}
                </span>
              </div>

              <div class="summary-card">
                <span class="summary-label">
                  Последнее действие
                </span>

                <strong>
                  {{
                    historyResponse.summary.lastChange
                      ? actionLabel(
                          historyResponse.summary.lastChange.action,
                        )
                      : '—'
                  }}
                </strong>

                <span class="summary-actor">
                  {{
                    historyResponse.summary.lastChange
                      ? formatDateTime(
                          historyResponse.summary.lastChange.timestamp,
                        )
                      : '—'
                  }}
                </span>
              </div>
            </div>


            <section
              v-if="selectedRow"
              class="current-state"
            >
              <div class="current-state-head">
                <div>
                  <p class="eyebrow">
                    Текущее состояние события
                  </p>

                  <h3 class="current-state-title">
                    {{ eventLabel(selectedRow.eventType) }}
                  </h3>
                </div>

                <div
                  v-if="selectedRow.samplingTestId"
                  class="registry-reference"
                  title="ID связанной записи Реестра входного контроля"
                >
                  Реестр #{{ selectedRow.samplingTestId }}
                </div>
              </div>

              <div class="current-state-grid">
                <div
                  v-for="detail in currentEventDetails"
                  :key="detail.label"
                  class="current-detail"
                >
                  <span class="current-detail-label">
                    {{ detail.label }}
                  </span>

                  <span
                    class="current-detail-value"
                    :title="detail.value"
                  >
                    {{ detail.value }}
                  </span>
                </div>
              </div>

              <div
                v-if="selectedRow.note"
                class="current-note"
              >
                <span class="current-detail-label">
                  Примечание
                </span>

                <span class="current-note-value">
                  {{ selectedRow.note }}
                </span>
              </div>
            </section>


            <div class="history-list">
              <article
                v-for="item in historyResponse.history"
                :key="item.auditId"
                class="history-item"
              >
                <div class="timeline-column">
                  <span
                    class="timeline-dot"
                    :class="timelineDotClass(item.action)"
                  />

                  <span class="timeline-line" />
                </div>

                <div class="history-content">
                  <div class="history-item-head">
                    <div>
                      <span
                        class="action-badge"
                        :class="actionBadgeClass(item.action)"
                      >
                        {{ actionLabel(item.action) }}
                      </span>

                      <span class="history-date">
                        {{ formatDateTime(item.timestamp) }}
                      </span>
                    </div>

                    <span
                      class="history-actor"
                      :title="item.actor.email || item.actor.login || ''"
                    >
                      {{ item.actor.display }}
                    </span>
                  </div>

                  <p
                    v-if="item.note"
                    class="history-note"
                  >
                    {{ item.note }}
                  </p>

                  <div
                    v-if="changeEntries(item).length"
                    class="changes-table"
                  >
                    <div class="changes-head">
                      <span>Поле</span>
                      <span>Было</span>
                      <span>Стало</span>
                    </div>

                    <div
                      v-for="change in changeEntries(item)"
                      :key="change.field"
                      class="changes-row"
                    >
                      <span class="change-field">
                        {{ fieldLabel(change.field) }}
                      </span>

                      <span class="change-before">
                        {{ displayValue(change.before) }}
                      </span>

                      <span class="change-after">
                        {{ displayValue(change.after) }}
                      </span>
                    </div>
                  </div>

                  <details
                    v-else-if="item.legacy"
                    class="legacy-details"
                  >
                    <summary>
                      Показать данные старого формата аудита
                    </summary>

                    <pre>{{ prettyJson(item.legacy) }}</pre>
                  </details>
                </div>
              </article>

              <div
                v-if="historyResponse.history.length === 0"
                class="empty-history"
              >
                Для этого события история аудита пока отсутствует
              </div>
            </div>
          </template>
        </section>
      </div>
    </Teleport>
  </div>
</template>


<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'


type JournalType =
  | 'all'
  | 'sampling'
  | 'receipt'
  | 'protocol'


interface JournalRow {
  eventType:
    | 'sampling'
    | 'receipt'
    | 'protocol'

  entityType:
    | 'SamplingTest'
    | 'ReceiptMaterial'
    | 'TestProtocol'

  entityId: number
  samplingTestId: number | null

  title: string
  subtitle: string | null

  businessDate: string | null

  samplingActNumber: string | null
  materialName: string | null
  manufacturerName: string | null
  protocolNumber: string | null

  objectName: string | null
  locationName: string | null
  plpName: string | null
  inspectorName: string | null
  testResult: string | null

  documentPath: string | null
  note: string | null

  createdAt: string
  authorEmail: string | null

  editedAt: string | null
  editorEmail: string | null
}


interface JournalResponse {
  success: boolean
  data: JournalRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}


interface HistoryActor {
  userId: number | null
  login: string | null
  email: string | null
  authType: string | null
  display: string
}


interface HistoryItem {
  auditId: number
  action: string
  category: string | null
  result: string | null
  resourceKey: string | null
  timestamp: string
  actor: HistoryActor
  note: string | null
  changes: Record<string, unknown> | null
  legacy: unknown
  request: {
    requestId: string | null
    method: string | null
    route: string | null
  }
}


interface HistoryResponse {
  success: boolean

  event: {
    type: Exclude<JournalType, 'all'>
    entityType: string
    entityId: number
    label: string
  }

  summary: {
    totalEvents: number

    created: {
      timestamp: string
      actor: HistoryActor
    } | null

    updatesCount: number

    lastChange: {
      action: string
      timestamp: string
      actor: HistoryActor
    } | null

    deleted: {
      timestamp: string
      actor: HistoryActor
    } | null
  }

  history: HistoryItem[]
}


interface ChangeEntry {
  field: string
  before: unknown
  after: unknown
}


const {
  showTost,
} = useAppToasts()


const typeItems = [
  {
    value:
      'all' as const,

    label:
      'Все события',

    icon:
      'i-heroicons-list-bullet',
  },

  {
    value:
      'sampling' as const,

    label:
      'Отбор проб',

    icon:
      'i-heroicons-beaker',
  },

  {
    value:
      'receipt' as const,

    label:
      'Поступление материала',

    icon:
      'i-heroicons-truck',
  },

  {
    value:
      'protocol' as const,

    label:
      'Протоколы испытаний',

    icon:
      'i-heroicons-document-check',
  },
]


const filters =
  reactive({
    type:
      'all' as JournalType,

    search:
      '',

    actor:
      '',

    dateFrom:
      '',

    dateTo:
      '',
  })


const rows =
  ref<JournalRow[]>([])

const isLoading =
  ref(false)

const page =
  ref(1)

const pageSize =
  ref(25)

const total =
  ref(0)

const totalPages =
  ref(1)


const selectedRow =
  ref<JournalRow | null>(
    null,
  )

const isHistoryOpen =
  ref(false)

const isLoadingHistory =
  ref(false)

const historyResponse =
  ref<HistoryResponse | null>(
    null,
  )


const currentEventDetails =
  computed(
    () => {
      const row =
        selectedRow.value

      if (!row) {
        return []
      }

      const details:
        Array<{
          label: string
          value: string
        }> = []


      const add = (
        label: string,
        value:
          | string
          | null
          | undefined,
      ) => {
        if (
          value !== null &&
          value !== undefined &&
          value !== ''
        ) {
          details.push({
            label,
            value,
          })
        }
      }


      switch (
        row.eventType
      ) {
        case 'sampling':
          add(
            'Номер акта',
            row.samplingActNumber,
          )

          add(
            'Дата отбора',
            formatBusinessDate(
              row.businessDate,
            ),
          )

          add(
            'Объект',
            row.objectName,
          )

          add(
            'Место отбора',
            row.locationName,
          )

          add(
            'ПЛП',
            row.plpName,
          )

          add(
            'Лицо, предоставившее пробу',
            row.inspectorName,
          )

          break


        case 'receipt':
          add(
            'Материал',
            row.materialName,
          )

          add(
            'Дата поступления',
            formatBusinessDate(
              row.businessDate,
            ),
          )

          add(
            'Производитель',
            row.manufacturerName,
          )

          add(
            'Номер акта отбора',
            row.samplingActNumber,
          )

          add(
            'Объект',
            row.objectName,
          )

          add(
            'Место отбора',
            row.locationName,
          )

          break


        case 'protocol':
          add(
            'Номер протокола',
            row.protocolNumber,
          )

          add(
            'Дата протокола',
            formatBusinessDate(
              row.businessDate,
            ),
          )

          add(
            'Результат испытаний',
            row.testResult,
          )

          add(
            'Материал',
            row.materialName,
          )

          add(
            'Производитель',
            row.manufacturerName,
          )

          add(
            'Номер акта отбора',
            row.samplingActNumber,
          )

          add(
            'Объект',
            row.objectName,
          )

          break
      }


      add(
        'Создано',
        formatDateTime(
          row.createdAt,
        ),
      )

      add(
        'Автор',
        row.authorEmail,
      )

      if (
        row.editedAt
      ) {
        add(
          'Последнее изменение',
          formatDateTime(
            row.editedAt,
          ),
        )

        add(
          'Редактор',
          row.editorEmail,
        )
      }


      return details
    },
  )


const hasFilters =
  computed(
    () =>
      filters.type !==
        'all' ||
      !!filters.search ||
      !!filters.actor ||
      !!filters.dateFrom ||
      !!filters.dateTo,
  )


function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const value =
    error as {
      data?: {
        data?: {
          message?: string
        }

        message?: string
        statusMessage?: string
      }

      statusMessage?: string
      message?: string
    }

  return (
    value.data
      ?.data
      ?.message ||
    value.data
      ?.message ||
    value.data
      ?.statusMessage ||
    value.statusMessage ||
    value.message ||
    fallback
  )
}


async function loadJournal() {
  isLoading.value =
    true

  try {
    const response =
      await $fetch<JournalResponse>(
        '/api/lab/event-journal',
        {
          query: {
            type:
              filters.type,

            search:
              filters.search ||
              undefined,

            actor:
              filters.actor ||
              undefined,

            dateFrom:
              filters.dateFrom ||
              undefined,

            dateTo:
              filters.dateTo ||
              undefined,

            page:
              page.value,

            pageSize:
              pageSize.value,
          },
        },
      )


    rows.value =
      response.data ?? []

    total.value =
      response.total ?? 0

    totalPages.value =
      Math.max(
        1,
        response.totalPages ??
        1,
      )

  } catch (error) {
    console.error(
      'Ошибка загрузки журнала лабораторных событий:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить журнал лабораторных событий',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isLoading.value =
      false
  }
}


function selectType(
  value: JournalType,
) {
  if (
    filters.type === value
  ) {
    return
  }

  filters.type =
    value

  page.value =
    1

  void loadJournal()
}


function resetFilters() {
  Object.assign(
    filters,
    {
      type:
        'all',

      search:
        '',

      actor:
        '',

      dateFrom:
        '',

      dateTo:
        '',
    },
  )

  page.value =
    1

  void loadJournal()
}


function previousPage() {
  if (page.value <= 1) {
    return
  }

  page.value--

  void loadJournal()
}


function nextPage() {
  if (
    page.value >=
    totalPages.value
  ) {
    return
  }

  page.value++

  void loadJournal()
}


async function openHistory(
  row: JournalRow,
) {
  selectedRow.value =
    row

  isHistoryOpen.value =
    true

  historyResponse.value =
    null

  isLoadingHistory.value =
    true

  try {
    historyResponse.value =
      await $fetch<HistoryResponse>(
        `/api/lab/event-journal/${row.eventType}/${row.entityId}/history`,
      )

  } catch (error) {
    console.error(
      'Ошибка загрузки истории события:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить историю события',
      ),
      'error',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isLoadingHistory.value =
      false
  }
}


function closeHistory() {
  isHistoryOpen.value =
    false

  selectedRow.value =
    null

  historyResponse.value =
    null
}


function formatBusinessDate(
  value:
    string | null,
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
    return '—'
  }

  return date
    .toLocaleDateString(
      'ru-RU',
    )
}


function formatDateTime(
  value:
    string | null,
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
    return '—'
  }

  return date
    .toLocaleString(
      'ru-RU',
      {
        day:
          '2-digit',

        month:
          '2-digit',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',
      },
    )
}


function shortActor(
  value:
    string | null,
): string {
  if (!value) {
    return '—'
  }

  const at =
    value.indexOf('@')

  if (at > 0) {
    return value.slice(
      0,
      at,
    )
  }

  return value
}


function eventLabel(
  type:
    JournalRow['eventType'],
): string {
  switch (type) {
    case 'sampling':
      return 'Отбор проб'

    case 'receipt':
      return 'Поступление'

    case 'protocol':
      return 'Протокол'
  }
}


function eventIcon(
  type:
    JournalRow['eventType'],
): string {
  switch (type) {
    case 'sampling':
      return 'i-heroicons-beaker'

    case 'receipt':
      return 'i-heroicons-truck'

    case 'protocol':
      return 'i-heroicons-document-check'
  }
}


function eventIconClass(
  type:
    JournalRow['eventType'],
): string {
  return `event-icon--${type}`
}


function actionLabel(
  action: string,
): string {
  switch (
    action.toUpperCase()
  ) {
    case 'CREATE':
      return 'Создание'

    case 'UPDATE':
      return 'Изменение'

    case 'DELETE':
      return 'Удаление'

    default:
      return action
  }
}


function actionBadgeClass(
  action: string,
): string {
  return (
    `action-badge--${
      action.toLowerCase()
    }`
  )
}


function timelineDotClass(
  action: string,
): string {
  return (
    `timeline-dot--${
      action.toLowerCase()
    }`
  )
}


function changeEntries(
  item: HistoryItem,
): ChangeEntry[] {
  if (
    !item.changes ||
    typeof item.changes !==
      'object' ||
    Array.isArray(
      item.changes,
    )
  ) {
    return []
  }


  return Object.entries(
    item.changes,
  )
    .map(
      (
        [
          field,
          rawValue,
        ],
      ) => {
        if (
          rawValue &&
          typeof rawValue ===
            'object' &&
          !Array.isArray(
            rawValue,
          )
        ) {
          const pair =
            rawValue as {
              before?: unknown
              after?: unknown
            }

          return {
            field,
            before:
              pair.before,

            after:
              pair.after,
          }
        }


        return {
          field,
          before:
            null,

          after:
            rawValue,
        }
      },
    )
}


const FIELD_LABELS:
  Record<
    string,
    string
  > = {
    samplingActNumber:
      'Номер акта',

    samplingDate:
      'Дата отбора',

    samplingDocumentPath:
      'Документ отбора',

    note:
      'Примечание',

    plpId:
      'ПЛП (ссылка на справочник)',

    inspectorId:
      'Лицо, предоставившее пробу (ссылка)',

    testLocationId:
      'Место отбора (ссылка)',

    receiptMaterialId:
      'Поступление материала (ссылка)',

    receiptDate:
      'Дата поступления',

    qualityDocumentDate:
      'Дата документа о качестве',

    qualityDocumentNumber:
      'Номер документа о качестве',

    qualityDocumentPath:
      'Документ о качестве',

    materialId:
      'Материал (ссылка на справочник)',

    manufacturerId:
      'Производитель (ссылка на справочник)',

    protocolNumber:
      'Номер протокола',

    protocolDate:
      'Дата протокола',

    protocolDocumentPath:
      'Документ протокола',

    testResult:
      'Результат испытаний',

    deletedAt:
      'Дата удаления',

    deletedBy:
      'Кем удалено',
  }


function fieldLabel(
  field: string,
): string {
  return (
    FIELD_LABELS[field] ||
    field
  )
}


function displayValue(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return '—'
  }


  if (
    typeof value ===
      'string'
  ) {
    const date =
      new Date(value)

    if (
      /^\d{4}-\d{2}-\d{2}T/.test(
        value,
      ) &&
      !Number.isNaN(
        date.getTime(),
      )
    ) {
      return formatDateTime(
        value,
      )
    }

    return value
  }


  if (
    typeof value ===
      'object'
  ) {
    try {
      return JSON.stringify(
        value,
      )
    } catch {
      return String(value)
    }
  }


  return String(value)
}


function prettyJson(
  value: unknown,
): string {
  try {
    return JSON.stringify(
      value,
      null,
      2,
    )
  } catch {
    return String(value)
  }
}


let searchTimer:
  ReturnType<
    typeof setTimeout
  > | null = null


watch(
  [
    () =>
      filters.search,

    () =>
      filters.actor,

    () =>
      filters.dateFrom,

    () =>
      filters.dateTo,
  ],

  () => {
    if (searchTimer) {
      clearTimeout(
        searchTimer,
      )
    }

    searchTimer =
      setTimeout(
        () => {
          page.value =
            1

          void loadJournal()
        },
        350,
      )
  },
)


onMounted(
  () => {
    void loadJournal()
  },
)
</script>


<style scoped>
.journal-page {
  position: absolute;
  inset: 0;
  min-width: 0;
  overflow: hidden;
}

.journal-card {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px 20px;
  overflow: hidden;
  background: #fff;
  border-radius: 14px;
  box-shadow:
    0 10px 30px
    rgb(15 23 42 / 8%);
}

.journal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.eyebrow {
  margin: 0 0 4px;
  font-size: 11px;
  font-weight: 750;
  letter-spacing: 0.065em;
  color: #64748b;
  text-transform: uppercase;
}

.journal-title {
  margin: 0;
  font-size: 28px;
  line-height: 1.15;
  font-weight: 760;
  color: #0f172a;
}

.journal-subtitle {
  margin: 5px 0 0;
  font-size: 13px;
  color: #64748b;
}

.journal-counter {
  flex: 0 0 auto;
  padding: 7px 10px;
  font-size: 12px;
  color: #475569;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.type-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 16px;
}

.type-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 11px;
  font-size: 12px;
  font-weight: 650;
  color: #475569;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  transition:
    background-color 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease;
}

.type-tab:hover {
  color: #0369a1;
  background: #f0f9ff;
  border-color: #7dd3fc;
}

.type-tab--active {
  color: #075985;
  background: #e0f2fe;
  border-color: #38bdf8;
}

.filters {
  display: grid;
  grid-template-columns:
    minmax(320px, 1fr)
    minmax(170px, 260px)
    155px
    155px
    auto;
  gap: 8px;
  margin-top: 12px;
  margin-bottom: 10px;
}

.search-field {
  position: relative;
  min-width: 0;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 11px;
  color: #94a3b8;
  transform: translateY(-50%);
}

.filter-input {
  width: 100%;
  min-width: 0;
  height: 37px;
  padding: 0 10px;
  font-size: 12px;
  color: #0f172a;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
}

.filter-input--search {
  padding-left: 34px;
}

.filter-input:focus {
  border-color: #0ea5e9;
  box-shadow:
    0 0 0 3px
    rgb(14 165 233 / 10%);
}

.table-shell {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.journal-table {
  width: 100%;
  min-width: 1180px;
  border-collapse: collapse;
}

.journal-table th {
  position: sticky;
  top: 0;
  z-index: 3;
  padding: 10px 12px;
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 0.045em;
  color: #64748b;
  text-align: left;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.journal-table td {
  padding: 10px 12px;
  font-size: 12px;
  color: #334155;
  vertical-align: middle;
  border-bottom: 1px solid #eef2f7;
}

.journal-row {
  transition:
    background-color 0.15s ease;
}

.journal-row:hover {
  background: #f8fbff;
}

.event-kind {
  display: flex;
  align-items: center;
  gap: 8px;
}

.event-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 33px;
  height: 33px;
  border-radius: 8px;
}

.event-icon--sampling {
  color: #0369a1;
  background: #e0f2fe;
}

.event-icon--receipt {
  color: #92400e;
  background: #fef3c7;
}

.event-icon--protocol {
  color: #166534;
  background: #dcfce7;
}

.event-label {
  font-weight: 700;
  color: #0f172a;
}

.entity-id {
  margin-top: 1px;
  font-size: 10px;
  color: #94a3b8;
}

.event-title {
  max-width: 380px;
  overflow: hidden;
  font-weight: 650;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-subtitle {
  max-width: 420px;
  margin-top: 2px;
  overflow: hidden;
  font-size: 11px;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-cell {
  white-space: nowrap;
}

.actor {
  display: inline-block;
  max-width: 170px;
  overflow: hidden;
  font-weight: 600;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.muted {
  color: #94a3b8;
}

.history-column {
  width: 70px;
  text-align: center !important;
}

.history-cell {
  text-align: center;
}

.history-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 31px;
  height: 31px;
  color: #0369a1;
  background: #f0f9ff;
  border-radius: 7px;
}

.history-button:hover {
  background: #e0f2fe;
}

.empty-cell {
  padding: 52px 16px !important;
  color: #94a3b8 !important;
  text-align: center !important;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 230px;
  gap: 10px;
  color: #64748b;
}

.spinner {
  width: 27px;
  height: 27px;
  border: 3px solid #e2e8f0;
  border-bottom-color: #0284c7;
  border-radius: 999px;
  animation:
    spin 0.8s linear infinite;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
}

.pagination-info,
.page-indicator {
  font-size: 11px;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 7px;
}

/* ==========================================================
 * HISTORY MODAL
 * ========================================================== */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background:
    rgb(15 23 42 / 44%);
  backdrop-filter:
    blur(2px);
}

.history-modal {
  display: flex;
  flex-direction: column;
  width:
    min(
      94vw,
      1100px
    );
  max-height: 92vh;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow:
    0 26px 80px
    rgb(15 23 42 / 28%);
}

.history-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex: 0 0 auto;
  gap: 16px;
  padding: 18px 20px 14px;
  border-bottom: 1px solid #e2e8f0;
}

.history-title {
  margin: 0;
  overflow-wrap: anywhere;
  font-size: 21px;
  font-weight: 760;
  color: #0f172a;
}

.history-subtitle {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: #64748b;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  color: #64748b;
  border-radius: 8px;
}

.modal-close:hover {
  color: #0f172a;
  background: #f1f5f9;
}

.history-loading {
  min-height: 360px;
}

.history-summary {
  display: grid;
  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );
  flex: 0 0 auto;
  gap: 9px;
  padding: 12px 20px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.summary-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 9px 11px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.summary-label {
  margin-bottom: 3px;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.05em;
  color: #94a3b8;
  text-transform: uppercase;
}

.summary-card strong {
  overflow: hidden;
  font-size: 12px;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-actor {
  margin-top: 2px;
  overflow: hidden;
  font-size: 10px;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-state {
  flex: 0 0 auto;
  padding: 14px 20px;
  background: #fff;
  border-bottom: 1px solid #e2e8f0;
}

.current-state-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.current-state-title {
  margin: 0;
  font-size: 15px;
  font-weight: 760;
  color: #0f172a;
}

.registry-reference {
  flex: 0 0 auto;
  padding: 5px 8px;
  font-size: 10px;
  font-weight: 700;
  color: #075985;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 7px;
}

.current-state-grid {
  display: grid;
  grid-template-columns:
    repeat(
      3,
      minmax(0, 1fr)
    );
  gap: 8px;
}

.current-detail {
  min-width: 0;
  padding: 8px 9px;
  background: #f8fafc;
  border: 1px solid #eef2f7;
  border-radius: 7px;
}

.current-detail-label {
  display: block;
  margin-bottom: 3px;
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: #94a3b8;
  text-transform: uppercase;
}

.current-detail-value {
  display: block;
  overflow: hidden;
  font-size: 11px;
  font-weight: 600;
  color: #334155;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-note {
  margin-top: 8px;
  padding: 8px 9px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 7px;
}

.current-note-value {
  display: block;
  font-size: 11px;
  line-height: 1.45;
  color: #78350f;
}

.history-list {
  flex: 1;
  min-height: 0;
  padding: 16px 20px 20px;
  overflow-y: auto;
}

.history-item {
  display: grid;
  grid-template-columns:
    24px
    minmax(0, 1fr);
  gap: 10px;
}

.timeline-column {
  position: relative;
  display: flex;
  justify-content: center;
}

.timeline-dot {
  position: relative;
  z-index: 2;
  width: 11px;
  height: 11px;
  margin-top: 7px;
  background: #94a3b8;
  border: 2px solid #fff;
  border-radius: 999px;
  box-shadow:
    0 0 0 2px #cbd5e1;
}

.timeline-dot--create {
  background: #16a34a;
  box-shadow:
    0 0 0 2px #bbf7d0;
}

.timeline-dot--update {
  background: #0284c7;
  box-shadow:
    0 0 0 2px #bae6fd;
}

.timeline-dot--delete {
  background: #dc2626;
  box-shadow:
    0 0 0 2px #fecaca;
}

.timeline-line {
  position: absolute;
  top: 18px;
  bottom: -7px;
  width: 2px;
  background: #e2e8f0;
}

.history-item:last-child
.timeline-line {
  display: none;
}

.history-content {
  min-width: 0;
  margin-bottom: 14px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}

.history-item-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.action-badge {
  display: inline-flex;
  padding: 3px 7px;
  font-size: 10px;
  font-weight: 750;
  border-radius: 999px;
}

.action-badge--create {
  color: #166534;
  background: #dcfce7;
}

.action-badge--update {
  color: #075985;
  background: #e0f2fe;
}

.action-badge--delete {
  color: #991b1b;
  background: #fee2e2;
}

.history-date {
  margin-left: 7px;
  font-size: 10px;
  color: #64748b;
}

.history-actor {
  max-width: 260px;
  overflow: hidden;
  font-size: 11px;
  font-weight: 650;
  color: #475569;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-note {
  margin: 7px 0 0;
  font-size: 11px;
  line-height: 1.4;
  color: #475569;
}

.changes-table {
  margin-top: 9px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 7px;
}

.changes-head,
.changes-row {
  display: grid;
  grid-template-columns:
    minmax(140px, 0.8fr)
    minmax(0, 1fr)
    minmax(0, 1fr);
}

.changes-head {
  font-size: 9px;
  font-weight: 750;
  letter-spacing: 0.04em;
  color: #64748b;
  text-transform: uppercase;
  background: #f8fafc;
}

.changes-head span,
.changes-row span {
  min-width: 0;
  padding: 6px 8px;
  overflow-wrap: anywhere;
  border-right: 1px solid #e2e8f0;
}

.changes-head span:last-child,
.changes-row span:last-child {
  border-right: 0;
}

.changes-row {
  font-size: 10px;
  color: #475569;
  border-top: 1px solid #e2e8f0;
}

.change-field {
  font-weight: 650;
  color: #334155;
}

.change-before {
  color: #991b1b;
  background: #fffafa;
}

.change-after {
  color: #166534;
  background: #f8fff9;
}

.legacy-details {
  margin-top: 8px;
  font-size: 10px;
  color: #64748b;
}

.legacy-details summary {
  cursor: pointer;
  font-weight: 650;
}

.legacy-details pre {
  max-height: 260px;
  margin-top: 6px;
  padding: 8px;
  overflow: auto;
  font-size: 9px;
  white-space: pre-wrap;
  background: #f8fafc;
  border-radius: 6px;
}

.empty-history {
  padding: 50px 12px;
  color: #94a3b8;
  text-align: center;
}

@keyframes spin {
  to {
    transform:
      rotate(360deg);
  }
}

@media (max-width: 1200px) {
  .filters {
    grid-template-columns:
      minmax(300px, 1fr)
      minmax(160px, 220px)
      145px
      145px;

    grid-template-areas:
      "search actor from to"
      "reset reset reset reset";
  }

  .search-field {
    grid-area:
      search;
  }

  .filters > input:nth-of-type(1) {
    grid-area:
      actor;
  }

  .filters > input:nth-of-type(2) {
    grid-area:
      from;
  }

  .filters > input:nth-of-type(3) {
    grid-area:
      to;
  }

  .filters > button {
    grid-area:
      reset;
    justify-self:
      end;
  }
}

@media (max-width: 850px) {
  .journal-card {
    padding: 14px;
  }

  .journal-header {
    flex-direction: column;
    gap: 10px;
  }

  .filters {
    display: flex;
    flex-direction: column;
  }

  .history-summary {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .current-state-grid {
    grid-template-columns:
      minmax(0, 1fr);
  }

  .history-item-head {
    align-items: flex-start;
    flex-direction: column;
    gap: 5px;
  }

  .changes-head,
  .changes-row {
    grid-template-columns:
      minmax(100px, 0.7fr)
      minmax(0, 1fr)
      minmax(0, 1fr);
  }

  .pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
