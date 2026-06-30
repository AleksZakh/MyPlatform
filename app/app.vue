<template>
  <UApp :locale="ru">
    <NuxtLayout >
      <div class="bg-gray-50 h-full">
        <NuxtPage />
      </div>
    </NuxtLayout>    
  </UApp>
</template>

<script setup lang="ts">
  import { ru } from '@nuxt/ui/locale'

  // Здесь можно добавить глобальную логику для всего приложения, если нужно
  const { loggedIn, user, session } = useUserSession();

  const userStore = useState<{ user: { id: number; name: string } } | null>('user', () => null);

  // Запрашиваем роли на сервере при SSR и на клиенте при гидратации
const { data } = await useFetch('/api/auth/me');
if (data.value) {
  userStore.value = data.value;
}
</script>
