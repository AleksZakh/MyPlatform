<script setup lang="ts">
defineProps<{ unavailable?: boolean }>();
defineEmits<{ retry: [] }>();
</script>
<template>
  <section class="space-access-notice" role="alert">
    <Icon name="lucide:lock-keyhole" aria-hidden="true" />
    <h1>{{ unavailable ? 'Не удалось проверить права доступа' : 'Недостаточно прав доступа' }}</h1>
    <p v-if="unavailable">Проверка временно недоступна. Повторите попытку.</p>
    <p v-else>У вас нет доступа к этому ресурсу. Для получения прав обратитесь к администратору.</p>
    <button v-if="unavailable" type="button" @click="$emit('retry')">Повторить проверку</button>
    <NuxtLink to="/">На главную</NuxtLink>
  </section>
</template>
<style scoped>
.space-access-notice{box-sizing:border-box;max-width:680px;margin:24px auto;padding:24px;border:1px solid #d5dde7;border-radius:10px;background:#fff;color:#263445;line-height:1.6}
.space-access-notice h1{font-size:22px;margin:8px 0;font-weight:600}
.space-access-notice p{margin:8px 0 16px}.space-access-notice a,.space-access-notice button{display:inline-block;color:#2563eb;margin-right:16px;text-decoration:underline;cursor:pointer}
:global(html.dark) .space-access-notice{background:#232932;color:#e3e6ed;border-color:#465261}
:global(html.dark) .space-access-notice a,:global(html.dark) .space-access-notice button{color:#93c5fd}
</style>
