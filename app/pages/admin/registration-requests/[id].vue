<script setup lang="ts">
type RequestStatus =
  | 'EMAIL_PENDING'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'PARTIALLY_APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'COMPLETED';

type RequestResource = {
  requestResourceId: number;
  resourceId: number;
  key: string;
  name: string;
  description: string | null;
  type: 'TABLE' | 'SECTION' | 'FEATURE';
  sortOrder: number;
  approved: boolean | null;
  adminComment: string | null;
};

type RegistrationRequest = {
  id: number;

  fullName: string;
  organization: string;
  position: string;
  email: string;

  accessReason: string | null;

  status: RequestStatus;

  createdAt: string;
  emailVerifiedAt: string | null;

  reviewedAt: string | null;
  reviewedByLogin: string | null;
  adminComment: string | null;

  resources: RequestResource[];
};

type RegistrationRequestResponse = {
  success: boolean;
  data: RegistrationRequest;
};

const route = useRoute();

const requestId =
  Number(route.params.id);

if (
  !Number.isInteger(requestId) ||
  requestId <= 0
) {
  throw createError({
    statusCode: 400,
    statusMessage:
      'Некорректный идентификатор заявки',
  });
}

useHead({
  title: `Заявка #${requestId}`,
});

const {
  data,
  status,
  error,
  refresh,
} = await useFetch<RegistrationRequestResponse>(
  `/api/admin/registration-requests/${requestId}`,
);

const request = computed(() => {
  return data.value?.data ?? null;
});

type ReviewResponse = {
  success: boolean;
  requestId: number;
  status:
    | 'APPROVED'
    | 'PARTIALLY_APPROVED'
    | 'REJECTED';
  approvedCount: number;
  rejectedCount: number;
  message: string;
};

const decisions =
  reactive<Record<number, boolean | null>>({});

const adminComment = ref('');

const isSaving = ref(false);
const saveError = ref('');
const saveSuccess = ref('');

const isReviewable = computed(() => {
  return (
    request.value?.status ===
    'PENDING_REVIEW'
  );
});

const isProvisioning = ref(false);
const provisionError = ref('');
const provisionSuccess = ref('');

const canProvision = computed(() => {
  return (
    request.value?.status === 'APPROVED' ||
    request.value?.status ===
      'PARTIALLY_APPROVED'
  );
});

const provisionUser = async () => {
  if (
    !request.value ||
    !canProvision.value ||
    isProvisioning.value
  ) {
    return;
  }

  provisionError.value = '';
  provisionSuccess.value = '';
  isProvisioning.value = true;

  try {
    const response =
      await $fetch<{
        success: boolean;
        userId: number;
        email: string | null;
        status: string;
        permissionsCount: number;
        message: string;
      }>(
        `/api/admin/registration-requests/${request.value.id}/provision`,
        {
          method: 'POST',
        },
      );

    provisionSuccess.value =
      response.message;

    await refresh();
  }
  catch (error: any) {
    provisionError.value =
      error?.data?.message ||
      error?.statusMessage ||
      'Не удалось создать пользователя.';
  }
  finally {
    isProvisioning.value = false;
  }
};

watch(
  request,

  (value) => {
    if (!value) {
      return;
    }

    for (
      const resource of value.resources
    ) {
      decisions[resource.resourceId] =
        resource.approved;
    }

    adminComment.value =
      value.adminComment ?? '';
  },

  {
    immediate: true,
  },
);

const allResourcesDecided =
  computed(() => {
    if (
      !request.value ||
      request.value.resources.length === 0
    ) {
      return false;
    }

    return request.value.resources.every(
      (resource) =>
        typeof decisions[
          resource.resourceId
        ] === 'boolean',
    );
  });

const approveAll = () => {
  if (!request.value) {
    return;
  }

  for (
    const resource of request.value.resources
  ) {
    decisions[resource.resourceId] = true;
  }
};

const rejectAll = () => {
  if (!request.value) {
    return;
  }

  for (
    const resource of request.value.resources
  ) {
    decisions[resource.resourceId] = false;
  }
};

const submitReview = async () => {
  if (
    !request.value ||
    !isReviewable.value ||
    !allResourcesDecided.value ||
    isSaving.value
  ) {
    return;
  }

  saveError.value = '';
  saveSuccess.value = '';
  isSaving.value = true;

  try {
    const response =
      await $fetch<ReviewResponse>(
        `/api/admin/registration-requests/${request.value.id}/review`,
        {
          method: 'POST',

          body: {
            resources:
              request.value.resources.map(
                (resource) => ({
                  resourceId:
                    resource.resourceId,

                  approved:
                    decisions[
                      resource.resourceId
                    ],
                }),
              ),

            adminComment:
              adminComment.value.trim() ||
              null,
          },
        },
      );

    saveSuccess.value =
      response.message;

    // Заново получаем заявку с сервера.
    // После этого она уже будет APPROVED /
    // PARTIALLY_APPROVED / REJECTED.
    await refresh();
  }
  catch (error: any) {
    saveError.value =
      error?.data?.message ||
      error?.statusMessage ||
      'Не удалось сохранить решение по заявке.';
  }
  finally {
    isSaving.value = false;
  }
};

