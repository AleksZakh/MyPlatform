<!-- components/DepartmentCard.vue -->
<template>
  <UCard
    class="department-card flex flex-col h-full hover:-translate-y-1"
    :ui="{
      body: 'p-5 flex-1 department-card__body',
      header: 'p-3 department-card__header',
      footer: 'px-5 py-3 department-card__footer',
    }"
  >
    <!-- Шапка: Логотип/Иконка и Название -->
    <template #header>
      <div class="flex items-center gap-3">
        <div
          class="department-card__icon p-2 rounded-lg text-primary"
        >
          <!-- Используем встроенный в Nuxt UI компонент UIcon -->
          <UIcon :name="department.icon" class="w-6 h-6 block" />
        </div>
        <div>
          <NuxtLink
            :to="department.slug"
            class="text-base font-semibold text-gray-900 dark:text-white hover:text-primary transition-colors line-clamp-2"
          >
            {{ department.name }}
          </NuxtLink>
          <span class="text-xs text-gray-500 dark:text-gray-400">
            {{ department.employeeCount == null ? 'Состав уточняется' : `Сотрудников: ${department.employeeCount}` }}
          </span>
        </div>
      </div>
    </template>

    <!-- Тело: Быстрые ссылки -->
    <!-- Тело: Быстрые ссылки -->
    <div class="space-y-2">
      <p
        class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider"
      >
        Быстрые ссылки
      </p>

      <!-- Заменили h-1/2 на max-h-40 (или другую фиксированную высоту) -->
      <ul class="space-y-1.5 max-h-40 overflow-y-auto pr-1">
        <li v-for="link in department.quickLinks" :key="link.url">
          <NuxtLink
            :to="link.url"
            class="text-sm text-gray-600 dark:text-gray-300 hover:underline flex items-center gap-1"
          >
            <UIcon
              name="i-heroicons-chevron-right"
              class="w-3.5 h-3.5 text-gray-400"
            />
            {{ link.label }}
          </NuxtLink>
        </li>
      </ul>
    </div>

    <!-- Подвал: Руководитель отдела -->
    <template #footer>
      <div class="flex items-center gap-2">
        <UAvatar
          v-if="department.manager"
          :src="department.manager.avatar"
          :alt="department.manager.name"
          size="xs"
          class="department-card__manager-avatar"
        />
        <span v-else class="department-card__manager-avatar flex items-center justify-center w-6 h-6 rounded-full text-gray-400" aria-hidden="true"><UIcon name="i-lucide-user-round" class="w-4 h-4" /></span>
        <div class="text-xs">
          <p class="text-gray-400 dark:text-gray-500">Руководитель</p>
          <p class="font-medium text-gray-700 dark:text-gray-200 line-clamp-1">
            {{ department.manager?.name || 'Не указан' }}
          </p>
        </div>
      </div>
    </template>
  </UCard>
</template>

<script setup lang="ts">
defineProps<{
  department: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    employeeCount: number | null;
    manager: { name: string; avatar: string } | null;
    quickLinks: Array<{ label: string; url: string }>;
  };
}>();
</script>

<style scoped>
/* Variant B: isolated to department cards; other UCard instances keep their theme. */
.department-card {
  --department-card-body: #fff;
  --department-card-header: #e5edf5;
  --department-card-footer: #e9f0f7;
  --department-card-icon: #c9d7e4;
  --department-card-icon-border: #acc0d1;
  --department-card-border: #ccd9e6;
  --department-card-shadow: 0 5px 18px rgba(35,74,109,.19),0 2px 4px rgba(35,74,109,.1);
  --department-card-shadow-hover: 0 9px 23px rgba(35,74,109,.29);
  background: var(--department-card-body);
  border: 1px solid var(--department-card-border);
  box-shadow: var(--department-card-shadow);
  overflow: hidden;
  transition: transform .2s ease, box-shadow .2s ease;
}
.department-card:hover { box-shadow: var(--department-card-shadow-hover); }
.department-card :deep(.department-card__header) {
  background: var(--department-card-header);
  border-bottom: 1px solid var(--department-card-border);
}
.department-card :deep(.department-card__body) { background: var(--department-card-body); }
.department-card :deep(.department-card__footer) {
  background: var(--department-card-footer);
  border-top: 1px solid var(--department-card-border);
}
.department-card__icon, .department-card__manager-avatar {
  background: var(--department-card-icon);
  border: 1px solid var(--department-card-icon-border);
}
.department-card__icon { flex: none; }
:global(html[data-space-contrast="high"] .department-card) {
  --department-card-body: #fff;
  --department-card-header: #f1f5f9;
  --department-card-footer: #f1f5f9;
  --department-card-icon: #e2e8f0;
  --department-card-icon-border: #475569;
  --department-card-border: #475569;
  --department-card-shadow: none;
  --department-card-shadow-hover: none;
}
@media (prefers-reduced-motion: reduce) {
  .department-card { transition: none; }
}
</style>
