<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-3 text-2xl font-semibold">Восстановление пароля</h1>
    <p class="mb-5 text-sm text-gray-600">Для внешних пользователей Space. Укажите email, использованный при регистрации. Для доменной учётной записи обратитесь в ИТ-службу.</p>
    <form v-if="!message" class="flex flex-col gap-4" @submit.prevent="submit">
      <label>Email
        <input v-model="email" type="email" autocomplete="email" required maxlength="255" class="mt-1 w-full rounded border p-2" :disabled="busy">
      </label>
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <button type="submit" :disabled="busy" class="rounded bg-sky-700 p-3 text-white disabled:opacity-50">{{ busy ? 'Отправка…' : 'Отправить ссылку' }}</button>
    </form>
    <p v-else role="status" class="rounded bg-green-50 p-4">{{ message }}</p>
    <NuxtLink to="/login" class="mt-5 block text-sky-700">Вернуться ко входу</NuxtLink>
  </main>
</template>
<script setup lang="ts">
import { ref } from 'vue';
definePageMeta({ layout: 'auth', public: true });
useHead({ title: 'Восстановление пароля — Space', meta: [{ name: 'robots', content: 'noindex,nofollow' }] });
const email = ref(''), error = ref(''), message = ref(''), busy = ref(false);
async function submit() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try {
    const result = await $fetch<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email: email.value } });
    message.value = result.message;
  } catch { error.value = 'Не удалось обработать запрос. Повторите позже.'; }
  finally { busy.value = false; }
}
</script>
