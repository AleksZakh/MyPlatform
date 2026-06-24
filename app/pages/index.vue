<!-- <template>
  <div class="p-10">
    <h1 class="text-gray-500">Добро пожаловать на главную</h1>
    <br>
    <p class="text-gray-500">Имя: {{ name }}</p>
    <p class="text-gray-500">Email: {{ email }}</p>
    <br>
    <UButton color="info">Save Changes</UButton>
    <br>
    <UButton icon="i-lucide-sun" variant="subtle">Button</UButton>    
  </div>
</template> -->

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Секция отделов -->
    <section class="space-y-6">
      <!-- Заголовок секции -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Отделы компании</h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">Быстрый доступ к информации и сервисам подразделений</p>
        </div>
      </div>

      <!-- Состояние загрузки (скелетоны Nuxt UI) -->
      <div v-if="pending" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <UCard v-for="n in 3" :key="n" class="h-48 flex flex-col justify-between">
          <USkeleton class="h-6 w-[60%]" />
          <USkeleton class="h-12 w-full" />
          <USkeleton class="h-4 w-[40%]" />
        </UCard>
      </div>

      <!-- Сетка с готовыми карточками -->
      <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <DepartmentCard 
          v-for="dept in departments" 
          :key="dept.id" 
          :department="dept" 
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
  .main-area {
    background-color: aliceblue;
    position: absolute;
    left: 255px;
    top: 65px;
    right: 0%;
    display: flex;
    flex-direction: column;
    align-items: center;
    bottom: 50px;
  }
</style>

<script setup lang="ts">
  useHead({
      title: 'Автодор-Инжиниринг'
  })

  import { useAuthStore, useIsLoadingStore } from "../stores/auth.store"
  import { useWebSocketStore } from "@/stores/websocket.store";

  const authStorage = useAuthStore();
  const isLoadingStore = useIsLoadingStore();
  const wsStore = useWebSocketStore();
  const router = useRouter();

  
  const userStore = useUserStore();
  const name = computed(() => userStore.name);
  const email = computed(() => userStore.email);

  // Асинхронно запрашиваем данные с нашего локального API
const { data: departments, pending } = await useFetch('/api/departments')
  
</script>