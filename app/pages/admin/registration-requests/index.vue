<script setup lang="ts">
type RegistrationResource = {
  id: number;
  key: string;
  name: string;
  type: 'TABLE' | 'SECTION' | 'FEATURE';
};

type RegistrationRequest = {
  id: number;
  fullName: string;
  organization: string;
  position: string;
  email: string;
  status: 'PENDING_REVIEW';
  createdAt: string;
  emailVerifiedAt: string | null;
  resourcesCount: number;
  resources: RegistrationResource[];
};

type RegistrationRequestsResponse = {
  success: boolean;
  count: number;
  data: RegistrationRequest[];
};

useHead({
  title: 'Заявки на регистрацию',
});

const {
  data,
  status,
  error,
  refresh,
} = await useFetch<RegistrationRequestsResponse>(
  '/api/admin/registration-requests',
);

const refreshRequests = async () => {
  await refresh();
};

const requests = computed(() => {
  return data.value?.data ?? [];
});

const formatDate = (
  value: string | null,
): string => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      dateStyle: 'short',
      timeStyle: 'short',
    },
  ).format(new Date(value));
};

const getErrorMessage = (): string => {
  if (error.value?.statusCode === 403) {
    return 'Недостаточно прав для доступа к панели администратора.';
  }

  if (error.value?.statusCode === 401) {
    return 'Необходимо выполнить вход в систему.';
  }

  return 'Не удалось загрузить список заявок.';
};
</script>

<template>
  <section class="registration-requests">
    <header class="registration-requests__header">
      <div>
        <h1>
          Заявки на регистрацию
        </h1>

        <p>
          Заявки пользователей,
          ожидающие рассмотрения.
        </p>
      </div>

      <button
        type="button"
        class="refresh-button"
        :disabled="status === 'pending'"
        @click="refreshRequests"
      >
        Обновить
      </button>
    </header>

    <div
      v-if="status === 'pending'"
      class="state-message"
    >
      Загрузка заявок...
    </div>

    <div
      v-else-if="error"
      class="state-message state-message--error"
    >
      {{ getErrorMessage() }}
    </div>

    <div
      v-else-if="requests.length === 0"
      class="state-message"
    >
      Новых заявок на рассмотрение нет.
    </div>

    <template v-else>
      <div class="registration-requests__summary">
        Ожидают рассмотрения:
        <strong>{{ requests.length }}</strong>
      </div>

      <div class="table-wrapper">
        <table class="requests-table">
          <thead>
            <tr>
              <th>Заявитель</th>
              <th>Организация</th>
              <th>Должность</th>
              <th>Email</th>
              <th>Подтверждение</th>
              <th>Ресурсы</th>
              <th />
            </tr>
          </thead>

          <tbody>
            <tr
              v-for="request in requests"
              :key="request.id"
            >
              <td>
                <strong>
                  {{ request.fullName }}
                </strong>

                <div class="request-id">
                  Заявка #{{ request.id }}
                </div>
              </td>

              <td>
                {{ request.organization }}
              </td>

              <td>
                {{ request.position }}
              </td>

              <td>
                {{ request.email }}
              </td>

              <td>
                {{
                  formatDate(
                    request.emailVerifiedAt,
                  )
                }}
              </td>

              <td>
                {{ request.resourcesCount }}
              </td>

              <td class="requests-table__actions">
                <!--
                  Детальную страницу создадим
                  следующим шагом.
                -->
                <NuxtLink
                  :to="`/admin/registration-requests/${request.id}`"
                  class="open-button"
                >
                  Открыть
                </NuxtLink>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<style scoped>
.registration-requests {
  padding: 24px;
}

.registration-requests__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 24px;
}

.registration-requests__header h1 {
  margin: 0 0 6px;
}

.registration-requests__header p {
  margin: 0;
}

.registration-requests__summary {
  margin-bottom: 12px;
}

.table-wrapper {
  overflow-x: auto;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.requests-table {
  width: 100%;
  border-collapse: collapse;
}

.requests-table th,
.requests-table td {
  padding: 12px 14px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #e5e7eb;
}

.requests-table th {
  font-weight: 600;
}

.requests-table tbody tr:last-child td {
  border-bottom: 0;
}

.request-id {
  margin-top: 4px;
  font-size: 12px;
  opacity: 0.65;
}

.requests-table__actions {
  white-space: nowrap;
}

.open-button,
.refresh-button {
  display: inline-block;
  padding: 8px 14px;
  border: 1px solid #9ca3af;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  text-decoration: none;
  cursor: pointer;
}

.refresh-button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.state-message {
  padding: 24px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.state-message--error {
  border-color: #dc2626;
  color: #b91c1c;
}
</style>