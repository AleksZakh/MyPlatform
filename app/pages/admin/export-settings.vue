<script setup lang="ts">
useSeoMeta({ title: 'Space — настройки экспорта' })
const { data, error, refresh } = await useFetch<{ recordLimit: number }>('/api/admin/export-settings')
const limit = ref(500)
watch(data, value => { if (value) limit.value = value.recordLimit }, { immediate: true })
const saving = ref(false)
const message = ref('')
const valid = computed(() => Number.isInteger(limit.value) && limit.value >= 1 && limit.value <= 10000)
async function save() {
  if (!valid.value || saving.value) return
  saving.value = true; message.value = ''
  try {
    const result = await $fetch<{ recordLimit: number }>('/api/admin/export-settings', {
      method: 'PUT', headers: { 'x-space-settings': '1' }, body: { recordLimit: limit.value },
    })
    limit.value = result.recordLimit
    message.value = 'Настройки сохранены.'
  } catch (error: any) { message.value = error.data?.message || 'Не удалось сохранить настройки.' }
  finally { saving.value = false }
}
</script>
<template>
  <div class="p-6 max-w-3xl space-y-4">
    <h1 class="text-2xl font-semibold">Настройки экспорта</h1>
    <div v-if="error" role="alert">Не удалось загрузить настройки. <UButton @click="refresh()">Повторить</UButton></div>
    <form v-else-if="data" class="rounded border bg-white p-5 space-y-4" @submit.prevent="save">
      <label class="block font-medium" for="export-limit">Максимум записей реестра в одной выгрузке</label>
      <input id="export-limit" v-model.number="limit" type="number" min="1" max="10000" step="1" required class="border rounded p-2" />
      <p class="text-sm text-gray-600">От 1 до 10 000. По умолчанию — 500. Учитываются записи по «Настройке фильтра», независимо от количества документов. Быстрый поиск не учитывается.</p>
      <UButton type="submit" :disabled="!valid || saving" :loading="saving">Сохранить</UButton>
    </form>
    <p role="status">{{ message }}</p>
  </div>
</template>
