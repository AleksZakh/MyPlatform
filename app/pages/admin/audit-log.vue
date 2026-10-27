<template>
  <div class="diagnostic-contracts audit-log-page">
    <div class="audit-log-shell mx-auto w-full max-w-[1500px] px-6 py-6 lg:px-8">

      <!-- =====================================================
           BREADCRUMBS
           ===================================================== -->
      <div class="mb-7 flex items-center gap-2 text-sm audit-muted">
        <span>Центр управления</span>

        <Icon
          name="lucide:chevron-right"
          class="h-4 w-4"
        />

        <span class="font-medium audit-accent">
          Журнал событий
        </span>
      </div>


      <!-- =====================================================
           HEADER
           ===================================================== -->
      <div
        class="
          mb-6 flex flex-col gap-5
          xl:flex-row xl:items-end xl:justify-between
        "
      >
        <div>
          <h1
            class="
              text-2xl font-semibold tracking-tight
              audit-text
            "
          >
            Журнал событий
          </h1>

          <p class="mt-1 text-sm audit-muted">
            История действий пользователей и системных событий Space
          </p>
        </div>


        <!-- Date filter -->
        <div
          class="
            flex flex-wrap items-end gap-3
          "
        >
          <label class="block">
            <span
              class="
                mb-1.5 block text-xs font-medium
                uppercase tracking-wide audit-muted
              "
            >
              С даты
            </span>

            <input
              v-model="filters.dateFrom"
              type="date"
              class="
                h-10 rounded-xl border audit-border
                audit-bg px-3 text-sm audit-text
                outline-none transition
                
                 
              "
            >
          </label>


          <label class="block">
            <span
              class="
                mb-1.5 block text-xs font-medium
                uppercase tracking-wide audit-muted
              "
            >
              По дату
            </span>

            <input
              v-model="filters.dateTo"
              type="date"
              class="
                h-10 rounded-xl border audit-border
                audit-bg px-3 text-sm audit-text
                outline-none transition
                
                 
              "
            >
          </label>


          <button
            type="button"
            class="
              h-10 rounded-xl border audit-border
              audit-bg px-5 text-sm font-semibold
              audit-accent transition
              audit-hover-panel
            "
            @click="resetFilters"
          >
            Сбросить
          </button>


          <button
            type="button"
            class="
              h-10 rounded-xl audit-primary px-6
              text-sm font-semibold audit-on-primary
              shadow-sm transition
              audit-hover-primary
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            :disabled="loading"
            @click="applyFilters"
          >
            Применить
          </button>
        </div>
      </div>


      <!-- =====================================================
           SEARCH
           ===================================================== -->
      <div class="mb-5">
        <div class="relative max-w-xl">
          <Icon
            name="lucide:search"
            class="
              pointer-events-none absolute
              left-3.5 top-1/2 h-5 w-5
              -translate-y-1/2 audit-muted
            "
          />

          <input
            v-model="filters.search"
            type="search"
            placeholder="Поиск по журналу..."
            class="
              h-11 w-full rounded-xl
              border audit-border audit-bg
              pl-11 pr-4 text-sm audit-text
              outline-none transition
              
              
               
            "
            @keyup.enter="applyFilters"
          >
        </div>
      </div>


      <!-- =====================================================
           CATEGORY TABS
           ===================================================== -->
      <div
        class="
          mb-2 overflow-x-auto
          border-b audit-border
        "
      >
        <div class="flex min-w-max gap-8">
          <button
            v-for="tab in categoryTabs"
            :key="tab.value"
            type="button"
            class="
              relative pb-3 text-sm font-medium
              transition
            "
            :class="
              filters.category === tab.value
                ? 'audit-accent'
                : 'audit-muted audit-hover-text'
            "
            @click="selectCategory(tab.value)"
          >
            {{ tab.label }}

            <span
              v-if="filters.category === tab.value"
              class="
                absolute inset-x-0 bottom-0
                h-0.5 rounded-full audit-tab-indicator
              "
            />
          </button>
        </div>
      </div>


      <div v-if="filters.category==='DATA'" class="mb-3 flex flex-wrap gap-2" aria-label="Раздел данных">
        <button v-for="item in [{key:'',label:'Все разделы'},{key:'diagnostic',label:'Диагностика'},{key:'lab',label:'Лабораторный контроль'},{key:'library',label:'Библиотека'},{key:'projects',label:'Проекты'},{key:'chat',label:'Чат'}]" :key="item.key" class="rounded-lg border px-3 py-1" :aria-pressed="filters.module===item.key" :class="filters.module===item.key?'audit-primary audit-on-primary':''" @click="filters.module=item.key;pagination.page=1;loadAuditLog()">{{item.label}}</button>
      </div>
      <div class="audit-log-scroll" role="region" aria-label="События журнала" tabindex="0" :aria-busy="loading">
      <!-- =====================================================
           ERROR
           ===================================================== -->
      <div
        v-if="errorMessage"
        class="
          my-5 rounded-xl border audit-error-border
          audit-error-bg px-4 py-3 text-sm audit-error-text
        "
      >
        {{ errorMessage }}
      </div>


      <!-- =====================================================
           LOADING
           ===================================================== -->
      <div
        v-if="loading && events.length === 0"
        class="
          audit-log-state flex
          items-center justify-center
        "
      >
        <div class="text-center">
          <Icon
            name="lucide:loader-circle"
            class="
              mx-auto h-7 w-7
              animate-spin audit-accent
            "
          />

          <div class="mt-3 text-sm audit-muted">
            Загружаем журнал событий...
          </div>
        </div>
      </div>


      <!-- =====================================================
           EVENTS
           ===================================================== -->
      <div
        v-else-if="events.length"
        class="audit-log-events"
      >
        <article
          v-for="eventItem in events"
          :key="eventItem.id"
          class="
            group transition
            audit-hover-panel
          "
        >
          <button
            type="button"
            class="
              grid w-full gap-4 px-3 py-4
              text-left
              md:grid-cols-[280px_minmax(0,1fr)_190px]
              md:items-center
            "
            @click="toggleEvent(eventItem.id)"
          >

            <!-- Actor -->
            <div class="flex min-w-0 items-center gap-4">

              <div
                class="
                  flex h-12 w-12 shrink-0
                  items-center justify-center
                  rounded-full overflow-hidden
                  audit-panel
                  text-sm font-semibold
                  audit-accent
                "
              >
                <img
                  v-if="eventItem.actor.avatarUrl && !failedAvatarUrls.has(eventItem.actor.avatarUrl)"
                  :src="eventItem.actor.avatarUrl"
                  alt=""
                  width="48"
                  height="48"
                  loading="lazy"
                  decoding="async"
                  class="h-full w-full object-cover"
                  @error="failedAvatarUrls.add(eventItem.actor.avatarUrl!)"
                >
                <span v-else>{{ getInitials(eventItem.actor.name) }}</span>
              </div>


              <div class="min-w-0">
                <div
                  class="
                    truncate font-medium
                    audit-text
                  "
                >
                  {{ eventItem.actor.name }}
                </div>

                <div
                  class="
                    mt-0.5 truncate
                    text-sm audit-muted
                  "
                >
                  {{
                    eventItem.actor.position
                    || eventItem.actor.department
                    || actorSubtitle(eventItem)
                  }}
                </div>
              </div>
            </div>


            <!-- Event -->
            <div class="min-w-0">
              <div
                class="
                  flex flex-wrap items-center gap-2
                "
              >
                <span
                  class="
                    font-medium audit-text
                  "
                >
                  {{ buildEventTitle(eventItem) }}
                </span>

                <span
                  class="
                    rounded-full px-2 py-0.5
                    text-[11px] font-semibold
                  "
                  :class="resultClass(eventItem.result)"
                >
                  {{ resultLabel(eventItem.result) }}
                </span>
              </div>


              <div
                class="
                  mt-1 flex flex-wrap
                  items-center gap-x-2 gap-y-1
                  text-sm audit-muted
                "
              >
                <span v-if="eventItem.resourceKey">
                  {{ resourceLabel(eventItem.resourceKey) }}
                </span>

                <span v-if="eventItem.entityType">
                  · {{ entityLabel(eventItem.entityType) }}
                </span>

                <span v-if="eventItem.entityId">
                  #{{ eventItem.entityId }}
                </span>

                <span
                  v-if="eventItem.note"
                  class="truncate"
                >
                  · {{ eventItem.note }}
                </span>
              </div>
            </div>


            <!-- Timestamp -->
            <div
              class="
                flex items-center justify-between
                gap-3 md:justify-end
              "
            >
              <div
                class="
                  text-sm tabular-nums
                  audit-muted
                "
              >
                {{ formatDateTime(eventItem.timestamp) }}
              </div>

              <Icon
                name="lucide:chevron-down"
                class="
                  h-4 w-4 audit-muted
                  transition-transform
                "
                :class="
                  expandedEventId === eventItem.id
                    ? 'rotate-180'
                    : ''
                "
              />
            </div>
          </button>


          <!-- =================================================
               EXPANDED DETAILS
               ================================================= -->
          <div
            v-if="expandedEventId === eventItem.id"
            class="
              mx-3 mb-4 rounded-2xl
              border audit-border
              audit-bg p-5 shadow-sm
            "
          >
            <div
              class="
                grid gap-6
                lg:grid-cols-[1fr_1.4fr]
              "
            >

              <!-- Technical details -->
              <div>
                <h3
                  class="
                    mb-4 text-xs font-semibold
                    uppercase tracking-wider
                    audit-muted
                  "
                >
                  Сведения о событии
                </h3>

                <dl
                  class="
                    grid grid-cols-[140px_1fr]
                    gap-x-4 gap-y-3 text-sm
                  "
                >
                  <dt class="audit-muted">
                    Категория
                  </dt>

                  <dd class="font-medium audit-text">
                    {{ eventItem.category || '—' }}
                  </dd>


                  <dt class="audit-muted">
                    Действие
                  </dt>

                  <dd class="font-medium audit-text">
                    {{ eventItem.action || '—' }}
                  </dd>


                  <dt class="audit-muted">
                    Результат
                  </dt>

                  <dd>
                    <span
                      class="
                        rounded-full px-2 py-1
                        text-xs font-semibold
                      "
                      :class="resultClass(eventItem.result)"
                    >
                      {{ resultLabel(eventItem.result) }}
                    </span>
                  </dd>


                  <dt class="audit-muted">
                    Авторизация
                  </dt>

                  <dd class="font-medium audit-text">
                    {{ eventItem.actor.authType || '—' }}
                  </dd>


                  <dt class="audit-muted">
                    Ресурс
                  </dt>

                  <dd
                    class="
                      break-all font-mono
                      text-xs audit-muted
                    "
                  >
                    {{ eventItem.resourceKey || '—' }}
                  </dd>


                  <dt class="audit-muted">
                    Маршрут
                  </dt>

                  <dd
                    class="
                      break-all font-mono
                      text-xs audit-muted
                    "
                  >
                    {{ eventItem.method || '' }}
                    {{ eventItem.route || '—' }}
                  </dd>


                  <dt class="audit-muted">
                    IP
                  </dt>

                  <dd
                    class="
                      font-mono text-xs
                      audit-muted
                    "
                  >
                    {{ eventItem.ipAddress || '—' }}
                  </dd>
                </dl>
              </div>


              <!-- Changes -->
              <div>
                <h3
                  class="
                    mb-4 text-xs font-semibold
                    uppercase tracking-wider
                    audit-muted
                  "
                >
                  Изменения
                </h3>


                <div
                  v-if="getChanges(eventItem).length"
                  class="
                    overflow-hidden rounded-xl
                    border audit-border
                  "
                >
                  <div
                    class="
                      grid grid-cols-[160px_1fr_1fr]
                      audit-bg px-4 py-2
                      text-xs font-semibold
                      uppercase tracking-wide
                      audit-muted
                    "
                  >
                    <div>Поле</div>
                    <div>Было</div>
                    <div>Стало</div>
                  </div>


                  <div
                    v-for="change in getChanges(eventItem)"
                    :key="change.field"
                    class="
                      grid grid-cols-[160px_1fr_1fr]
                      border-t audit-border
                      px-4 py-3 text-sm
                    "
                  >
                    <div
                      class="
                        pr-3 font-mono
                        text-xs audit-muted
                      "
                    >
                      {{ change.field }}
                    </div>

                    <div
                      class="
                        break-words pr-3
                        audit-muted
                      "
                    >
                      {{ formatValue(change.before) }}
                    </div>

                    <div
                      class="
                        break-words font-medium
                        audit-text
                      "
                    >
                      {{ formatValue(change.after) }}
                    </div>
                  </div>
                </div>


                <div
                  v-else
                  class="
                    rounded-xl border
                    border-dashed audit-border
                    px-4 py-8 text-center
                    text-sm audit-muted
                  "
                >
                  Для этого события изменения данных не зафиксированы.
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>


      <!-- =====================================================
           EMPTY
           ===================================================== -->
      <div
        v-else
        class="
          audit-log-state flex
          flex-col items-center justify-center
          text-center
        "
      >
        <div
          class="
            flex h-14 w-14 items-center
            justify-center rounded-2xl
            audit-panel
          "
        >
          <Icon
            name="lucide:history"
            class="h-7 w-7 audit-muted"
          />
        </div>

        <div
          class="
            mt-4 font-medium audit-text
          "
        >
          Событий не найдено
        </div>

        <div
          class="
            mt-1 text-sm audit-muted
          "
        >
          Попробуйте изменить параметры поиска.
        </div>
      </div>


      </div><!-- /audit-log-scroll -->

      <!-- =====================================================
           PAGINATION
           ===================================================== -->
      <div
        v-if="pagination.totalPages > 1"
        class="
          mt-4 flex items-center
          justify-end gap-1
          border-t audit-border pt-4
        "
      >
        <button
          type="button"
          class="
            flex h-9 w-9 items-center
            justify-center rounded-full
            audit-muted transition
            audit-hover-panel
            disabled:opacity-30
          "
          :disabled="pagination.page <= 1 || loading"
          @click="goToPage(pagination.page - 1)"
        >
          <Icon
            name="lucide:arrow-left"
            class="h-4 w-4"
          />
        </button>


        <button
          v-for="pageNumber in visiblePages"
          :key="pageNumber"
          type="button"
          class="
            h-9 min-w-9 rounded-full px-2
            text-sm transition
          "
          :class="
            pageNumber === pagination.page
              ? 'audit-panel font-semibold audit-text'
              : 'audit-muted audit-hover-panel'
          "
          :disabled="loading"
          @click="goToPage(pageNumber)"
        >
          {{ pageNumber }}
        </button>


        <button
          type="button"
          class="
            flex h-9 w-9 items-center
            justify-center rounded-full
            audit-muted transition
            audit-hover-panel
            disabled:opacity-30
          "
          :disabled="
            pagination.page >= pagination.totalPages
            || loading
          "
          @click="goToPage(pagination.page + 1)"
        >
          <Icon
            name="lucide:arrow-right"
            class="h-4 w-4"
          />
        </button>
      </div>
    </div>
  </div>
