<template>
  <div class="objects-page">
    <!-- ====================================================== -->
    <!-- СПИСОК ОБЪЕКТОВ                                       -->
    <!-- ====================================================== -->
    <section
      v-if="viewMode === 'list'"
      class="page-card"
    >
      <header class="page-header">
        <div>
          <p class="eyebrow">
            Лабораторный контроль
          </p>

          <h1 class="page-title">
            Объекты отбора проб
          </h1>

          <p class="page-subtitle">
            Выберите объект, чтобы открыть его карточку и места отбора проб.
          </p>
        </div>

        <UButton
          label="Добавить объект"
          icon="i-heroicons-plus"
          color="primary"
          @click="openCreateObjectModal"
        />
      </header>


      <div class="toolbar">
        <div class="search-box">
          <Icon
            name="i-heroicons-magnifying-glass"
            class="search-icon"
          />

          <input
            v-model="objectSearch"
            type="text"
            placeholder="Поиск по рабочему, полному названию или примечанию..."
            class="search-input"
          >
        </div>

        <div class="toolbar-note">
          Всего объектов:
          <strong>{{ totalObjectsCount }}</strong>
        </div>
      </div>


      <div class="table-card">
        <div
          v-if="isLoadingObjects"
          class="loading-state"
        >
          <div class="spinner" />
          <span>Загрузка объектов...</span>
        </div>

        <table
          v-else
          class="data-table"
        >
          <thead>
            <tr>
              <th
                class="sortable"
                @click="sortObjectsBy('name')"
              >
                <span class="header-label">
                  Рабочее название
                  <span v-if="objectSortKey === 'name'">
                    {{ objectSortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </span>
              </th>

              <th
                class="sortable"
                @click="sortObjectsBy('fullName')"
              >
                <span class="header-label">
                  Полное название
                  <span v-if="objectSortKey === 'fullName'">
                    {{ objectSortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </span>
              </th>

              <th>
                Места отбора
              </th>

              <th class="actions-column">
                Действия
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="objects.length === 0">
              <td
                colspan="4"
                class="empty-cell"
              >
                Объекты не найдены
              </td>
            </tr>

            <tr
              v-for="object in objects"
              :key="object.id"
              class="object-row"
              @dblclick="openObjectCard(object)"
            >
              <td>
                <button
                  type="button"
                  class="object-link"
                  @click="openObjectCard(object)"
                >
                  {{ object.name }}
                </button>

                <div
                  v-if="object.note"
                  class="row-note"
                  :title="object.note"
                >
                  {{ object.note }}
                </div>
              </td>

              <td>
                <span
                  v-if="object.fullName"
                  class="full-name"
                  :title="object.fullName"
                >
                  {{ object.fullName }}
                </span>

                <span
                  v-else
                  class="muted"
                >
                  Не заполнено
                </span>
              </td>

              <td>
                <button
                  type="button"
                  class="location-count"
                  @click="openObjectCard(object)"
                >
                  <Icon
                    name="i-heroicons-map-pin"
                    size="16"
                  />

                  {{ object._count?.locations ?? 0 }}
                  {{ pluralizePlaces(object._count?.locations ?? 0) }}

                  <Icon
                    name="i-heroicons-chevron-right"
                    size="14"
                  />
                </button>
              </td>

              <td class="actions-cell">
                <button
                  type="button"
                  class="icon-button icon-button--edit"
                  title="Редактировать объект"
                  @click.stop="openEditObjectModal(object)"
                >
                  <Icon
                    name="i-heroicons-pencil-square"
                    size="18"
                  />
                </button>

                <button
                  type="button"
                  class="icon-button icon-button--delete"
                  title="Удалить объект"
                  @click.stop="deleteObject(object)"
                >
                  <Icon
                    name="i-heroicons-trash"
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
          <template v-if="totalObjectsCount > 0">
            Показано
            {{ (objectPage - 1) * objectPageSize + 1 }}
            –
            {{ Math.min(objectPage * objectPageSize, totalObjectsCount) }}
            из {{ totalObjectsCount }}
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
            :disabled="objectPage <= 1 || isLoadingObjects"
            @click="previousObjectPage"
          />

          <span class="page-indicator">
            {{ objectPage }} / {{ objectTotalPages }}
          </span>

          <UButton
            label="Вперёд"
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="
              objectPage >= objectTotalPages ||
              isLoadingObjects
            "
            @click="nextObjectPage"
          />
        </div>
      </footer>
    </section>


    <!-- ====================================================== -->
    <!-- КАРТОЧКА ОБЪЕКТА                                       -->
    <!-- ====================================================== -->
    <section
      v-else
      class="page-card"
    >
      <div class="breadcrumbs">
        <button
          type="button"
          class="back-link"
          @click="backToObjects"
        >
          <Icon
            name="i-heroicons-arrow-left"
            size="17"
          />
          Объекты
        </button>

        <span class="breadcrumb-separator">
          /
        </span>

        <span class="breadcrumb-current">
          {{ selectedObject?.name ?? 'Объект' }}
        </span>
      </div>


      <div
        v-if="selectedObject"
        class="object-summary"
      >
        <div class="summary-main">
          <div class="summary-icon">
            <Icon
              name="i-heroicons-building-office-2"
              size="25"
            />
          </div>

          <div class="min-w-0">
            <p class="summary-caption">
              Объект отбора проб
            </p>

            <h1 class="summary-title">
              {{ selectedObject.name }}
            </h1>

            <p
              v-if="selectedObject.fullName"
              class="summary-full-name"
            >
              {{ selectedObject.fullName }}
            </p>

            <p
              v-else
              class="summary-full-name summary-full-name--empty"
            >
              Полное название не заполнено
            </p>
          </div>
        </div>

        <div class="summary-actions">
          <UButton
            label="Редактировать объект"
            icon="i-heroicons-pencil-square"
            color="neutral"
            variant="outline"
            @click="openEditObjectModal(selectedObject)"
          />

          <UButton
            label="Удалить"
            icon="i-heroicons-trash"
            color="error"
            variant="outline"
            @click="deleteObject(selectedObject)"
          />
        </div>
      </div>


      <div
        v-if="selectedObject"
        class="object-meta"
      >
        <div class="meta-item">
          <span class="meta-label">
            Примечание
          </span>

          <span class="meta-value">
            {{ selectedObject.note || '—' }}
          </span>
        </div>

        <div class="meta-item">
          <span class="meta-label">
            Мест отбора
          </span>

          <span class="meta-value">
            {{ totalLocationsCount }}
          </span>
        </div>
      </div>


      <div class="section-header">
        <div>
          <h2 class="section-title">
            Места отбора проб
          </h2>

          <p class="section-subtitle">
            Все места относятся к открытому объекту.
          </p>
        </div>

        <UButton
          label="Добавить место"
          icon="i-heroicons-plus"
          color="primary"
          :disabled="!selectedObject"
          @click="openAddLocationModal"
        />
      </div>


      <div class="toolbar toolbar--compact">
        <div class="search-box">
          <Icon
            name="i-heroicons-magnifying-glass"
            class="search-icon"
          />

          <input
            v-model="locationSearch"
            type="text"
            placeholder="Поиск по названию или примечанию..."
            class="search-input"
            :disabled="!selectedObject"
          >
        </div>

        <div class="toolbar-note">
          Показано мест:
          <strong>{{ totalLocationsCount }}</strong>
        </div>
      </div>


      <div class="table-card table-card--locations">
        <div
          v-if="isLoadingLocations"
          class="loading-state"
        >
          <div class="spinner" />
          <span>Загрузка мест...</span>
        </div>

        <table
          v-else
          class="data-table"
        >
          <thead>
            <tr>
              <th
                class="sortable"
                @click="sortLocationsBy('name')"
              >
                <span class="header-label">
                  Название места
                  <span v-if="locationSortKey === 'name'">
                    {{ locationSortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </span>
              </th>

              <th
                class="sortable"
                @click="sortLocationsBy('note')"
              >
                <span class="header-label">
                  Примечание
                  <span v-if="locationSortKey === 'note'">
                    {{ locationSortOrder === 'asc' ? '↑' : '↓' }}
                  </span>
                </span>
              </th>

              <th>
                Отборов
              </th>

              <th class="actions-column">
                Действия
              </th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="locations.length === 0">
              <td
                colspan="4"
                class="empty-cell"
              >
                У этого объекта пока нет мест отбора
              </td>
            </tr>

            <tr
              v-for="location in locations"
              :key="location.id"
            >
              <td class="location-name">
                {{ location.name }}
              </td>

              <td>
                <span
                  v-if="location.note"
                  :title="location.note"
                >
                  {{ location.note }}
                </span>

                <span
                  v-else
                  class="muted"
                >
                  —
                </span>
              </td>

              <td>
                <span class="sampling-count">
                  {{ location._count?.samplingTests ?? 0 }}
                  {{ pluralizeSamplings(location._count?.samplingTests ?? 0) }}
                </span>
              </td>

              <td class="actions-cell">
                <button
                  type="button"
                  class="icon-button icon-button--edit"
                  title="Редактировать место"
                  @click="editLocation(location)"
                >
                  <Icon
                    name="i-heroicons-pencil-square"
                    size="18"
                  />
                </button>

                <button
                  type="button"
                  class="icon-button icon-button--delete"
                  title="Удалить место"
                  @click="deleteLocation(location)"
                >
                  <Icon
                    name="i-heroicons-trash"
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
          <template v-if="totalLocationsCount > 0">
            Показано
            {{ (locationPage - 1) * locationPageSize + 1 }}
            –
            {{
              Math.min(
                locationPage * locationPageSize,
                totalLocationsCount,
              )
            }}
            из {{ totalLocationsCount }}
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
            :disabled="locationPage <= 1 || isLoadingLocations"
            @click="previousLocationPage"
          />

          <span class="page-indicator">
            {{ locationPage }} / {{ locationTotalPages }}
          </span>

          <UButton
            label="Вперёд"
            size="sm"
            color="neutral"
            variant="outline"
            :disabled="
              locationPage >= locationTotalPages ||
              isLoadingLocations
            "
            @click="nextLocationPage"
          />
        </div>
      </footer>
    </section>


    <!-- ====================================================== -->
    <!-- МОДАЛКА ОБЪЕКТА                                        -->
    <!-- ====================================================== -->
    <Teleport to="body">
      <div
        v-if="isObjectModalOpen"
        class="modal-overlay"
        @mousedown.self="closeObjectModal"
      >
        <div
          class="custom-modal custom-modal--object"
          role="dialog"
          aria-modal="true"
        >
          <div class="modal-header">
            <div>
              <p class="modal-caption">
                {{
                  isEditingObject
                    ? 'Изменение объекта'
                    : 'Новый объект'
                }}
              </p>

              <h3 class="modal-title">
                {{
                  isEditingObject
                    ? currentObject.name || 'Объект'
                    : 'Добавление объекта'
                }}
              </h3>
            </div>

            <button
              type="button"
              class="modal-close"
              title="Закрыть"
              @click="closeObjectModal"
            >
              <Icon
                name="i-heroicons-x-mark"
                size="20"
              />
            </button>
          </div>

          <form
            class="modal-form"
            @submit.prevent="saveObject"
          >
            <label class="field">
              <span class="field-label">
                Рабочее название
                <span class="required">*</span>
              </span>

              <input
                v-model="currentObject.name"
                type="text"
                required
                class="field-input"
                placeholder="Краткое рабочее название объекта"
              >
            </label>


            <label class="field">
              <span class="field-label">
                Полное название
              </span>

              <textarea
                v-model="currentObject.fullName"
                rows="3"
                class="field-input field-textarea"
                placeholder="Полное официальное название объекта"
              />
            </label>


            <label class="field">
              <span class="field-label">
                Примечание
              </span>

              <textarea
                v-model="currentObject.note"
                rows="3"
                class="field-input field-textarea"
                placeholder="Дополнительная информация"
              />
            </label>


            <div class="modal-actions">
              <UButton
                label="Отмена"
                color="neutral"
                variant="outline"
                type="button"
                @click="closeObjectModal"
              />

              <UButton
                :label="
                  isEditingObject
                    ? 'Сохранить изменения'
                    : 'Создать объект'
                "
                color="primary"
                type="submit"
                :loading="isSavingObject"
              />
            </div>
          </form>
        </div>
      </div>
    </Teleport>


    <!-- ====================================================== -->
    <!-- МОДАЛКА МЕСТА                                          -->
    <!-- ====================================================== -->
    <Teleport to="body">
      <div
        v-if="isLocationModalOpen"
        class="modal-overlay"
        @mousedown.self="closeLocationModal"
      >
        <div
          class="custom-modal custom-modal--location"
          role="dialog"
          aria-modal="true"
        >
          <div class="modal-header">
            <div>
              <p class="modal-caption">
                Место отбора проб
              </p>

              <h3 class="modal-title">
                {{
                  isEditingLocation
                    ? 'Редактирование места'
                    : 'Добавление места'
                }}
              </h3>
            </div>

            <button
              type="button"
              class="modal-close"
              title="Закрыть"
              @click="closeLocationModal"
            >
              <Icon
                name="i-heroicons-x-mark"
                size="20"
              />
            </button>
          </div>

          <form
            class="modal-form"
            @submit.prevent="saveLocation"
          >
            <div class="object-lock">
              <span class="object-lock-label">
                Объект
              </span>

              <strong>
                {{ selectedObject?.name ?? '—' }}
              </strong>

              <span
                v-if="selectedObject?.fullName"
                class="object-lock-full"
              >
                {{ selectedObject.fullName }}
              </span>
            </div>


            <label class="field">
              <span class="field-label">
                Название места
                <span class="required">*</span>
              </span>

              <input
                v-model="currentLocation.name"
                type="text"
                required
                class="field-input"
                placeholder="Например: ПК 3+50, ШАУК"
              >
            </label>


            <label class="field">
              <span class="field-label">
                Примечание
              </span>

              <textarea
                v-model="currentLocation.note"
                rows="3"
                class="field-input field-textarea"
                placeholder="Дополнительная информация"
              />
            </label>


            <div class="modal-actions">
              <UButton
                label="Отмена"
                color="neutral"
                variant="outline"
                type="button"
                @click="closeLocationModal"
              />

              <UButton
                :label="
                  isEditingLocation
                    ? 'Сохранить изменения'
                    : 'Добавить место'
                "
                color="primary"
                type="submit"
                :loading="isSavingLocation"
              />
            </div>
          </form>
        </div>
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


type SortOrder =
  | 'asc'
  | 'desc'


interface ObjectRow {
  id: number
  name: string
  fullName: string | null
  note: string | null

  _count?: {
    locations: number
  }
}


interface LocationRow {
  id: number
  name: string
  note: string | null
  testObjectId: number

  testObject?: {
    id: number
    name: string
    fullName?: string | null
  }

  _count?: {
    samplingTests: number
  }
}


interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  total: number
  page: number
  pageSize: number
}


interface MutationResponse<T> {
  success: boolean
  data: T
  message?: string
}


const {
  showTost,
} = useAppToasts()


const viewMode =
  ref<'list' | 'detail'>(
    'list',
  )


/* ========================================================== */
/* ОБЪЕКТЫ                                                   */
/* ========================================================== */

const objectSearch =
  ref('')

const objectSortKey =
  ref('name')

const objectSortOrder =
  ref<SortOrder>('asc')

const objectPage =
  ref(1)

const objectPageSize =
  ref(10)

const totalObjectsCount =
  ref(0)

const objects =
  ref<ObjectRow[]>([])

const selectedObject =
  ref<ObjectRow | null>(null)

const isLoadingObjects =
  ref(false)

const isSavingObject =
  ref(false)

const isObjectModalOpen =
  ref(false)

const isEditingObject =
  ref(false)


const currentObject =
  reactive({
    id:
      null as number | null,

    name:
      '',

    fullName:
      '',

    note:
      '',
  })


const objectTotalPages =
  computed(
    () =>
      Math.max(
        1,
        Math.ceil(
          totalObjectsCount.value /
          objectPageSize.value,
        ),
      ),
  )


async function loadObjects() {
  isLoadingObjects.value = true

  try {
    const response =
      await $fetch<
        PaginatedResponse<ObjectRow>
      >(
        '/api/lab/objects',
        {
          query: {
            page:
              objectPage.value,

            pageSize:
              objectPageSize.value,

            search:
              objectSearch.value,

            sortKey:
              objectSortKey.value,

            sortOrder:
              objectSortOrder.value,
          },
        },
      )


    if (response.success) {
      objects.value =
        response.data ?? []

      totalObjectsCount.value =
        Number(
          response.total,
        ) || 0


      /**
       * Если карточка объекта уже открыта и мы перечитали
       * именно его страницу, обновляем локальный экземпляр.
       */
      if (selectedObject.value) {
        const refreshed =
          objects.value.find(
            item =>
              item.id ===
              selectedObject.value
                ?.id,
          )

        if (refreshed) {
          selectedObject.value =
            refreshed
        }
      }
    }

  } catch (error) {
    console.error(
      'Ошибка загрузки объектов:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить объекты',
      ),
      'error',
      'fxemoji:warningsign',
      5000,
    )

  } finally {
    isLoadingObjects.value =
      false
  }
}


function sortObjectsBy(
  key: string,
) {
  if (
    objectSortKey.value ===
    key
  ) {
    objectSortOrder.value =
      objectSortOrder.value ===
        'asc'
        ? 'desc'
        : 'asc'
  } else {
    objectSortKey.value =
      key

    objectSortOrder.value =
      'asc'
  }

  objectPage.value =
    1

  void loadObjects()
}


function previousObjectPage() {
  if (objectPage.value <= 1) {
    return
  }

  objectPage.value--

  void loadObjects()
}


function nextObjectPage() {
  if (
    objectPage.value >=
    objectTotalPages.value
  ) {
    return
  }

  objectPage.value++

  void loadObjects()
}


async function openObjectCard(
  object: ObjectRow,
) {
  selectedObject.value =
    object

  viewMode.value =
    'detail'

  locationPage.value =
    1

  locationSearch.value =
    ''

  await loadLocations(
    object.id,
  )
}


function backToObjects() {
  viewMode.value =
    'list'

  /**
   * selectedObject намеренно не обнуляем:
   * если пользователь снова откроет этот объект,
   * состояние остаётся предсказуемым.
   */
}


function openCreateObjectModal() {
  resetObjectForm()

  isObjectModalOpen.value =
    true
}


function openEditObjectModal(
  object: ObjectRow,
) {
  Object.assign(
    currentObject,
    {
      id:
        object.id,

      name:
        object.name,

      fullName:
        object.fullName ?? '',

      note:
        object.note ?? '',
    },
  )

  isEditingObject.value =
    true

  isObjectModalOpen.value =
    true
}


async function saveObject() {
  const name =
    currentObject.name.trim()

  if (!name) {
    showTost(
      'Проверьте данные',
      'Название объекта обязательно для заполнения',
      'warning',
      'fxemoji:warningsign',
      5000,
    )

    return
  }


  isSavingObject.value =
    true

  try {
    const isEdit =
      currentObject.id !== null

    const url =
      isEdit
        ? `/api/lab/objects/${currentObject.id}`
        : '/api/lab/objects'

    const response =
      await $fetch<
        MutationResponse<ObjectRow>
      >(
        url,
        {
          method:
            isEdit
              ? 'PUT'
              : 'POST',

          body: {
            name,

            fullName:
              currentObject
                .fullName
                .trim() ||
              null,

            note:
              currentObject
                .note
                .trim() ||
              null,
          },
        },
      )


    if (!response.success) {
      return
    }


    /**
     * Главное исправление старого интерфейса:
     * после изменения названия открытая карточка сразу
     * получает свежие данные из ответа сервера.
     */
    if (
      selectedObject.value &&
      selectedObject.value.id ===
        response.data.id
    ) {
      selectedObject.value = {
        ...selectedObject.value,
        ...response.data,

        _count:
          selectedObject.value
            ._count,
      }
    }


    showTost(
      'Успех',
      isEdit
        ? 'Объект обновлён'
        : 'Объект создан',
      'success',
      'streamline-freehand-color:form-validation-check-double',
      3000,
    )


    closeObjectModal()

    await loadObjects()

  } catch (error) {
    console.error(
      'Ошибка сохранения объекта:',
      error,
    )

    showTost(
      'Не удалось сохранить объект',
      getApiErrorMessage(
        error,
        'Проверьте введённые данные',
      ),
      'warning',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isSavingObject.value =
      false
  }
}


async function deleteObject(
  object: ObjectRow,
) {
  const locationsCount =
    object._count?.locations ??
    0

  if (locationsCount > 0) {
    showTost(
      'Удаление невозможно',
      `У объекта есть действующие места отбора: ${locationsCount}.`,
      'warning',
      'fxemoji:warningsign',
      5000,
    )

    return
  }


  if (
    !confirm(
      `Удалить объект «${object.name}»?`,
    )
  ) {
    return
  }


  try {
    const response =
      await $fetch<{
        success: boolean
        message?: string
      }>(
        `/api/lab/objects/${object.id}`,
        {
          method:
            'DELETE',
        },
      )


    if (!response.success) {
      return
    }


    showTost(
      'Успех',
      'Объект удалён',
      'success',
      'streamline-freehand-color:form-validation-check-double',
      3000,
    )


    if (
      selectedObject.value
        ?.id ===
      object.id
    ) {
      selectedObject.value =
        null

      viewMode.value =
        'list'

      locations.value =
        []

      totalLocationsCount.value =
        0
    }


    await loadObjects()

  } catch (error) {
    console.error(
      'Ошибка удаления объекта:',
      error,
    )

    showTost(
      'Удаление невозможно',
      getApiErrorMessage(
        error,
        'Не удалось удалить объект',
      ),
      'warning',
      'fxemoji:warningsign',
      6000,
    )
  }
}


function resetObjectForm() {
  Object.assign(
    currentObject,
    {
      id: null,
      name: '',
      fullName: '',
      note: '',
    },
  )

  isEditingObject.value =
    false
}


function closeObjectModal() {
  isObjectModalOpen.value =
    false

  resetObjectForm()
}


/* ========================================================== */
/* МЕСТА ОТБОРА                                              */
/* ========================================================== */

const locationSearch =
  ref('')

const locationSortKey =
  ref('name')

const locationSortOrder =
  ref<SortOrder>('asc')

const locationPage =
  ref(1)

const locationPageSize =
  ref(10)

const totalLocationsCount =
  ref(0)

const locations =
  ref<LocationRow[]>([])

const isLoadingLocations =
  ref(false)

const isSavingLocation =
  ref(false)

const isLocationModalOpen =
  ref(false)

const isEditingLocation =
  ref(false)


const currentLocation =
  reactive({
    id:
      null as number | null,

    name:
      '',

    note:
      '',
  })


const locationTotalPages =
  computed(
    () =>
      Math.max(
        1,
        Math.ceil(
          totalLocationsCount.value /
          locationPageSize.value,
        ),
      ),
  )


async function loadLocations(
  objectId:
    number | null =
      selectedObject.value
        ?.id ??
      null,
) {
  if (!objectId) {
    locations.value =
      []

    totalLocationsCount.value =
      0

    return
  }


  isLoadingLocations.value =
    true

  try {
    const response =
      await $fetch<
        PaginatedResponse<LocationRow>
      >(
        '/api/lab/locations',
        {
          query: {
            testObjectId:
              objectId,

            page:
              locationPage.value,

            pageSize:
              locationPageSize.value,

            search:
              locationSearch.value,

            sortKey:
              locationSortKey.value,

            sortOrder:
              locationSortOrder.value,
          },
        },
      )


    if (response.success) {
      locations.value =
        response.data ?? []

      totalLocationsCount.value =
        Number(
          response.total,
        ) || 0


      if (
        selectedObject.value &&
        !locationSearch.value
      ) {
        selectedObject.value = {
          ...selectedObject.value,

          _count: {
            locations:
              totalLocationsCount.value,
          },
        }
      }
    }

  } catch (error) {
    console.error(
      'Ошибка загрузки мест:',
      error,
    )

    showTost(
      'Ошибка',
      getApiErrorMessage(
        error,
        'Не удалось загрузить места отбора',
      ),
      'error',
      'fxemoji:warningsign',
      5000,
    )

  } finally {
    isLoadingLocations.value =
      false
  }
}


function sortLocationsBy(
  key: string,
) {
  if (
    locationSortKey.value ===
    key
  ) {
    locationSortOrder.value =
      locationSortOrder.value ===
        'asc'
        ? 'desc'
        : 'asc'
  } else {
    locationSortKey.value =
      key

    locationSortOrder.value =
      'asc'
  }

  locationPage.value =
    1

  void loadLocations()
}


function previousLocationPage() {
  if (locationPage.value <= 1) {
    return
  }

  locationPage.value--

  void loadLocations()
}


function nextLocationPage() {
  if (
    locationPage.value >=
    locationTotalPages.value
  ) {
    return
  }

  locationPage.value++

  void loadLocations()
}


function openAddLocationModal() {
  if (!selectedObject.value) {
    return
  }

  resetLocationForm()

  isLocationModalOpen.value =
    true
}


function editLocation(
  location: LocationRow,
) {
  Object.assign(
    currentLocation,
    {
      id:
        location.id,

      name:
        location.name,

      note:
        location.note ??
        '',
    },
  )

  isEditingLocation.value =
    true

  isLocationModalOpen.value =
    true
}


async function saveLocation() {
  if (!selectedObject.value) {
    return
  }


  const name =
    currentLocation.name.trim()

  if (!name) {
    showTost(
      'Проверьте данные',
      'Название места обязательно для заполнения',
      'warning',
      'fxemoji:warningsign',
      5000,
    )

    return
  }


  isSavingLocation.value =
    true

  try {
    const isEdit =
      currentLocation.id !==
      null

    const url =
      isEdit
        ? `/api/lab/locations/${currentLocation.id}`
        : '/api/lab/locations'

    const response =
      await $fetch<
        MutationResponse<LocationRow>
      >(
        url,
        {
          method:
            isEdit
              ? 'PUT'
              : 'POST',

          body: {
            name,

            note:
              currentLocation
                .note
                .trim() ||
              null,

            testObjectId:
              selectedObject.value
                .id,
          },
        },
      )


    if (!response.success) {
      return
    }


    showTost(
      'Успех',
      isEdit
        ? 'Место обновлено'
        : 'Место добавлено',
      'success',
      'streamline-freehand-color:form-validation-check-double',
      3000,
    )


    closeLocationModal()

    await loadLocations()

    /**
     * Обновляем строку объекта и его счётчик,
     * сохраняя открытый detail view.
     */
    await loadObjects()

  } catch (error) {
    console.error(
      'Ошибка сохранения места:',
      error,
    )

    showTost(
      'Не удалось сохранить место',
      getApiErrorMessage(
        error,
        'Проверьте введённые данные',
      ),
      'warning',
      'fxemoji:warningsign',
      6000,
    )

  } finally {
    isSavingLocation.value =
      false
  }
}


async function deleteLocation(
  location: LocationRow,
) {
  const samplingTests =
    location._count
      ?.samplingTests ??
    0

  if (samplingTests > 0) {
    showTost(
      'Удаление невозможно',
      `Место используется в действующих отборах: ${samplingTests}.`,
      'warning',
      'fxemoji:warningsign',
      5000,
    )

    return
  }


  if (
    !confirm(
      `Удалить место «${location.name}»?`,
    )
  ) {
    return
  }


  try {
    const response =
      await $fetch<{
        success: boolean
        message?: string
      }>(
        `/api/lab/locations/${location.id}`,
        {
          method:
            'DELETE',
        },
      )


    if (!response.success) {
      return
    }


    showTost(
      'Успех',
      'Место отбора удалено',
      'success',
      'streamline-freehand-color:form-validation-check-double',
      3000,
    )


    await loadLocations()

    await loadObjects()

  } catch (error) {
    console.error(
      'Ошибка удаления места:',
      error,
    )

    showTost(
      'Удаление невозможно',
      getApiErrorMessage(
        error,
        'Не удалось удалить место',
      ),
      'warning',
      'fxemoji:warningsign',
      6000,
    )
  }
}


function resetLocationForm() {
  Object.assign(
    currentLocation,
    {
      id: null,
      name: '',
      note: '',
    },
  )

  isEditingLocation.value =
    false
}


function closeLocationModal() {
  isLocationModalOpen.value =
    false

  resetLocationForm()
}


/* ========================================================== */
/* UI HELPERS                                                */
/* ========================================================== */

function pluralizePlaces(
  count: number,
): string {
  const lastTwo =
    count % 100

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return 'мест'
  }

  const last =
    count % 10

  if (last === 1) {
    return 'место'
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'места'
  }

  return 'мест'
}


function pluralizeSamplings(
  count: number,
): string {
  const lastTwo =
    count % 100

  if (
    lastTwo >= 11 &&
    lastTwo <= 14
  ) {
    return 'отборов'
  }

  const last =
    count % 10

  if (last === 1) {
    return 'отбор'
  }

  if (
    last >= 2 &&
    last <= 4
  ) {
    return 'отбора'
  }

  return 'отборов'
}


function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const apiError =
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
    apiError?.data
      ?.data
      ?.message ||
    apiError?.data
      ?.message ||
    apiError?.data
      ?.statusMessage ||
    apiError?.statusMessage ||
    apiError?.message ||
    fallback
  )
}


/* ========================================================== */
/* WATCHERS / LIFECYCLE                                      */
/* ========================================================== */

let objectSearchTimer:
  ReturnType<
    typeof setTimeout
  > | null = null

let locationSearchTimer:
  ReturnType<
    typeof setTimeout
  > | null = null


watch(
  objectSearch,
  () => {
    if (objectSearchTimer) {
      clearTimeout(
        objectSearchTimer,
      )
    }

    objectSearchTimer =
      setTimeout(
        () => {
          objectPage.value =
            1

          void loadObjects()
        },
        300,
      )
  },
)


watch(
  locationSearch,
  () => {
    if (locationSearchTimer) {
      clearTimeout(
        locationSearchTimer,
      )
    }

    locationSearchTimer =
      setTimeout(
        () => {
          locationPage.value =
            1

          void loadLocations()
        },
        300,
      )
  },
)


onMounted(
  () => {
    void loadObjects()
  },
)


defineExpose({
  loadObjects,
  loadLocations,
})
</script>


<style scoped>
.objects-page {
  position: absolute;
  inset: 0;
  padding: 0;
  overflow: hidden;
}

.page-card {
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
    0 10px 30px rgb(15 23 42 / 8%);
}

.page-header,
.object-summary,
.section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.eyebrow,
.modal-caption,
.summary-caption {
  margin: 0 0 4px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  color: #64748b;
  text-transform: uppercase;
}

.page-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.15;
  font-weight: 750;
  color: #0f172a;
}

.page-subtitle {
  margin: 6px 0 0;
  font-size: 14px;
  color: #64748b;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
  margin-bottom: 12px;
}

.toolbar--compact {
  margin-top: 12px;
}

.search-box {
  position: relative;
  min-width: 260px;
  max-width: 720px;
  flex: 1;
}

.search-icon {
  position: absolute;
  top: 50%;
  left: 12px;
  z-index: 1;
  color: #94a3b8;
  transform: translateY(-50%);
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 14px 0 38px;
  color: #0f172a;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 9px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.search-input:focus {
  border-color: #0ea5e9;
  box-shadow:
    0 0 0 3px rgb(14 165 233 / 12%);
}

.toolbar-note {
  flex: 0 0 auto;
  font-size: 13px;
  color: #64748b;
}

.table-card {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid #e2e8f0;
  border-radius: 11px;
  box-shadow:
    0 3px 12px rgb(15 23 42 / 5%);
}

.table-card--locations {
  margin-top: 0;
}

.data-table {
  width: 100%;
  min-width: 760px;
  border-collapse: collapse;
}

.data-table th {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 11px 14px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.045em;
  color: #64748b;
  text-align: left;
  text-transform: uppercase;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.data-table td {
  padding: 12px 14px;
  font-size: 13px;
  color: #334155;
  vertical-align: middle;
  border-bottom: 1px solid #eef2f7;
}

.data-table tbody tr:last-child td {
  border-bottom: 0;
}

.object-row {
  transition:
    background-color 0.15s ease;
}

.object-row:hover {
  background: #f8fbff;
}

.sortable {
  cursor: pointer;
  user-select: none;
}

.header-label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
}

.object-link {
  max-width: 560px;
  overflow: hidden;
  font-size: 13px;
  font-weight: 700;
  color: #0369a1;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-link:hover {
  color: #075985;
  text-decoration: underline;
}

.row-note,
.full-name {
  display: block;
  max-width: 620px;
  margin-top: 3px;
  overflow: hidden;
  font-size: 11px;
  color: #94a3b8;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.full-name {
  margin-top: 0;
  font-size: 12px;
  color: #475569;
}

.muted {
  color: #94a3b8;
}

.location-count,
.sampling-count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 9px;
  font-size: 12px;
  color: #075985;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 999px;
}

