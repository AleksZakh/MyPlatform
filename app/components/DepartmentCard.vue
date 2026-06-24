<!-- components/DepartmentCard.vue -->
<template>
  <UCard 
    class="flex flex-col h-full transition-all duration-250 hover:-translate-y-1 hover:shadow-lg hover:bg-zinc-50"
    :ui="{ 
      body: 'p-5 flex-1',
      header: 'p-3',
      footer: 'px-5 py-3'
    }"
  >
    <!-- Шапка: Логотип/Иконка и Название -->
    <template #header>
      <div class="flex items-center gap-3">
        <div class="p-2 bg-gray-200 dark:bg-gray-950/50 rounded-lg text-primary ">
          <!-- Используем встроенный в Nuxt UI компонент UIcon -->
          <UIcon :name="department.icon" class="w-6 h-6 block" />
        </div>
        <div>
          <NuxtLink :to="department.slug" class="text-base font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-2">
            {{ department.name }}
          </NuxtLink>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            Сотрудников: {{ department.employeeCount }}
          </span>
        </div>
      </div>
    </template>

    <!-- Тело: Быстрые ссылки -->
    <!-- Тело: Быстрые ссылки -->
<div class="space-y-2">
  <p class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">Быстрые ссылки</p>
  
  <!-- Заменили h-1/2 на max-h-40 (или другую фиксированную высоту) -->
  <ul class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
    <li v-for="link in department.quickLinks" :key="link.url">
      <NuxtLink :to="link.url" class="text-sm text-gray-600 dark:text-gray-300 hover:underline flex items-center gap-1">
        <UIcon name="i-heroicons-chevron-right" class="w-3.5 h-3.5 text-gray-400" />
        {{ link.label }}
      </NuxtLink>
    </li>
  </ul>
</div>


    <!-- Подвал: Руководитель отдела -->
    <template #footer>
      <div class="flex items-center gap-2">
        <UAvatar :src="department.manager.avatar" :alt="department.manager.name" size="xs" />
        <div class="text-xs">
          <p class="text-gray-400 dark:text-gray-500">Руководитель</p>
          <p class="font-medium text-gray-700 dark:text-gray-200 line-clamp-1">{{ department.manager.name }}</p>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  department: {
    id: string
    name: string
    slug: string
    icon: string
    employeeCount: number
    manager: { name: string; avatar: string }
    quickLinks: Array<{ label: string; url: string }>
  }
}>()
</script>
