<template>
  <nav class="flex bg-sky-100">
    <div class="flex items-center px-5 w-fit">
      <div class="flex justify-center m-auto">
        <NuxtImg src="/logo_eng.svg" width="200" height="40" alt="Logo" />
      </div>
    </div>
    <div class="p-5 grid items-center gap-1">
      <div>
        <NuxtLink to="/"> <Icon name="line-md:home" /> Главная </NuxtLink>
      </div>
      <div class="mr-5">
        <Nuxt-link to="/ad/browser">
          <Icon name="teenyicons:users-outline" /> Сотрудники
        </Nuxt-link>
      </div>
      <div>
        <NuxtLink to="/edit"> <Icon name="line-md:edit" /> Изменить </NuxtLink>
      </div>
      <!-- <div>
                <NuxtLink to="/lab">                    
                    <Icon name="material-symbols:precision-manufacturing-outline-sharp" size="18px" /> Лаборатория
                </NuxtLink>
            </div> -->
    </div>
    <div class="flex ml-auto items-center gap-4">
      <div
        v-if="adUser"
        class="user-info flex flex-col justify-center items-end mr-3"
      >
        <span class="font-semibold">{{ shortName }}</span>
        <span class="text-xs">{{ userDep }}</span>
      </div>
      <!-- <a @click="logout" class="flex items-center px-2 transition-colors hover:text-red-500" href="#">
                <Icon name="line-md:logout" /> 
            </a> -->
      <AuthState v-slot="{ loggedIn, clear }">
        <div
          v-if="!authType"
          class="flex items-center px-2 transition-colors hover:text-red-500"
        >
          <button v-if="loggedIn" @click="logout">
            <Icon name="line-md:logout" />
          </button>
          <NuxtLink v-else to="/login"><Icon name="line-md:login" /></NuxtLink>
        </div>
      </AuthState>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useAuthStore, useIsLoadingStore } from '@/stores/auth.store';
import { useUserStore } from '~/stores/user';

const { data } = await useFetch('/api/auth/session');
const loggedIn = data.value?.loggedIn || false;
const currentUser = ref('');
const userEmail = ref('');
const userDep = ref('');
const authType =ref('');
// console.log('cookie data ===> ', data);
// const { data: user, error } = await useFetch('/api/auth/me');
const { user, clear } = useUserSession();
const userStore = useUserStore();
const { user: adUser } = storeToRefs(userStore);

// const { adUser, isAuthenticated } = storeToRefs(userStore)

onMounted(() => {
  // console.log('Данные пользователя на клиенте === ', adUser);
  // @ts-ignore
  // userDep.value = adUser.department || '';
});

watch(
  adUser,
  (newUser) => {
    if (newUser) {
      // console.log('Сессия успешно считана и обновилась:', newUser);
      // @ts-ignore
      userDep.value = newUser.department || '';
      // @ts-ignore
      authType.value = newUser.authType || null;
    }
  },
  { immediate: true }
); // immediate проверит значение сразу при старте

const shortName = computed(() => {
  // Проверяем наличие user и его свойств
  // @ts-ignore
  if (!user.value || !user.value.name) return '';

  // Делаем первую букву фамилии заглавной для красоты
  // @ts-ignore
  const parts = user.value.name.trim().split(/\s+/);
  const lastName =
    parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();

  const fInitial = parts[1] ? `${parts[1][0].toUpperCase()}.` : '';
  const mInitial = parts[2] ? `${parts[2][0].toUpperCase()}.` : '';

  return `${lastName} ${fInitial}${mInitial}`.trim();
});

// import  showToast  from "../../../utils/showToast";
const logout = async () => {
  const authStore = useAuthStore();
  const isLoggedIn = useIsLoadingStore();
  const router = useRouter();
  const { clear } = useUserSession();
  const showToast = (content: string, typeMsg: string) => {
    const toastStore = useToastStore();
    const toastId = Math.random().toString();
    toastStore.addToast({
      id: toastId,
      title: 'Уведомление!',
      description: content,
      type: typeMsg,
    });
  };

  try {
    // 1. Говорим серверу удалить куки
    // await $fetch('/api/auth/logout', { method: 'POST' })

    // 2. Очищаем локальное состояние в Pinia
    authStore.clear();
    isLoggedIn.set(false);

    clear();

    // 3. Редиректим на главную или страницу логина
    setTimeout(() => {
      showToast(`Вы успешно вышли из системы`, 'inform');
      router.push('/login');
    }, 500);
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  }
};
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr 1fr 1fr;
}
</style>
