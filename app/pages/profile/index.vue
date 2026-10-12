<script setup lang="ts">
import { useProfileSettings } from '~/composables/useProfileSettings';
definePageMeta({ public: false });
useSeoMeta({ title: 'Мой профиль — Space' });
const { user, ready, busy, error, load, draft, notice, apply, defaults, confirmReset, resetTable, notificationFields, legacyAvailable, importLegacy } = useProfileSettings();
</script>
<template>
  <main class="space-profile mx-auto max-w-5xl p-4 sm:p-6 space-y-6">
    <nav aria-label="Хлебные крошки"><NuxtLink to="/" class="underline">Главная</NuxtLink> / Мой профиль</nav>
    <header><h1 class="text-2xl font-semibold">Мой профиль</h1><p class="mt-2">{{ user?.fullName || user?.name || user?.login }}</p><p class="text-sm">{{ user?.email || user?.login }}</p></header>
    <p v-if="error" role="alert" class="rounded border border-red-700 p-3 text-red-800">{{ error }} <button v-if="!ready" type="button" class="underline" @click="load">Повторить</button></p>
    <p v-if="!ready && !error" role="status">Загрузка настроек…</p>
    <form v-if="ready" class="space-y-6" @submit.prevent="apply">
      <fieldset :disabled="busy" class="rounded-lg border p-4 space-y-4">
        <legend class="px-2 text-lg font-semibold">Оформление и читаемость</legend>
        <div class="grid gap-4 sm:grid-cols-2">
          <label>Тема<select v-model="draft.display.theme"><option value="system">Как в системе</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select></label>
          <label>Контраст<select v-model="draft.display.contrast"><option value="normal">Обычный</option><option value="high">Повышенный</option></select></label>
          <label>Размер текста<select v-model="draft.display.textSize"><option value="normal">Обычный</option><option value="large">Крупный</option><option value="largest">Очень крупный</option></select></label>
          <label>Плотность интерфейса<select v-model="draft.display.density"><option value="compact">Компактная</option><option value="comfortable">Комфортная</option></select></label>
        </div>
        <label class="flex gap-2 items-center"><input v-model="draft.display.expandedForms" type="checkbox"> Разворачивать формы реестра на всю область браузера</label>
        <p class="text-sm">Повышенный контраст использует светлую палитру независимо от выбранной темы.</p>
        <UButton type="button" variant="outline" color="neutral" @click="draft.display = { ...draft.display, contrast: 'high', textSize: 'large', density: 'comfortable' }">Повышенная читаемость</UButton>
      </fieldset>
      <fieldset :disabled="busy" class="rounded-lg border p-4 space-y-4">
        <legend class="px-2 text-lg font-semibold">Уведомления</legend>
        <label v-for="item in notificationFields" :key="item.key" class="flex items-center gap-2"><input v-model="draft.notifications[item.key]" type="checkbox">{{ item.label }}</label>
        <p class="text-sm">Ошибки и предупреждения остаются видимыми. Счётчик непрочитанных сообщений не отключается. Для звука браузеру может потребоваться нажатие на страницу.</p>
      </fieldset>
      <div class="flex flex-wrap gap-3"><UButton type="submit" :loading="busy">Применить</UButton><UButton type="button" variant="outline" color="neutral" :disabled="busy" @click="defaults">Восстановить по умолчанию</UButton></div>
    </form>
    <p v-if="notice" role="status" class="border rounded p-3">{{ notice }}</p>
    <section v-if="ready" class="rounded-lg border p-4 space-y-3"><h2 class="text-lg font-semibold">Рабочие таблицы</h2><p>Порядок и видимость колонок реестра сохраняются в вашем профиле. Изменять их можно непосредственно в таблице.</p><UButton v-if="legacyAvailable" variant="outline" color="neutral" :disabled="busy" @click="importLegacy">Перенести старые настройки этого браузера</UButton> <UButton variant="outline" color="neutral" :disabled="busy" @click="confirmReset = true">Сбросить настройки реестра</UButton>
      <div v-if="confirmReset" class="border rounded p-3 space-y-2"><p>Восстановить стандартный набор и порядок колонок?</p><UButton :loading="busy" @click="resetTable">Восстановить</UButton> <UButton variant="ghost" color="neutral" @click="confirmReset = false">Отмена</UButton></div>
    </section>
  </main>
</template>
<style scoped>
.space-profile select { display: block; width: 100%; margin-top: .4rem; padding: .6rem; border: 1px solid #64748b; border-radius: .4rem; background: white; color: #172033; }
.space-profile input[type=checkbox] { width: 1.15rem; height: 1.15rem; flex-shrink: 0; }
</style>
