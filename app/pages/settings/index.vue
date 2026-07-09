<!-- pages/test/ad2-check.vue -->
<template>
  <div class="p-4">
    <h1>Тест подключения к домену (activedirectory2)</h1>
    <button
      class="bg-blue-500 text-white px-4 py-2 rounded"
      @click="checkConnection"
      :disabled="loading"
    >
      {{ loading ? 'Проверка...' : 'Проверить подключение' }}
    </button>
    <pre v-if="result">{{ JSON.stringify(result, null, 2) }}</pre>
  </div>
</template>

<script setup>
const loading = ref(false);
const result = ref(null);

async function checkConnection() {
  loading.value = true;
  try {
    const response = await fetch('/api/test/domain-connection');
    result.value = await response.json();

    console.log('=== РЕЗУЛЬТАТ ТЕСТА ===');
    if (result.value.success) {
      console.log('✅ УСПЕХ: Веб-приложение подключено к домену');
    } else {
      console.log('❌ ОШИБКА: Веб-приложение НЕ подключено к домену');
    }
    console.log('Сообщение:', result.value.message);
    console.log('Время:', result.value.elapsedMs, 'ms');
  } catch (error) {
    console.error('❌ Ошибка запроса:', error);
  } finally {
    loading.value = false;
  }
}
</script>
