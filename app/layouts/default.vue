<template>
  <div class="layout-wrapper">
    <NavigateTopnav />
    <section class="grid bg-gray-100">
      <SidebarMenu />
      <main class="overflow-y-auto">
        <slot />
      </main>
    </section>
    <Toast />
    <Footer />
  </div>
</template>

<script setup lang="ts">
const { loggedIn } = useUserSession();
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 6fr;
}

.layout-wrapper {
  display: grid;
  grid-template-rows: auto 1fr auto; /* Шапка и футер по контенту, секция — на все оставшееся место */
  height: 100vh; /* Высота ровно на весь экран */
  overflow: hidden; /* Запрещаем общую прокрутку страницы */
}

/* Если внутри main контента будет много, он будет скроллиться отдельно */
main {
  overflow-y: auto;
}
</style>
