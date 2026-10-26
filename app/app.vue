<template>
  <UApp :locale="ru">
    <NuxtLayout>
      <div class="bg-gray-50 relative"
        :class="containedPage ? 'h-full min-h-0 overflow-hidden' : 'min-h-full'">
        <NuxtPage />
      </div>
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
const route = useRoute();
const containedPage = computed(() => route.path === '/departments/diagnostic' || route.path === '/profile' || route.path === '/admin/access' || route.path === '/admin/users' || route.path.startsWith('/admin/users/'));

import { ru } from '@nuxt/ui/locale';

// Здесь можно добавить глобальную логику для всего приложения, если нужно
const { loggedIn, user, session } = useUserSession();

const userStore = useState<{ user: { id: number; name: string } } | null>(
  'user',
  () => null
);

// Запрашиваем роли на сервере при SSR и на клиенте при гидратации
// const { data } = await useFetch('/api/auth/me');
// if (data.value) {
//   userStore.value = data.value;
// }
</script>