const formatDate = (
  value: string | null,
): string => {
  if (!value) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'ru-RU',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    },
  ).format(new Date(value));
};

const getStatusLabel = (
  value: RequestStatus,
): string => {
  const labels: Record<
    RequestStatus,
    string
  > = {
    EMAIL_PENDING:
      'Ожидает подтверждения email',

    PENDING_REVIEW:
      'Ожидает рассмотрения',

    APPROVED:
      'Одобрена',

    PARTIALLY_APPROVED:
      'Частично одобрена',

    REJECTED:
      'Отклонена',

    EXPIRED:
      'Истекла',

    COMPLETED:
      'Завершена',
  };

  return labels[value];
};

const getResourceDecision = (
  approved: boolean | null,
): string => {
  if (approved === true) {
    return 'Одобрено';
  }

  if (approved === false) {
    return 'Отклонено';
  }

  return 'Ожидает решения';
};

const refreshRequest = async () => {
  await refresh();
};
</script>

<template>
  <section class="request-page overflow-auto max-h-255">
    <header class="request-header">
      <div>
        <NuxtLink
          to="/admin/registration-requests"
          class="back-link"
        >
          ← К списку заявок
        </NuxtLink>

        <h1>
          Заявка #{{ requestId }}
        </h1>
      </div>

      <button
        type="button"
        class="button"
        :disabled="status === 'pending'"
        @click="refreshRequest"
      >
        Обновить
      </button>
    </header>

    <div
      v-if="status === 'pending'"
      class="state-box"
    >
      Загрузка заявки...
    </div>

    <div
      v-else-if="error"
      class="state-box state-box--error"
    >
      Не удалось загрузить заявку.
    </div>

    <template v-else-if="request">
      <!-- Основные данные -->

      <div class="card">
        <div class="card__header">
          <h2>
            Данные заявителя
          </h2>

          <span class="status">
            {{
              getStatusLabel(
                request.status,
              )
            }}
          </span>
        </div>

        <dl class="details-grid">
          <div>
            <dt>ФИО</dt>
            <dd>
              {{ request.fullName }}
            </dd>
          </div>

          <div>
            <dt>Email</dt>
            <dd>
              {{ request.email }}
            </dd>
          </div>

          <div>
            <dt>Организация</dt>
            <dd>
              {{ request.organization }}
            </dd>
          </div>

          <div>
            <dt>Должность</dt>
            <dd>
              {{ request.position }}
            </dd>
          </div>

          <div>
            <dt>Дата заявки</dt>
            <dd>
              {{
                formatDate(
                  request.createdAt,
                )
              }}
            </dd>
          </div>

          <div>
            <dt>Email подтверждён</dt>
            <dd>
              {{
                formatDate(
                  request.emailVerifiedAt,
                )
              }}
            </dd>
          </div>
        </dl>
      </div>

      <!-- Причина запроса -->

      <div class="card">
        <h2>
          Причина запроса доступа
        </h2>

        <p class="reason">
          {{
            request.accessReason ||
            'Причина не указана.'
          }}
        </p>
      </div>

      <!-- Ресурсы -->

      <div class="card">
        <h2>
          Запрошенные ресурсы
        </h2>

        <div
          v-if="request.resources.length === 0"
          class="empty-message"
        >
          Ресурсы не указаны.
        </div>

        <div
          v-else
          class="resources"
        >
          <div
            v-for="resource in request.resources"
            :key="resource.resourceId"
            class="resource"
          >
            <div class="resource__main">
              <strong>
                {{ resource.name }}
              </strong>

              <small>
                {{ resource.key }}
              </small>

              <p
                v-if="resource.description"
              >
                {{
                  resource.description
                }}
              </p>
            </div>

            <div class="resource__decision">
                <template v-if="isReviewable">
                    <label class="decision-option">
                    <input
                        v-model="
                        decisions[
                            resource.resourceId
                        ]
                        "
                        type="radio"
                        :name="`resource-${resource.resourceId}`"
                        :value="true"
                    >

                    Одобрить
                    </label>

                    <label class="decision-option">
                    <input
                        v-model="
                        decisions[
                            resource.resourceId
                        ]
                        "
                        type="radio"
                        :name="`resource-${resource.resourceId}`"
                        :value="false"
                    >

                    Отклонить
                    </label>
                </template>

                <template v-else>
                    {{
                    getResourceDecision(
                        resource.approved,
                    )
                    }}
                </template>
                </div>
          </div>
        </div>
      </div>

      <!-- Блок принятия решения администратором -->

      <div
        v-if="isReviewable"
        class="card"
        >
        <h2>
            Решение по заявке
        </h2>

        <div class="bulk-actions">
            <button
            type="button"
            class="button"
            @click="approveAll"
            >
            Одобрить всё
            </button>

            <button
            type="button"
            class="button"
            @click="rejectAll"
            >
            Отклонить всё
            </button>
        </div>

        <label class="comment-field">
            <span>
            Комментарий администратора
            </span>

            <textarea
            v-model="adminComment"
            rows="5"
            maxlength="2000"
            placeholder="Комментарий к принятому решению"
            />
        </label>

        <p
            v-if="saveError"
            class="review-message review-message--error"
        >
            {{ saveError }}
        </p>

        <p
            v-if="!allResourcesDecided"
            class="review-hint"
        >
            Необходимо принять решение
            по каждому запрошенному ресурсу.
        </p>

        <button
            type="button"
            class="button button--primary"
            :disabled="
            isSaving ||
            !allResourcesDecided
            "
            @click="submitReview"
        >
            {{
            isSaving
                ? 'Сохранение...'
                : 'Сохранить решение'
            }}
        </button>
        </div>

        <div
            v-if="canProvision"
            class="card"
            >
            <h2>
                Создание пользователя
            </h2>

            <p>
                Решение по заявке принято.
                Можно создать учётную запись Space
                с одобренными правами доступа.
            </p>

            <p
                v-if="provisionError"
                class="review-message review-message--error"
            >
                {{ provisionError }}
            </p>

            <button
                type="button"
                class="button button--primary"
                :disabled="isProvisioning"
                @click="provisionUser"
            >
                {{
                isProvisioning
                    ? 'Создание...'
                    : 'Создать пользователя'
                }}
            </button>
            </div>

            <p
            v-if="provisionSuccess"
            class="review-message review-message--success"
            >
            {{ provisionSuccess }}
            </p>

        <p
        v-if="saveSuccess"
        class="review-message review-message--success"
        >
        {{ saveSuccess }}
        </p>

      <!-- Уже рассмотренная заявка -->

      <div
        v-if="request.reviewedAt"
        class="card"
      >
        <h2>
          Решение администратора
        </h2>

        <dl class="details-grid">
          <div>
            <dt>Рассмотрено</dt>
            <dd>
              {{
                formatDate(
                  request.reviewedAt,
                )
              }}
            </dd>
          </div>

          <div>
            <dt>Администратор</dt>
            <dd>
              {{
                request.reviewedByLogin ||
                '—'
              }}
            </dd>
          </div>
        </dl>

        <p
          v-if="request.adminComment"
          class="admin-comment"
        >
          {{ request.adminComment }}
        </p>
      </div>
    </template>
  </section>
