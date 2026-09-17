<script setup lang="ts">
definePageMeta({
  layout: 'auth',
});

useHead({
  title: 'Активация учётной записи',
});

type ActivationResponse = {
  success: boolean;
  userId: number;
  status: 'ACTIVE';
  message: string;
};

const route =
  useRoute();

const password =
  ref('');

const passwordConfirm =
  ref('');

const isSubmitting =
  ref(false);

const errorMessage =
  ref('');

const successMessage =
  ref('');

const token = computed(() => {
  const value =
    route.query.token;

  return typeof value === 'string'
    ? value.trim()
    : '';
});

const isTokenValid =
  computed(() => {
    return /^[a-f0-9]{64}$/i.test(
      token.value,
    );
  });

const passwordError =
  computed(() => {
    if (
      password.value.length > 0 &&
      password.value.length < 12
    ) {
      return 'Минимальная длина пароля — 12 символов.';
    }

    if (
      passwordConfirm.value &&
      password.value !==
        passwordConfirm.value
    ) {
      return 'Пароли не совпадают.';
    }

    return '';
  });

const canSubmit =
  computed(() => {
    return (
      isTokenValid.value &&
      password.value.length >= 12 &&
      password.value.length <= 128 &&
      password.value ===
        passwordConfirm.value &&
      !isSubmitting.value
    );
  });

const activateAccount =
  async () => {
    if (!canSubmit.value) {
      return;
    }

    errorMessage.value = '';
    successMessage.value = '';

    isSubmitting.value = true;

    try {
      const response =
        await $fetch<ActivationResponse>(
          '/api/auth/activate-account',
          {
            method: 'POST',

            body: {
              token:
                token.value,

              password:
                password.value,
            },
          },
        );

      successMessage.value =
        response.message;

      // Пароль больше не держим
      // в состоянии компонента.
      password.value = '';
      passwordConfirm.value = '';
    }
    catch (error: any) {
      errorMessage.value =
        error?.data?.message ||
        error?.statusMessage ||
        'Не удалось активировать учётную запись.';
    }
    finally {
      isSubmitting.value = false;
    }
  };
</script>

<template>
  <div class="activation-page">
    <div class="activation-card">
      <template v-if="successMessage">
        <h1>
          Учётная запись активирована
        </h1>

        <p class="success-message">
          {{ successMessage }}
        </p>

        <NuxtLink
          to="/login"
          class="button-link"
        >
          Перейти к входу
        </NuxtLink>
      </template>

      <template v-else>
        <h1>
          Активация учётной записи
        </h1>

        <p>
          Придумайте пароль для входа
          в Space.
        </p>

        <p
          v-if="!isTokenValid"
          class="error-message"
        >
          Ссылка активации некорректна
          или повреждена.
        </p>

        <form
          v-else
          class="activation-form"
          @submit.prevent="
            activateAccount
          "
        >
          <label>
            <span>
              Новый пароль
            </span>

            <input
              v-model="password"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="128"
            >
          </label>

          <label>
            <span>
              Повторите пароль
            </span>

            <input
              v-model="passwordConfirm"
              type="password"
              autocomplete="new-password"
              minlength="12"
              maxlength="128"
            >
          </label>

          <p class="password-hint">
            Минимум 12 символов.
          </p>

          <p
            v-if="passwordError"
            class="error-message"
          >
            {{ passwordError }}
          </p>

          <p
            v-if="errorMessage"
            class="error-message"
          >
            {{ errorMessage }}
          </p>

          <button
            type="submit"
            class="activate-button"
            :disabled="!canSubmit"
          >
            {{
              isSubmitting
                ? 'Активация...'
                : 'Активировать учётную запись'
            }}
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.activation-page {
  width: 100%;
  display: flex;
  justify-content: center;
}

.activation-card {
  width: 100%;
  max-width: 520px;
  padding: 32px;
}

.activation-form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 24px;
}

.activation-form label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}

.activation-form input {
  padding: 11px 12px;
  border: 1px solid #9ca3af;
  border-radius: 6px;
  font: inherit;
}

.activate-button,
.button-link {
  display: inline-block;
  padding: 12px 18px;

  border: 1px solid #4b5563;
  border-radius: 6px;

  background: transparent;
  color: inherit;

  font: inherit;
  text-align: center;
  text-decoration: none;

  cursor: pointer;
}

.activate-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.password-hint {
  margin: -8px 0 0;
  font-size: 13px;
  opacity: 0.7;
}

.error-message {
  color: #b91c1c;
}

.success-message {
  margin: 20px 0;
}
</style>