</template>


<script setup lang="ts">

useHead({
  title: 'Журнал событий',
  // Scoped by Unhead: removed automatically when this page is unmounted.
  htmlAttrs: { 'data-space-audit-layout': 'contained' },
});

import {
  computed,
  onMounted,
  ref,
} from 'vue';


const failedAvatarUrls = ref(new Set<string>());

interface AuditActor {
  avatarUrl?: string | null;
  id?: number | null;
  name: string;
  login?: string | null;
  email?: string | null;
  position?: string | null;
  department?: string | null;
  authType?: string | null;
}


interface AuditEvent {
  id: number;

  timestamp: string;

  category?: string | null;
  action: string;
  result?: string | null;

  resourceKey?: string | null;

  entityType?: string | null;
  entityId?: number | null;

  actorUserId?: number | null;
  actorLogin?: string | null;
  actorEmail?: string | null;
  actorAuthType?: string | null;

  note?: string | null;

  changes?: unknown;

  method?: string | null;
  route?: string | null;
  ipAddress?: string | null;

  actor: AuditActor;
}


interface AuditResponse {
  success: boolean;

  data: AuditEvent[];

  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}


interface ChangeItem {
  field: string;
  before: unknown;
  after: unknown;
}


const categoryTabs = [
  {
    label: 'Все',
    value: '',
  },
  {
    label: 'Данные',
    value: 'DATA',
  },
  {
    label: 'Доступ',
    value: 'ACCESS',
  },
  {
    label: 'Авторизация',
    value: 'AUTH',
  },
  {
    label: 'Администрирование',
    value: 'ADMIN',
  },
  {
    label: 'Безопасность',
    value: 'SECURITY',
  },
  {
    label: 'Система',
    value: 'SYSTEM',
  },
];


