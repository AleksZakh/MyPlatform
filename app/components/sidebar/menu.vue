<template>
  <aside class="sidebar p-2 relative">
    <button @click="$emit('toggle')" class="absolute toggle-icon right-1 top-0">
      <span class="toggle-icon" :class="{ rotated: isCollapsed }">
        <Icon
          name="streamline-freehand-color:navigation-page-right"
          size="13"
        />
      </span>
    </button>
    <nav>
      <nuxt-link
        v-if="loggedIn"
        class="flex items-center menu-item py-1 px-3 text-lg rounded-lg w-full transition-all cursor-pointer"
        v-for="item in menuItems"
        :key="menuItems.indexOf(item)"
        :to="item.url"
      >
        <UTooltip :text="item.tooltip">
          <span class="icon flex items-center">
            <Icon :name="item.icon" class="mr-3" size="22" />
          </span>
          <span v-if="!isCollapsed" class="text flex items-center">
            {{ item.title }}
          </span>
        </UTooltip>
      </nuxt-link>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { menuItems } from './menu.data';

const { data } = await useFetch('/api/auth/session');
const loggedIn = data.value?.loggedIn || false;

// Принимаем пропс из лейаута
const props = defineProps<{
  isCollapsed: boolean;
}>();
// Объявляем событие клика для кнопки
defineEmits(['toggle']);
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Важно, чтобы текст не вылезал при сжатии панели */
  white-space: nowrap; /* Запрещаем тексту переноситься на новую строку */
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 10px;
}
.icon {
  font-size: 20px;
  min-width: 40px; /*Фиксированная ширина для иконки, чтобы она центрировалась  */
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

/* Базовое состояние иконки */
.toggle-icon {
  display: inline-block; /* Важно: inline-элементы не умеют трансформироваться */
  transition: transform 0.8s ease; /* Плавность анимации (совпадает со скоростью гридов) */
}

/* Класс, который применится, когда панель свернется */
.toggle-icon.rotated {
  transform: rotate(180deg); /* Поворот на 180 градусов */
}
</style>
