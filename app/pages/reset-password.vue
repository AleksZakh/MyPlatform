<template>
  <main class="mx-auto max-w-md p-6">
    <h1 class="mb-4 text-2xl font-semibold">Новый пароль Space</h1>
    <p v-if="message" role="status" class="rounded bg-green-50 p-4">{{ message }}</p>
    <form v-else-if="token" class="flex flex-col gap-4" @submit.prevent="submit">
      <label>Новый пароль (12–128 символов)
        <input v-model="password" type="password" autocomplete="new-password" required minlength="12" maxlength="128" class="mt-1 w-full rounded border p-2" :disabled="busy">
      </label>
      <label>Повторите пароль
        <input v-model="confirmation" type="password" autocomplete="new-password" required minlength="12" maxlength="128" class="mt-1 w-full rounded border p-2" :disabled="busy">
      </label>
      <p v-if="error" role="alert" class="text-red-700">{{ error }}</p>
      <button type="submit" :disabled="busy" class="rounded bg-sky-700 p-3 text-white disabled:opacity-50">{{ busy ? 'Сохранение…' : 'Изменить пароль' }}</button>
    </form>
    <p v-else-if="loaded" class="text-red-700">В ссылке отсутствует действительный код восстановления.</p>
    <NuxtLink to="/forgot-password" class="mt-4 block text-sky-700">Запросить новую ссылку</NuxtLink>
    <NuxtLink to="/login" class="mt-4 block text-sky-700">Вернуться ко входу</NuxtLink>
  </main>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue';
definePageMeta({ layout: 'auth', public: true });
useHead({ title: 'Новый пароль — Space', meta: [{ name: 'robots', content: 'noindex,nofollow' }, { name: 'referrer', content: 'no-referrer' }] });
const token = ref(''), password = ref(''), confirmation = ref(''), error = ref(''), message = ref('');
const busy = ref(false), loaded = ref(false);
onMounted(() => {
  const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
  if (/^[a-f0-9]{64}$/.test(value)) token.value = value;
  window.history.replaceState(window.history.state, '', window.location.pathname);
  loaded.value = true;
});
async function submit() {
  if (busy.value) return;
  error.value = '';
  if (password.value !== confirmation.value) { error.value = 'Пароли не совпадают.'; return; }
  busy.value = true;
  try {
    const result = await $fetch<{ message: string }>('/api/auth/reset-password', { method: 'POST',
      body: { token: token.value, password: password.value } });
    message.value = result.message; token.value = ''; password.value = ''; confirmation.value = '';
  } catch (e: unknown) {
    const data = e as { data?: { message?: string } };
    error.value = data.data?.message || 'Не удалось изменить пароль. Повторите запрос или получите новую ссылку.';
  } finally { busy.value = false; }
}
</script>