</template>

<style scoped>

.resource__decision {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 130px;
}

.decision-option {
  display: flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
}

.bulk-actions {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
}

.comment-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 20px;
}

.comment-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border: 1px solid #9ca3af;
  border-radius: 6px;
  resize: vertical;
  font: inherit;
}

.button--primary {
  font-weight: 600;
  border-color: #4b5563;
}

.review-hint {
  margin: 0 0 14px;
  font-size: 14px;
  opacity: 0.7;
}

.review-message {
  padding: 12px;
  border: 1px solid;
  border-radius: 6px;
}

.review-message--error {
  color: #b91c1c;
  border-color: #dc2626;
}

.review-message--success {
  color: #166534;
  border-color: #16a34a;
}

.request-page {
  padding: 24px;
}

.request-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 24px;
}

.request-header h1 {
  margin: 8px 0 0;
}

.back-link {
  color: inherit;
}

.card {
  margin-bottom: 20px;
  padding: 20px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.card h2 {
  margin-top: 0;
}

.card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.status {
  padding: 6px 10px;
  border: 1px solid #9ca3af;
  border-radius: 6px;
  white-space: nowrap;
}

.details-grid {
  display: grid;
  grid-template-columns:
    repeat(
      auto-fit,
      minmax(220px, 1fr)
    );
  gap: 18px;
  margin: 0;
}

.details-grid dt {
  margin-bottom: 4px;
  font-size: 13px;
  opacity: 0.65;
}

.details-grid dd {
  margin: 0;
}

.reason {
  margin-bottom: 0;
  white-space: pre-wrap;
}

.resources {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.resource {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;

  padding: 14px;

  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.resource__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resource__main small {
  opacity: 0.6;
}

.resource__main p {
  margin: 6px 0 0;
}

.resource__decision {
  white-space: nowrap;
  font-size: 14px;
}

.button {
  padding: 8px 14px;
  border: 1px solid #9ca3af;
  border-radius: 6px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.state-box {
  padding: 24px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
}

.state-box--error {
  border-color: #dc2626;
  color: #b91c1c;
}

.admin-comment {
  margin-bottom: 0;
}

.empty-message {
  opacity: 0.7;
}
</style>