.location-count:hover {
  background: #e0f2fe;
}

.actions-column {
  width: 110px;
}

.actions-cell {
  white-space: nowrap;
}

.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 5px;
  border-radius: 7px;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.icon-button--edit {
  color: #0284c7;
}

.icon-button--edit:hover {
  background: #e0f2fe;
}

.icon-button--delete {
  color: #dc2626;
}

.icon-button--delete:hover {
  background: #fef2f2;
}

.empty-cell {
  padding: 50px 16px !important;
  color: #94a3b8 !important;
  text-align: center !important;
}

.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  gap: 10px;
  color: #64748b;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-bottom-color: #0284c7;
  border-radius: 999px;
  animation: spin 0.8s linear infinite;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
}

.pagination-info,
.page-indicator {
  font-size: 12px;
  color: #64748b;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.breadcrumbs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 13px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-weight: 600;
  color: #0284c7;
}

.back-link:hover {
  color: #0369a1;
}

.breadcrumb-separator {
  color: #cbd5e1;
}

.breadcrumb-current {
  max-width: 760px;
  overflow: hidden;
  color: #64748b;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.object-summary {
  padding: 16px 18px;
  background:
    linear-gradient(
      135deg,
      #f8fafc,
      #f0f9ff
    );
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.summary-main {
  display: flex;
  align-items: flex-start;
  min-width: 0;
  gap: 12px;
}

.summary-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 44px;
  height: 44px;
  color: #0369a1;
  background: #e0f2fe;
  border-radius: 10px;
}

