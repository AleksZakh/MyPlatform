<template>
  <aside class="sidebar p-2 relative">

    <!-- Кнопка сворачивания меню -->
    <button
      type="button"
      class="absolute toggle-icon right-1 top-0"
      @click="$emit('toggle')"
    >
      <span
        class="toggle-icon"
        :class="{ rotated: isCollapsed }"
      >
        <Icon
          name="streamline-freehand-color:navigation-page-right"
          size="13"
        />
      </span>
    </button>


    <!-- Меню отображаем только авторизованному пользователю -->
    <nav v-if="loggedIn">

      <NuxtLink
        v-for="item in menuItems"
        :key="item.url"
        :to="item.url"
        class="
          flex
          items-center
          menu-item
          py-1
          px-3
          text-lg
          rounded-lg
          w-full
          transition-all
          cursor-pointer
        "
      >
        <UTooltip :text="item.tooltip">

          <span class="icon flex items-center">
            <Icon
              :name="item.icon"
              class="mr-3"
              size="22"
            />
          </span>


          <span
            v-if="!isCollapsed"
            class="text flex items-center"
          >
            {{ item.title }}
          </span>

        </UTooltip>

      </NuxtLink>

    </nav>

  </aside>
</template>


<script setup lang="ts">

import { menuItems } from './menu.data';


/**
 * ============================================================
 * Авторизация
 * ============================================================
 *
 * useUserSession() — теперь единый источник состояния
 * авторизации во всём приложении.
 *
 * loggedIn — реактивный ref/computed.
 *
 * После:
 *
 *   setUserSession()
 *       +
 *   refreshSession()
 *
 * в login.vue значение здесь автоматически станет true.
 *
 * После logout оно автоматически станет false.
 */

const {
  loggedIn,
} = useUserSession();


/**
 * ============================================================
 * Props
 * ============================================================
 */

defineProps<{
  isCollapsed: boolean;
}>();


/**
 * ============================================================
 * Events
 * ============================================================
 */

defineEmits<{
  toggle: [];
}>();

</script>


<style scoped>

.sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  white-space: nowrap;
}


.menu-item {
  display: flex;
  align-items: center;
  padding: 10px;
}


.icon {
  font-size: 20px;
  min-width: 40px;
  text-align: center;
}


.toggle-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
}


.toggle-icon {
  display: inline-block;
  transition: transform 0.8s ease;
}


.toggle-icon.rotated {
  transform: rotate(180deg);
}

</style>