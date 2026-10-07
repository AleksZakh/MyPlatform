<script setup lang="ts">
import { useWebSocketStore } from '~/stores/websocket.store';
const presence = useWebSocketStore();
const search = ref('');
const users = computed(() => presence.users.filter(u => `${u.name} ${u.login}`.toLowerCase().includes(search.value.toLowerCase())));
useSeoMeta({ title: 'Space — пользователи online' });
</script>
<template>
  <section class="p-6 space-y-4 bg-white min-h-full">
    <h1 class="text-2xl font-semibold">Пользователи online</h1>
    <p v-if="!presence.isConnected" role="status">Нет соединения с сервисом присутствия. Подключаемся…</p>
    <p v-else>В приложении: {{ presence.users.length }}. Несколько вкладок считаются одним пользователем.</p>
    <UInput v-model="search" placeholder="Имя или логин" aria-label="Поиск пользователя" />
    <ul class="divide-y divide-gray-200">
      <li v-for="person in users" :key="person.id" class="py-3 flex items-center gap-3">
        <span :class="person.status === 'online' ? 'bg-green-500' : 'bg-amber-400'" class="h-2.5 w-2.5 rounded-full" />
        <div class="flex-1"><p class="font-medium">{{ person.name }}</p><p class="text-sm text-gray-500">{{ person.login }}</p></div>
        <span>{{ person.status === 'online' ? 'В сети' : 'Отошёл' }}</span>
      </li>
    </ul>
    <p class="text-sm text-gray-500">«Отошёл» — нет активности более 5 минут. После обрыва связи пользователь исчезает из списка в течение примерно 50 секунд.</p>
  </section>
</template>
