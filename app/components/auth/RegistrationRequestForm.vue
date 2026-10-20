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
        Заполните данные и выберите группы Space, к которым требуется доступ.
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
      v-if="isLoadingGroups"
      class="text-sm text-gray-500"
    >
      Загружаем группы Space...
    </div>

    <!-- Ошибка загрузки -->
    <div
      v-else-if="groupsError"
      class="text-sm text-red-600"
    >
      {{ groupsError }}
    </div>

    <fieldset v-else class="border border-gray-200 rounded-lg p-4 min-w-0">
      <legend class="px-1 font-medium text-gray-800">Группы Space</legend>
      <p class="text-xs text-gray-500 mb-3">Выберите группы, в которых планируете работать. Доступ предоставляется после одобрения администратором.</p>
      <p v-if="!groups.length" class="text-sm text-gray-500" role="status">Нет доступных групп. Обратитесь к администратору.</p>
      <div v-else class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        <label v-for="group in groups" :key="group.id" class="flex items-start gap-3 cursor-pointer rounded-md p-2 hover:bg-gray-50">
          <input v-model="form.groupIds" type="checkbox" :value="group.id" class="mt-1" :disabled="isSubmitting || !!successMessage" />
          <span class="text-sm text-gray-800 break-words">{{ group.name }}</span>
        </label>
      </div>
    </fieldset>

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
            isLoadingGroups ||
            !!groupsError ||
            isSubmitting || !!successMessage || !groups.length
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
            : successMessage ? 'Заявка отправлена' : 'Отправить запрос на регистрацию'
        }}
        </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';

type RegistrationGroup = { id: number; name: string };
type RegistrationGroupsResponse = { success: boolean; data: RegistrationGroup[] };

type CreateRegistrationResponse = {
  success: boolean;
  requestId: number;
  status: string;
  groupsCount: number;
  createdAt: string;
  message: string;
};

const isSubmitting = ref(false);
const successMessage = ref('');

const emit = defineEmits<{
  back: [];
}>();

const groups =
  ref<RegistrationGroup[]>([]);

const isLoadingGroups =
  ref(false);

const groupsError =
  ref('');

const formError =
  ref('');

const form = reactive({
  fullName: '',
  organization: '',
  position: '',
  email: '',
  accessReason: '',
  groupIds: [] as number[],
});

const loadGroups = async () => {
  isLoadingGroups.value = true;
  groupsError.value = '';

  try {
    const result =
      await $fetch<RegistrationGroupsResponse>(
        '/api/public/registration-resources',
      );

    if (!result?.success) {
      throw new Error(
        'Не удалось получить список групп',
      );
    }

    groups.value =
      result.data ?? [];
  }
  catch (error) {
    console.error(
      'Ошибка загрузки групп регистрации:',
      error,
    );

    groupsError.value =
      'Не удалось загрузить список доступных групп.';
  }
  finally {
    isLoadingGroups.value = false;
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

  if (form.groupIds.length === 0) {
    formError.value =
      'Выберите хотя бы одну группу.';
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

    groupIds: [
      ...form.groupIds,
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
  loadGroups();
});
</script>