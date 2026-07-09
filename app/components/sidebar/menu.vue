<template>
  <div class="p-5">
    <nuxt-link
      v-if="loggedIn"
      class="flex items-center py-1 px-6 text-lg rounded-lg w-full hover:bg-gray-200 hover:shadow transition-all mb-2 cursor-pointer"
      v-for="item in menuItems"
      :key="menuItems.indexOf(item)"
      :to="item.url"
    >
      <Icon :name="item.icon" class="mr-2" />
      {{ item.title }}
    </nuxt-link>
  </div>
</template>

<script setup lang="ts">
import { menuItems } from './menu.data';
const { loggedIn } = useUserSession();
</script>
