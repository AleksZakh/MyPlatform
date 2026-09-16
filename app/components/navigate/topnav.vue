<template>
  <nav class="flex bg-sky-100">

    <!-- Logo -->

    <div class="flex items-center px-5 w-fit">
      <div class="flex justify-center m-auto">
        <NuxtImg
          src="/logo_eng.svg"
          width="200"
          height="40"
          alt="Logo"
        />
      </div>
    </div>


    <!-- Menu -->

    <div class="p-5 grid items-center gap-1">

      <div>
        <NuxtLink to="/">
          <Icon name="line-md:home" />
          Главная
        </NuxtLink>
      </div>


      <div class="mr-5">
        <NuxtLink to="/ad/browser">
          <Icon name="teenyicons:users-outline" />
          Сотрудники
        </NuxtLink>
      </div>


      <div>
        <NuxtLink to="/edit">
          <Icon name="line-md:edit" />
          Изменить
        </NuxtLink>
      </div>

    </div>


    <!-- User -->

    <div class="flex ml-auto items-center gap-4">

      <div
        v-if="loggedIn && user"
        class="user-info flex flex-col justify-center items-end mr-3"
      >
        <span class="font-semibold">
          {{ shortName }}
        </span>

        <span
          v-if="userDepartment"
          class="text-xs"
        >
          {{ userDepartment }}
        </span>
      </div>


      <!-- Login / Logout -->

      <div
        class="flex items-center px-2 transition-colors hover:text-red-500"
      >

        <button
          v-if="loggedIn"
          type="button"
          title="Выйти из системы"
          @click="logout"
        >
          <Icon name="line-md:logout" />
        </button>


        <NuxtLink
          v-else
          to="/login"
          title="Войти"
        >
          <Icon name="line-md:login" />
        </NuxtLink>

      </div>

    </div>

  </nav>
</template>


<script setup lang="ts">

import { useAuthStore, useIsLoadingStore } from '@/stores/auth.store';


const router = useRouter();


/**
 * Единственный источник информации об авторизации.
 */
const {
  loggedIn,
  user,
  fetch: refreshSession,
} = useUserSession();


const authStore =
  useAuthStore();

const isLoadingStore =
  useIsLoadingStore();


const toastStore =
  useToastStore();


/**
 * ------------------------------------------------------------
 * Имя пользователя
 * ------------------------------------------------------------
 */

const shortName = computed(() => {

  const currentUser: any =
    user.value;


  if (!currentUser?.name) {
    return currentUser?.username || '';
  }


  const parts =
    currentUser.name
      .trim()
      .split(/\s+/);


  const lastName =
    parts[0]
      ? parts[0].charAt(0).toUpperCase() +
        parts[0].slice(1).toLowerCase()
      : '';


  const firstInitial =
    parts[1]
      ? `${parts[1][0].toUpperCase()}.`
      : '';


  const middleInitial =
    parts[2]
      ? `${parts[2][0].toUpperCase()}.`
      : '';


  return (
    `${lastName} ${firstInitial}${middleInitial}`
  ).trim();
});


/**
 * ------------------------------------------------------------
 * Подразделение
 * ------------------------------------------------------------
 */

const userDepartment = computed(() => {

  const currentUser: any =
    user.value;


  return (
    currentUser?.department || ''
  );
});


/**
 * ------------------------------------------------------------
 * Toast
 * ------------------------------------------------------------
 */

const showToast = (
  content: string,
  typeMsg: string,
) => {

  toastStore.addToast({
    id: crypto.randomUUID(),
    title: 'Уведомление!',
    description: content,
    type: typeMsg,
  });
};


/**
 * ------------------------------------------------------------
 * Logout
 * ------------------------------------------------------------
 */

const logout = async () => {

  try {

    /**
     * 1.
     * Сервер удаляет nuxt-auth-utils session.
     */
    await $fetch(
      '/api/auth/logout',
      {
        method: 'POST',
      },
    );


    /**
     * 2.
     * Обновляем состояние useUserSession().
     *
     * После этого:
     *
     * loggedIn = false
     * user = null
     */
    await refreshSession();


    /**
     * 3.
     * Очищаем старый Pinia auth store.
     *
     * Пока он ещё используется другими частями приложения,
     * оставляем эту операцию.
     */
    authStore.clear();

    isLoadingStore.set(false);


    /**
     * 4.
     * Перенаправляем пользователя на login.
     *
     * logout=1 понадобится ниже для Kerberos.
     */
    await router.replace({
      path: '/login',

      query: {
        logout: '1',
      },
    });


    showToast(
      'Вы успешно вышли из системы',
      'inform',
    );

  }
  catch (error) {

    console.error(
      'Ошибка при выходе:',
      error,
    );


    showToast(
      'Не удалось выйти из системы',
      'error',
    );
  }
};

</script>


<style scoped>

.grid {
  display: grid;
  grid-template-columns:
    1fr 1fr 1fr 1fr 1fr 1fr 1fr;
}

</style>