const filters = ref({
  search: '',
  category: '',
  module: '',
  dateFrom: '',
  dateTo: '',
});


const events =
  ref<AuditEvent[]>([]);


const loading =
  ref(false);


const errorMessage =
  ref('');


const expandedEventId =
  ref<number | null>(null);


const pagination = ref({
  page: 1,
  pageSize: 12,
  total: 0,
  totalPages: 0,
});


const visiblePages =
  computed(() => {

    const total =
      pagination.value.totalPages;

    const current =
      pagination.value.page;

    if (total <= 7) {
      return Array.from(
        {
          length: total,
        },
        (_, index) => index + 1,
      );
    }


    let start =
      Math.max(
        1,
        current - 3,
      );


    let end =
      Math.min(
        total,
        start + 6,
      );


    if (
      end - start < 6
    ) {
      start =
        Math.max(
          1,
          end - 6,
        );
    }


    return Array.from(
      {
        length:
          end - start + 1,
      },
      (_, index) =>
        start + index,
    );
  });


const loadAuditLog =
  async () => {

    loading.value = true;
    errorMessage.value = '';


    try {

      const query:
        Record<string, string | number> = {

          page:
            pagination.value.page,

          pageSize:
            pagination.value.pageSize,
        };


      if (
        filters.value.search.trim()
      ) {
        query.search =
          filters.value.search.trim();
      }


      if (
        filters.value.category
      ) {
        query.category =
          filters.value.category;
      }


      if(filters.value.category==='DATA' && filters.value.module)query.module=filters.value.module;
      if (
        filters.value.dateFrom
      ) {
        query.dateFrom =
          `${filters.value.dateFrom}T00:00:00`;
      }


      if (
        filters.value.dateTo
      ) {
        query.dateTo =
          `${filters.value.dateTo}T23:59:59.999`;
      }


      const response =
        await $fetch<AuditResponse>(
          '/api/admin/audit-log',
          {
            query,
          },
        );


      events.value =
        response.data;


      pagination.value = {
        ...response.pagination,
      };


      if (
        expandedEventId.value !== null &&
        !events.value.some(
          item =>
            item.id ===
            expandedEventId.value,
        )
      ) {
        expandedEventId.value =
          null;
      }

    }
    catch (error: any) {

      console.error(
        'Ошибка загрузки Event Log:',
        error,
      );


      errorMessage.value =
        error?.data?.message ||
        error?.message ||
        'Не удалось загрузить журнал событий.';

    }
    finally {

      loading.value =
        false;
    }
  };


