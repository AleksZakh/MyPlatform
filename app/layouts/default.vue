<!-- /app/layouts/default.vue -->

<template>
  <div class="layout-wrapper">

    <!-- Верхняя навигация -->
    <NavigateTopnav
      :is-collapsed="isCollapsed"
      @toggle-sidebar="toggleSidebar"
    />


    <!-- Основная область приложения -->
    <section
      class="layout-content bg-gray-100"
      :class="{ 'sidebar-collapsed': isCollapsed }"
    >

      <!-- Боковое меню -->
      <SidebarMenu
        :is-collapsed="isCollapsed"
        @toggle="toggleSidebar"
      />


      <!-- Контент текущей страницы -->
      <main class="overflow-y-auto">
        <slot />
      </main>

    </section>


    <!-- Уведомления -->
    <Toast />


    <!-- Подвал -->
    <Footer />

  </div>
</template>


<script setup lang="ts">

import { ref } from 'vue';


/**
 * true  -> sidebar свернут
 * false -> sidebar развернут
 */
const isCollapsed = ref(true);


/**
 * Переключение состояния sidebar
 */
const toggleSidebar = () => {
  isCollapsed.value =
    !isCollapsed.value;
};

</script>


<style scoped>

.layout-wrapper {
  display: grid;

  grid-template-rows:
    auto 1fr auto;

  height: 100vh;

  overflow: hidden;
}


/**
 * Основная область:
 *
 * sidebar + content
 */
.layout-content {
  display: grid;

  grid-template-columns:
    180px minmax(0, 1fr);

  transition:
    grid-template-columns 0.3s ease;
}


/**
 * Sidebar свернут
 */
.layout-content.sidebar-collapsed {
  grid-template-columns:
    64px minmax(0, 1fr);
}


main {
  overflow-y: auto;
}

</style>