<template>
  <UApp :locale="ru">
    <NuxtLayout>
      <div class="space-page-frame bg-gray-50 relative"
        :class="containedPage ? 'h-full min-h-0 overflow-hidden' : 'min-h-full'">
        <NuxtPage />
      </div>
    </NuxtLayout>
  </UApp>
</template>

<script setup lang="ts">
import { usesContainedPage } from '~~/shared/utils/contained-pages';
const route = useRoute();
const containedPage = computed(() => usesContainedPage(route.path));

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