const applyFilters =
  async () => {

    pagination.value.page = 1;

    await loadAuditLog();
  };


const resetFilters =
  async () => {

    filters.value = {
      search: '',
      category: '',
  module: '',
      dateFrom: '',
      dateTo: '',
    };


    pagination.value.page = 1;

    await loadAuditLog();
  };


const selectCategory =
  async (
    category: string,
  ) => {

    if (
      filters.value.category === category
    ) {
      return;
    }


    filters.value.category =
      category;
    filters.value.module='';


    pagination.value.page =
      1;


    await loadAuditLog();
  };


const goToPage =
  async (
    page: number,
  ) => {

    if (
      page < 1 ||
      page > pagination.value.totalPages ||
      page === pagination.value.page
    ) {
      return;
    }


    pagination.value.page =
      page;


    await loadAuditLog();
  };


const toggleEvent =
  (
    id: number,
  ) => {

    expandedEventId.value =
      expandedEventId.value === id
        ? null
        : id;
  };


const getInitials =
  (
    name: string,
  ): string => {

    const parts =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (
      parts.length === 0
    ) {
      return '?';
    }


    return parts
      .slice(0, 2)
      .map(
        part =>
          part[0]?.toUpperCase(),
      )
      .join('');
  };


const actorSubtitle =
  (
    eventItem: AuditEvent,
  ): string => {

    if (
      eventItem.actor.authType === 'EXTERNAL'
    ) {
      return 'Внешний пользователь';
    }


    if (
      eventItem.actor.authType === 'DOMAIN'
    ) {
      return 'Сотрудник';
    }


    return (
      eventItem.actor.email ||
      eventItem.actor.login ||
      'Пользователь'
    );
  };


