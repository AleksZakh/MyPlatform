<script setup lang="ts">
import { useProfileSettings } from '~/composables/useProfileSettings';
definePageMeta({ public: false });
useSeoMeta({ title: 'Мой профиль — Space' });
const { user, ready, busy, error, load, draft, notice, apply, defaults, confirmReset, resetTable, notificationFields, legacyAvailable, importLegacy } = useProfileSettings();
</script>
<template>
  <div class="profile-scroll" tabindex="0" aria-label="Настройки профиля"><div class="space-profile">
    <nav aria-label="Хлебные крошки"><NuxtLink to="/" class="underline">Главная</NuxtLink> / Мой профиль</nav>
    <header><h1 class="text-xl font-semibold">Мой профиль</h1><p class="mt-2">{{ user?.fullName || user?.name || user?.login }}</p><p class="text-sm">{{ user?.email || user?.login }}</p></header>
    <ProfilePersonalDetails />
    <p v-if="error" role="alert" class="rounded border border-red-700 p-3 text-red-800">{{ error }} <button v-if="!ready" type="button" class="underline" @click="load">Повторить</button></p>
    <p v-if="!ready && !error" role="status">Загрузка настроек…</p>
    <form v-if="ready" class="space-y-3" @submit.prevent="apply">
      <fieldset :disabled="busy" class="rounded-lg border p-3 space-y-3">
        <legend class="px-2 text-base font-semibold">Оформление и читаемость</legend>
        <div class="grid gap-3 sm:grid-cols-2">
          <label>Тема<select v-model="draft.display.theme"><option value="system">Как в системе</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select></label>
          <label>Контраст<select v-model="draft.display.contrast"><option value="normal">Обычный</option><option value="high">Повышенный</option></select></label>
          <label>Размер текста<select v-model="draft.display.textSize"><option value="normal">Обычный</option><option value="large">Крупный</option><option value="largest">Очень крупный</option></select></label>
          <label>Плотность интерфейса<select v-model="draft.display.density"><option value="compact">Компактная</option><option value="comfortable">Комфортная</option></select></label>
        </div>
        <label class="flex gap-2 items-center"><input v-model="draft.display.expandedForms" type="checkbox"> Разворачивать формы реестра на всю область браузера</label>
        <p class="text-sm">Повышенный контраст использует светлую палитру независимо от выбранной темы.</p>
        <UButton type="button" variant="outline" color="neutral" @click="draft.display = { ...draft.display, contrast: 'high', textSize: 'large', density: 'comfortable' }">Повышенная читаемость</UButton>
      </fieldset>
      <fieldset :disabled="busy" class="rounded-lg border p-3 space-y-3">
        <legend class="px-2 text-base font-semibold">Уведомления</legend>
        <label v-for="item in notificationFields" :key="item.key" class="flex items-center gap-2"><input v-model="draft.notifications[item.key]" type="checkbox">{{ item.label }}</label>
        <p class="text-sm">Ошибки и предупреждения остаются видимыми. Счётчик непрочитанных сообщений не отключается. Для звука браузеру может потребоваться нажатие на страницу.</p>
      </fieldset>
      <div class="flex flex-wrap gap-3"><UButton type="submit" :loading="busy">Применить</UButton><UButton type="button" variant="outline" color="neutral" :disabled="busy" @click="defaults">Восстановить по умолчанию</UButton></div>
    </form>
    <p v-if="notice" role="status" class="border rounded p-3">{{ notice }}</p>
    <section v-if="ready" class="rounded-lg border p-3 space-y-3"><h2 class="text-base font-semibold">Рабочие таблицы</h2><p>Порядок и видимость колонок реестра сохраняются в вашем профиле. Изменять их можно непосредственно в таблице.</p><UButton v-if="legacyAvailable" variant="outline" color="neutral" :disabled="busy" @click="importLegacy">Перенести старые настройки этого браузера</UButton> <UButton variant="outline" color="neutral" :disabled="busy" @click="confirmReset = true">Сбросить настройки реестра</UButton>
      <div v-if="confirmReset" class="border rounded p-3 space-y-2"><p>Восстановить стандартный набор и порядок колонок?</p><UButton :loading="busy" @click="resetTable">Восстановить</UButton> <UButton variant="ghost" color="neutral" @click="confirmReset = false">Отмена</UButton></div>
    </section>
  </div></div>
</template>
<style>
.profile-scroll { height: 100%; min-height: 0; overflow: auto; overscroll-behavior: contain; scrollbar-gutter: stable; }
.space-profile { box-sizing: border-box; width: 100%; max-width: 64rem; margin: 0 auto; padding: 1rem; font-size: .875rem; line-height: 1.5; }
.space-profile > * + * { margin-top: 1rem; }
.space-profile :is(fieldset, section, .profile-grid > *) { min-width: 0; }
.space-profile :is(select, input:not([type=checkbox]):not([type=file]), textarea) { display: block; box-sizing: border-box; width: 100%; margin-top: .25rem; padding: .4rem .5rem; border: 1px solid var(--space-field-border, #64748b); border-radius: .375rem; background: var(--ui-bg, white); color: var(--ui-text, #172033); font: inherit; }
.space-profile textarea { resize: vertical; }
.space-profile input[type=checkbox] { width: 1rem; height: 1rem; flex-shrink: 0; }
.space-profile .profile-card { border: 1px solid var(--space-field-border, #64748b); border-radius: .5rem; padding: .75rem; }
.space-profile .profile-card > * + * { margin-top: .75rem; }
.space-profile h2 { font-size: 1rem; font-weight: 600; }
.space-profile .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
.space-profile .profile-fields { border: 0; padding: 0; display: grid; gap: .75rem; }
.space-profile .profile-account dd { margin: 0; overflow-wrap: anywhere; }
.space-profile .profile-account dt { font-weight: 600; }
.space-profile .profile-photo-row { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
.space-profile .profile-photo { width: 5rem; height: 5rem; border-radius: 50%; object-fit: cover; flex-shrink: 0; border: 1px solid currentColor; }
.space-profile .profile-placeholder { display: grid; place-items: center; font-size: 1.75rem; }
.space-profile .profile-upload { display: block; font-weight: 600; }
.space-profile input[type=file] { display: block; max-width: 100%; font: inherit; margin-top: .25rem; }
.space-profile .profile-hint { font-size: .8125rem; margin-top: .25rem; }
.space-profile .profile-error { color: #b91c1c; border: 1px solid currentColor; padding: .5rem; border-radius: .375rem; }
html.dark .space-profile .profile-error { color: #fca5a5; }
@media (max-width: 640px) { .space-profile { padding: .75rem; } .space-profile .profile-grid { grid-template-columns: minmax(0, 1fr); } }
</style>
