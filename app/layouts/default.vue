<template>
  <div class="layout-wrapper">
    <!-- Передаем функцию переключения в шапку, если кнопка "гамбургер" будет там -->
    <NavigateTopnav
      @toggle-sidebar="toggleSidebar"
      :is-collapsed="isCollapsed"
    />

    <!-- Применяем динамический класс в зависимости от состояния -->
    <section
      class="grid bg-gray-100"
      :class="{ 'sidebar-collapsed': isCollapsed }"
    >
      <!-- Передаем состояние внутрь сайдбара -->
      <SidebarMenu :is-collapsed="isCollapsed" @toggle="toggleSidebar" />

      <main class="overflow-y-auto">
        <slot />
      </main>
    </section>

    <Toast />
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const { loggedIn } = useUserSession();

// Состояние: по умолчанию панель развернута (false)
const isCollapsed = ref(true);

// Функция для переключения состояния
const toggleSidebar = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
.layout-wrapper {
  display: grid;
  grid-template-rows: auto 1fr auto;
  height: 100vh;
  overflow: hidden;
}

.grid {
  display: grid;
  /* Плавный переход при изменении ширины сайдбара */
  transition: grid-template-columns 0.3s ease;
  /* Развернутое состояние: сайдбар занимает 240px (или 1fr), мейн — всё остальное */
  grid-template-columns: 180px minmax(0, 1fr);
}

/* Свернутое состояние: сайдбар сжимается до размера иконок (например, 64px) */
.grid.sidebar-collapsed {
  grid-template-columns: 64px minmax(0, 1fr);
}

main {
  overflow-y: auto;
}
</style>