const actionLabel =
  (
    action: string,
  ): string => {

    const labels:
      Record<string, string> = {

        CREATE:
          'Создание',

        UPDATE:
          'Изменение',

        DELETE:
          'Удаление',

        VIEW:
          'Просмотр',

        LOGIN:
          'Вход в систему',

        LOGOUT:
          'Выход из системы',
      };


    return (
      labels[action] ||
      action
    );
  };


const buildEventTitle =
  (
    eventItem: AuditEvent,
  ): string => {

    if (
      eventItem.result === 'DENIED'
    ) {
      return (
        `Отклонена операция: ` +
        actionLabel(eventItem.action)
      );
    }


    if (
      eventItem.action === 'CREATE'
    ) {
      return (
        `Создан объект ` +
        entityLabel(
          eventItem.entityType,
        )
      );
    }


    if (
      eventItem.action === 'UPDATE'
    ) {
      return (
        `Изменён объект ` +
        entityLabel(
          eventItem.entityType,
        )
      );
    }


    if (
      eventItem.action === 'DELETE'
    ) {
      return (
        `Удалён объект ` +
        entityLabel(
          eventItem.entityType,
        )
      );
    }


    return actionLabel(
      eventItem.action,
    );
  };


const entityLabel =
  (
    entityType?: string | null,
  ): string => {

    if (!entityType) {
      return 'данных';
    }


    const labels:
      Record<string, string> = {

        DiagnosticContract: 'Договор диагностики',
        DiagnosticCounterparty: 'Контрагент диагностики',
        DiagnosticProjectType: 'Тип проекта диагностики',
        SamplingTest:
          'Акт отбора',

        ReceiptMaterial:
          'Поступление материала',

        TestProtocol:
          'Протокол испытаний',

        TestLocation:
          'Место испытаний',

        TestObject:
          'Объект испытаний',

        Material:
          'Материал',

        Manufacturer:
          'Производитель',

        Inspector:
          'Инспектор',

        Plp:
          'ПЛП',
      };


    return (
      labels[entityType] ||
      entityType
    );
  };


