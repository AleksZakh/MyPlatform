<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Подтверждение электронной почты',
});

type VerifyEmailResponse = {
  success: boolean;
  requestId: number;
  status: 'PENDING_REVIEW';
  message: string;
};

const route = useRoute();

const isSubmitting = ref(false);
const successMessage = ref('');
const errorMessage = ref('');

const token = computed(() => {
  const value = route.query.token;

  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
});

const isTokenValid = computed(() => {
  return /^[a-f0-9]{64}$/i.test(token.value);
});

const getErrorMessage = (
  error: unknown,
): string => {
  if (
    typeof error === 'object' &&
    error !== null &&
    'data' in error
  ) {
    const data = (
      error as {
        data?: {
          message?: unknown;
        };
      }
    ).data;

    if (
      data &&
      typeof data.message === 'string'
    ) {
      return data.message;
    }
  }

  return 'Не удалось подтвердить электронную почту.';
};

const confirmEmail = async () => {
  if (isSubmitting.value) {
    return;
  }

  successMessage.value = '';
  errorMessage.value = '';

  if (!isTokenValid.value) {
    errorMessage.value =
      'Ссылка подтверждения некорректна.';
    return;
  }

  isSubmitting.value = true;

  try {
    const response =
      await $fetch<VerifyEmailResponse>(
        '/api/auth/verify-email',
        {
          method: 'POST',

          body: {
            token: token.value,
          },
        },
      );

    successMessage.value =
      response.message;
  }
  catch (error: unknown) {
    errorMessage.value =
      getErrorMessage(error);
  }
  finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <div class="verify-email">
    <div class="verify-email__card">
      <template v-if="successMessage">
        <h1>
          Электронная почта подтверждена
        </h1>

        <p class="verify-email__success">
          {{ successMessage }}
        </p>

        <NuxtLink
          to="/login"
          class="verify-email__link"
        >
          Вернуться на страницу входа
        </NuxtLink>
      </template>

      <template v-else>
        <h1>
          Подтверждение электронной почты
        </h1>

        <p class="verify-email__description">
          Для завершения проверки адреса
          электронной почты нажмите кнопку
          ниже.
        </p>

        <p
          v-if="!isTokenValid"
          class="verify-email__error"
        >
          Ссылка подтверждения некорректна
          или повреждена.
        </p>

        <p
          v-if="errorMessage"
          class="verify-email__error"
        >
          {{ errorMessage }}
        </p>

        <button
          type="button"
          class="verify-email__button"
          :disabled="
            isSubmitting ||
            !isTokenValid
          "
          @click="confirmEmail"
        >
          {{
            isSubmitting
              ? 'Подтверждение...'
              : 'Подтвердить электронную почту'
          }}
        </button>

        <NuxtLink
          to="/login"
          class="verify-email__link"
        >
          Вернуться на страницу входа
        </NuxtLink>
      </template>
    </div>
  </div>
</template>

<style scoped>
.verify-email {
  width: 100%;
  display: flex;
  justify-content: center;
}

.verify-email__card {
  width: 100%;
  max-width: 520px;
  padding: 32px;
}

.verify-email__card h1 {
  margin: 0 0 16px;
  font-size: 28px;
}

.verify-email__description {
  margin-bottom: 24px;
  line-height: 1.6;
}

.verify-email__button {
  width: 100%;
  padding: 12px 18px;
  border: 0;
  border-radius: 8px;
  cursor: pointer;
}

.verify-email__button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.verify-email__success {
  margin: 20px 0;
  line-height: 1.6;
}

.verify-email__error {
  margin: 16px 0;
  color: #b91c1c;
}

.verify-email__link {
  display: inline-block;
  margin-top: 20px;
}
</style>