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
      <main
        class="main-content relative bg-red-300"
        :class="{
          'main-content--contained':
            isContainedMain,
        }"
      >
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

import {
  computed,
  ref,
} from 'vue';


/**
 * true  -> sidebar свернут
 * false -> sidebar развернут
 */
const isCollapsed = ref(true);


const route =
  useRoute();


/**
 * Страницы с собственным внутренним scroll-layout.
 *
 * Для них main НЕ должен прокручиваться сам:
 * высоту main наследует корневой контейнер страницы,
 * а прокрутка живёт уже внутри рабочих панелей.
 */
const isContainedMain =
  computed(
    () =>
      route.path ===
        '/admin/users' ||
      route.path === '/admin/access' ||
      route.path.startsWith(
        '/admin/users/',
      ),
  );


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
    auto minmax(0, 1fr) auto;

  width: 100%;
  height: 100dvh;
  min-width: 0;
  min-height: 0;

  overflow: hidden;
}


/**
 * Основная область:
 *
 * sidebar + content
 *
 * min-height: 0 здесь принципиален:
 * без него grid-элемент может растянуть строку
 * содержимым страницы и вытолкнуть footer вниз.
 */
.layout-content {
  display: grid;

  grid-template-columns:
    180px minmax(0, 1fr);

  min-width: 0;
  min-height: 0;

  overflow: hidden;

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


/**
 * По умолчанию main остаётся обычной
 * прокручиваемой областью приложения.
 */
.main-content {
  min-width: 0;
  min-height: 0;

  overflow-x: hidden;
  overflow-y: auto;
}


/**
 * Страницы с собственным внутренним scroll-layout.
 *
 * Здесь сам main не прокручивается.
 * Его точную высоту наследует страница,
 * а прокрутка происходит уже внутри её панелей.
 */
.main-content--contained {
  overflow: hidden;
}

</style>