.summary-title {
  max-width: 980px;
  margin: 0;
  overflow: hidden;
  font-size: 21px;
  font-weight: 750;
  color: #0f172a;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.summary-full-name {
  max-width: 1000px;
  margin: 5px 0 0;
  font-size: 13px;
  line-height: 1.45;
  color: #475569;
}

.summary-full-name--empty {
  color: #94a3b8;
}

.summary-actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.object-meta {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr)
    160px;
  gap: 10px;
  margin-top: 10px;
}

.meta-item {
  padding: 10px 12px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 9px;
}

.meta-label {
  display: block;
  margin-bottom: 3px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #94a3b8;
  text-transform: uppercase;
}

.meta-value {
  font-size: 13px;
  color: #334155;
}

.section-header {
  align-items: center;
  margin-top: 18px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
  color: #0f172a;
}

.section-subtitle {
  margin: 3px 0 0;
  font-size: 12px;
  color: #94a3b8;
}

.location-name {
  font-weight: 650;
  color: #0f172a !important;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  gap: 16px;
}

.modal-title {
  margin: 0;
  font-size: 20px;
  font-weight: 750;
  color: #0f172a;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  font-size: 12px;
  font-weight: 650;
  color: #334155;
}

.required {
  color: #dc2626;
}

.field-input {
  width: 100%;
  padding: 9px 11px;
  font-size: 14px;
  color: #0f172a;
  background: #fff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  outline: none;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.field-input:focus {
  border-color: #0ea5e9;
  box-shadow:
    0 0 0 3px rgb(14 165 233 / 12%);
}

.field-textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 6px;
}

.object-lock {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
}

.object-lock-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #94a3b8;
  text-transform: uppercase;
}

.object-lock-full {
  font-size: 11px;
  color: #64748b;
}


.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgb(15 23 42 / 45%);
  backdrop-filter: blur(2px);
}

.custom-modal {
  width: min(92vw, 760px);
  max-height: 90vh;
  overflow-y: auto;
  padding: 20px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  box-shadow:
    0 24px 70px rgb(15 23 42 / 25%);
}

.custom-modal--location {
  width: min(92vw, 680px);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 34px;
  height: 34px;
  color: #64748b;
  background: transparent;
  border-radius: 8px;
}

.modal-close:hover {
  color: #0f172a;
  background: #f1f5f9;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 980px) {
  .page-card {
    padding: 14px;
  }

  .page-header,
  .object-summary,
  .section-header {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-actions {
    flex-wrap: wrap;
  }

  .object-meta {
    grid-template-columns: 1fr;
  }

  .toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .search-box {
    max-width: none;
  }

  .pagination {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
