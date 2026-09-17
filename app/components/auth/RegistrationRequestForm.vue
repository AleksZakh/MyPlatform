<template>
  <form
    class="flex flex-col gap-4 bg-white w-full p-4 border border-gray-200 rounded-lg mb-4"
    @submit.prevent="submitRegistration"
  >
    <div>
      <h2 class="text-lg font-semibold text-gray-800">
        Запрос на регистрацию
      </h2>

      <p class="text-sm text-gray-500 mt-1">
        Заполните данные и выберите ресурсы Space, к которым требуется доступ.
      </p>
    </div>

    <!-- ФИО -->
    <input
      v-model.trim="form.fullName"
      type="text"
      autocomplete="name"
      placeholder="Фамилия, имя, отчество"
      class="border border-gray-200 p-4 rounded-lg w-full"
    />

    <!-- Организация -->
    <input
      v-model.trim="form.organization"
      type="text"
      placeholder="Организация"
      class="border border-gray-200 p-4 rounded-lg w-full"
    />

    <!-- Должность -->
    <input
      v-model.trim="form.position"
      type="text"
      placeholder="Должность"
      class="border border-gray-200 p-4 rounded-lg w-full"
    />

    <!-- Email -->
    <input
      v-model.trim="form.email"
      type="email"
      autocomplete="email"
      placeholder="Электронная почта"
      class="border border-gray-200 p-4 rounded-lg w-full"
    />

    <!-- Причина -->
    <textarea
      v-model.trim="form.accessReason"
      rows="3"
      placeholder="Для чего требуется доступ"
      class="border border-gray-200 p-4 rounded-lg w-full resize-y"
    />

    <!-- Загрузка ресурсов -->
    <div
      v-if="isLoadingResources"
      class="text-sm text-gray-500"
    >
      Загружаем доступные разделы...
    </div>

    <!-- Ошибка загрузки -->
    <div
      v-else-if="resourcesError"
      class="text-sm text-red-600"
    >
      {{ resourcesError }}
    </div>

    <!-- Ресурсы -->
    <div
      v-else
      class="flex flex-col gap-4"
    >
      <div
        v-for="department in departments"
        :key="department.id"
        class="border border-gray-200 rounded-lg p-4"
      >
        <div class="font-medium text-gray-800 mb-3">
          {{ department.name }}
        </div>

        <div class="flex flex-col gap-2">
          <label
            v-for="resource in department.resources"
            :key="resource.id"
            class="flex items-start gap-3 cursor-pointer"
          >
            <input
              v-model="form.resourceIds"
              type="checkbox"
              :value="resource.id"
              class="mt-1"
            />

            <span>
              <span class="block text-sm text-gray-800">
                {{ resource.name }}
              </span>

              <span
                v-if="resource.description"
                class="block text-xs text-gray-400"
              >
                {{ resource.description }}
              </span>
            </span>
          </label>
        </div>
      </div>
    </div>

    <div
    v-if="successMessage"
    class="
        text-sm
        text-green-700
        bg-green-50
        border
        border-green-200
        rounded-lg
        p-3
    "
    >
    {{ successMessage }}
    </div>

    <!-- Ошибка формы -->
    <div
      v-if="formError"
      class="text-sm text-red-600"
    >
      {{ formError }}
    </div>

    <div class="flex justify-between gap-3">
      <button
        type="button"
        class="
          text-sm
          text-gray-700
          px-3
          py-2
          border
          border-gray-300
          rounded-sm
          hover:bg-gray-50
        "
        @click="emit('back')"
      >
        Вернуться ко входу
      </button>

      <button
        type="submit"
        :disabled="
            isLoadingResources ||
            !!resourcesError ||
            isSubmitting
        "
        class="
            text-sm
            text-white
            px-3
            py-2
            bg-sky-500
            border
            border-sky-700
            rounded-sm
            hover:shadow-lg
            active:shadow-sm
            disabled:opacity-50
            disabled:cursor-not-allowed
        "
        >
        {{
            isSubmitting
            ? 'Отправка...'
            : 'Отправить запрос на регистрацию'
        }}
        </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

type RegistrationResource = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  type: 'TABLE' | 'SECTION' | 'FEATURE';
};

type RegistrationDepartment = {
  id: number;
  key: string;
  name: string;
  description: string | null;
  resources: RegistrationResource[];
};

type RegistrationResourcesResponse = {
  success: boolean;
  data: RegistrationDepartment[];
};

type CreateRegistrationResponse = {
  success: boolean;
  requestId: number;
  status: string;
  resourcesCount: number;
  createdAt: string;
  message: string;
};

const isSubmitting = ref(false);
const successMessage = ref('');

const emit = defineEmits<{
  back: [];
}>();

const departments =
  ref<RegistrationDepartment[]>([]);

const isLoadingResources =
  ref(false);

const resourcesError =
  ref('');

const formError =
  ref('');

const form = reactive({
  fullName: '',
  organization: '',
  position: '',
  email: '',
  accessReason: '',
  resourceIds: [] as number[],
});

const loadResources = async () => {
  isLoadingResources.value = true;
  resourcesError.value = '';

  try {
    const result =
      await $fetch<RegistrationResourcesResponse>(
        '/api/public/registration-resources',
      );

    if (!result?.success) {
      throw new Error(
        'Не удалось получить список ресурсов',
      );
    }

    departments.value =
      result.data ?? [];
  }
  catch (error) {
    console.error(
      'Ошибка загрузки ресурсов регистрации:',
      error,
    );

    resourcesError.value =
      'Не удалось загрузить список доступных ресурсов.';
  }
  finally {
    isLoadingResources.value = false;
  }
};

const isValidEmail = (
  email: string,
) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
};

const submitRegistration = async () => {
  formError.value = '';
  successMessage.value = '';

  if (!form.fullName) {
    formError.value = 'Укажите ФИО.';
    return;
  }

  if (!form.organization) {
    formError.value = 'Укажите организацию.';
    return;
  }

  if (!form.position) {
    formError.value = 'Укажите должность.';
    return;
  }

  if (!form.email) {
    formError.value =
      'Укажите электронную почту.';
    return;
  }

  if (!isValidEmail(form.email)) {
    formError.value =
      'Укажите корректный адрес электронной почты.';
    return;
  }

  if (form.resourceIds.length === 0) {
    formError.value =
      'Выберите хотя бы один ресурс.';
    return;
  }

  const payload = {
    fullName: form.fullName,
    organization: form.organization,
    position: form.position,

    email:
      form.email.toLowerCase(),

    accessReason:
      form.accessReason || null,

    resourceIds: [
      ...form.resourceIds,
    ],
  };

  isSubmitting.value = true;

  try {
    const result =
      await $fetch<CreateRegistrationResponse>(
        '/api/auth/register-request',
        {
          method: 'POST',
          body: payload,
        },
      );

    successMessage.value =
      result.message;

    console.log(
      'Создана заявка:',
      result,
    );
  }
  catch (error: any) {
    console.error(
      'Ошибка регистрации:',
      error,
    );

    formError.value =
      error?.data?.message ||
      error?.statusMessage ||
      'Не удалось отправить заявку.';
  }
  finally {
    isSubmitting.value = false;
  }
};

onMounted(() => {
  loadResources();
});
</script>