const resourceLabel =
  (
    resourceKey?: string | null,
  ): string => {

    if (!resourceKey) {
      return '';
    }


    const labels:
      Record<string, string> = {

        'diagnostic.contracts': 'Диагностика — договоры',
        'lab.sampling-tests':
          'Лабораторный контроль',

        'lab.receipt-materials':
          'Поступление материалов',

        'lab.materials':
          'Материалы',

        'lab.manufacturers':
          'Производители',

        'lab.test-protocols':
          'Протоколы испытаний',

        'lab.test-objects':
          'Объекты испытаний',

        'lab.test-locations':
          'Места испытаний',

        'lab.inspectors':
          'Инспекторы',

        'lab.plps':
          'ПЛП',

        'system.audit-log':
          'Журнал событий',
      };


    return (
      labels[resourceKey] ||
      resourceKey
    );
  };


const resultLabel =
  (
    result?: string | null,
  ): string => {

    switch (result) {

      case 'SUCCESS':
        return 'Успешно';

      case 'DENIED':
        return 'Отказ';

      case 'FAILED':
        return 'Ошибка';

      default:
        return result || '—';
    }
  };


const resultClass =
  (
    result?: string | null,
  ): string => {

    switch (result) {

      case 'SUCCESS':
        return (
          'audit-success-bg ' +
          'audit-success-text'
        );

      case 'DENIED':
        return (
          'audit-error-bg ' +
          'audit-error-text'
        );

      case 'FAILED':
        return (
          'audit-warning-bg ' +
          'audit-warning-text'
        );

      default:
        return (
          'audit-panel ' +
          'audit-muted'
        );
    }
  };


const formatDateTime =
  (
    value: string,
  ): string => {

    const date =
      new Date(value);


    if (
      Number.isNaN(
        date.getTime(),
      )
    ) {
      return value;
    }


    return new Intl.DateTimeFormat(
      'ru-RU',
      {
        day:
          '2-digit',

        month:
          'short',

        year:
          'numeric',

        hour:
          '2-digit',

        minute:
          '2-digit',

        second:
          '2-digit',
      },
    )
      .format(date)
      .replace(',', '');
  };


const getChanges =
  (
    eventItem: AuditEvent,
  ): ChangeItem[] => {

    if (
      !eventItem.changes ||
      typeof eventItem.changes !== 'object' ||
      Array.isArray(eventItem.changes)
    ) {
      return [];
    }


    return Object.entries(
      eventItem.changes as
        Record<
          string,
          {
            before?: unknown;
            after?: unknown;
          }
        >,
    ).map(
      (
        [
          field,
          value,
        ],
      ) => ({
        field,

        before:
          value?.before ?? null,

        after:
          value?.after ?? null,
      }),
    );
  };


const formatValue =
  (
    value: unknown,
  ): string => {

    if (
      value === null ||
      value === undefined
    ) {
      return '—';
    }


    if (
      typeof value === 'string'
    ) {
      return value || '—';
    }


    if (
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }


    try {
      return JSON.stringify(
        value,
      );
    }
    catch {
      return String(value);
    }
  };


onMounted(
  loadAuditLog,
);
</script>

<!-- Reuse the exact contract palette (--diag-*) in both themes. -->
<style src="~/assets/css/diagnostic-contracts.css"></style>
<style src="~/assets/css/audit-log.css"></style>
