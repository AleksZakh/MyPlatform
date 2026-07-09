<template>
  <div class="p-5">
    <button class="bg-blue-500 text-white px-4 py-2 rounded" @click="userInfo">
      Информация о пользователе
    </button>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  public: false, // ❌ Указываем, что страница не публичная
});
useSeoMeta({
  title: 'Профиль',
  description:
    'Страница профиля пользователя с доступом к личной информации и настройкам.',
});
const authStore = useAuthStore();
const { loggedIn, user, session } = useUserSession();
const userInfo = () => {
  console.log('Информация о пользователе из Pinia:', authStore.getUserInfo);
  console.log('Значение loggedIn из useUserSession():', loggedIn.value);
  console.log('Информация о пользователе из useUserSession():', user.value);
  console.log('Информация о сессии пользователя', session.value);
};
</script>

<style lang="css" scoped></style>
