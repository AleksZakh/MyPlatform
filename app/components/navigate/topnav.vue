<template>
  <nav class="space-topnav bg-sky-100" aria-label="Главное меню">

    <!-- Logo -->

    <div class="space-topnav-logo">
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

    <div class="space-topnav-menu">

      <div>
        <NuxtLink to="/" class="space-topnav-link">
          <Icon name="streamline-freehand-color:home-chimney-2" mode="svg" size="22" />
          Главная
        </NuxtLink>
      </div>


      <!-- <div>
        <NuxtLink to="/edit">
          <Icon name="line-md:edit" />
          Изменить
        </NuxtLink>
      </div> -->

      <div>
        <UDropdownMenu :items="departmentPages.map(page => ({ label: page.label, to: page.to }))">
          <button type="button" class="space-topnav-link" aria-label="Отделы"><Icon name="streamline-freehand-color:business-management-team-up" mode="svg" size="22" />Отделы<Icon name="lucide:chevron-down" /></button>
        </UDropdownMenu>
      </div>

      <div>
        <NuxtLink to="/library" class="space-topnav-link"><Icon name="streamline-freehand-color:book-library-shelf-1" mode="svg" size="22" />Библиотека</NuxtLink>
      </div>
      <div>
        <NuxtLink to="/ad/browser" class="space-topnav-link">
          <Icon name="streamline-freehand-color:phone-book" mode="svg" size="22" />Телефонный справочник
        </NuxtLink>
      </div>
    </div>



    <!-- User -->

    <div class="space-topnav-account">
      <ChatLauncher />

      <div
        v-if="loggedIn && user"
        class="user-info space-topnav-user"
      >
        <span class="font-semibold" :title="user?.name || user?.username">
          {{ shortName }}
        </span>

        <span
          v-if="userDepartment"
          class="text-xs"
          :title="userDepartment"
        >
          {{ userDepartment }}
        </span>
      </div>


      <!-- Login / Logout -->

      <div
        class="space-topnav-session"
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
import { departmentPages } from "~~/shared/navigation/catalog";

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


<style>
.space-topnav{display:flex;align-items:center;gap:12px;min-width:0;padding:10px 12px;box-sizing:border-box}
.space-topnav-logo{display:flex;align-items:center;flex:0 0 200px;min-width:0}
.space-topnav-logo img{display:block;width:200px;max-width:100%;height:auto}
.space-topnav-menu{display:flex;flex:0 0 auto;align-items:center;flex-wrap:nowrap;gap:4px;min-width:0}
.space-topnav-menu>div{flex:none}
.space-topnav .space-topnav-link{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:36px;padding:6px 10px;white-space:nowrap;border:1px solid transparent;border-radius:6px;line-height:20px;box-sizing:border-box;transition:background-color .15s,border-color .15s}
.space-topnav-link .iconify{flex:none}
.space-topnav .space-topnav-link:hover{background:#ffffffb3;border-color:#a5bfd1}
.space-topnav-account{display:flex;align-items:center;justify-content:flex-end;gap:12px;flex:1 1 240px;min-width:80px;margin-left:auto}
.space-topnav-user{display:flex;flex:0 1 auto;flex-direction:column;align-items:flex-end;min-width:0;margin-left:auto}
.space-topnav-user>span{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.space-topnav-session{display:flex;flex:none;align-items:center}
.space-topnav-session>a,.space-topnav-session>button{display:inline-flex;align-items:center;justify-content:center;width:32px;height:34px;border:1px solid transparent;border-radius:6px;cursor:pointer}
.space-topnav-session>a:hover,.space-topnav-session>button:hover{color:#b91c1c;background:#fff;border-color:#c7d3df}
.space-topnav .space-chat-launcher{width:34px!important;height:34px!important;min-width:34px!important;min-height:34px!important;box-sizing:border-box!important;border:1px solid #94a3b8!important;border-radius:8px;flex:none}
.space-topnav .space-chat-launcher:hover{background:#e2e8f0}
.space-topnav .space-topnav-link:focus-visible,.space-topnav-session>:focus-visible,.space-topnav .space-chat-launcher:focus-visible{outline:2px solid #2996b7;outline-offset:2px}
html.dark .space-topnav .space-topnav-link,html.dark .space-topnav-session>a,html.dark .space-topnav-session>button{background:#cbd5e1!important;border-color:#94a3b8!important;color:#172b3a!important}
html.dark .space-topnav .space-topnav-link:hover,html.dark .space-topnav-session>a:hover,html.dark .space-topnav-session>button:hover{background:#e2e8f0!important;border-color:#78d6ea!important}
@media(max-width:1150px){.space-topnav{gap:8px}.space-topnav-logo{flex-basis:150px}.space-topnav .space-topnav-link{gap:6px;padding:6px 8px}.space-topnav-account{gap:8px}}
/* Only move the whole menu to its own row when the header no longer fits. */
@media(max-width:960px){.space-topnav{flex-wrap:wrap}.space-topnav-menu{order:3;flex:1 1 100%;overflow-x:auto;padding:2px 0 4px}.space-topnav-account{flex:1 1 140px}.space-topnav-user{max-width:calc(100vw - 270px)}}
</style>
