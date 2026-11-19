<script setup lang="ts">
import { useProfileSettings } from '~/composables/useProfileSettings';

definePageMeta({ public: false });
useSeoMeta({ title: 'Мой профиль — Space' });

const { user, ready, busy, error, load, draft, notice, apply, defaults, confirmReset, resetTable, notificationFields, legacyAvailable, importLegacy } = useProfileSettings();
const tabs = [
  { key: 'personal', label: 'Личные данные', icon: 'i-lucide-user-round' },
  { key: 'display', label: 'Оформление', icon: 'i-lucide-palette' },
  { key: 'notifications', label: 'Уведомления', icon: 'i-lucide-bell' },
  { key: 'tables', label: 'Рабочие таблицы', icon: 'i-lucide-table-2' },
] as const;
type ProfileTab = typeof tabs[number]['key'];
const activeTab = ref<ProfileTab>('personal');

function onTabKeydown(event: KeyboardEvent, index: number) {
  let next = index;
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
  else if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
  else if (event.key === 'Home') next = 0;
  else if (event.key === 'End') next = tabs.length - 1;
  else return;
  event.preventDefault();
  const tab = tabs[next]!;
  activeTab.value = tab.key;
  nextTick(() => document.getElementById(`profile-tab-${tab.key}`)?.focus());
}

const testEmailBusy = ref(false);
const testEmailNotice = ref('');
const testEmailError = ref('');
const testEmailRecipient = computed(() => user.value?.email?.trim() || '');

async function sendTestEmail() {
  if (testEmailBusy.value || !testEmailRecipient.value) return;
  testEmailBusy.value = true;
  testEmailNotice.value = '';
  testEmailError.value = '';
  try {
    const response = await $fetch<{ message: string }>('/api/profile/test-email', {
      method: 'POST',
      headers: { 'x-space-profile': '1' },
    });
    testEmailNotice.value = response.message;
  } catch (cause: any) {
    testEmailError.value = cause?.data?.message || 'Не удалось отправить письмо. Повторите попытку позже.';
  } finally {
    testEmailBusy.value = false;
  }
}
</script>

<template>
  <div class="space-profile">
    <header class="profile-heading">
      <div>
        <nav aria-label="Хлебные крошки" class="profile-breadcrumbs"><NuxtLink to="/">Главная</NuxtLink> / Мой профиль</nav>
        <div class="profile-heading-line">
          <h1>Мой профиль</h1>
          <span>{{ user?.fullName || user?.name || user?.login }}</span>
        </div>
      </div>
      <span v-if="user?.email" class="profile-heading-email">{{ user.email }}</span>
    </header>

    <nav class="profile-tabs" role="tablist" aria-label="Разделы личного кабинета">
      <button
        v-for="(tab, index) in tabs"
        :id="`profile-tab-${tab.key}`"
        :key="tab.key"
        type="button"
        role="tab"
        class="profile-tab"
        :class="{ 'profile-tab--active': activeTab === tab.key }"
        :aria-selected="activeTab === tab.key"
        :aria-controls="`profile-panel-${tab.key}`"
        :tabindex="activeTab === tab.key ? 0 : -1"
        @click="activeTab = tab.key"
        @keydown="onTabKeydown($event, index)"
      >
        <UIcon :name="tab.icon" class="profile-tab-icon" aria-hidden="true" />
        {{ tab.label }}
      </button>
    </nav>

    <div class="profile-panels">
      <section id="profile-panel-personal" v-show="activeTab === 'personal'" role="tabpanel" aria-labelledby="profile-tab-personal" tabindex="0" class="profile-panel">
        <ProfilePersonalDetails />
      </section>

      <section id="profile-panel-display" v-show="activeTab === 'display'" role="tabpanel" aria-labelledby="profile-tab-display" tabindex="0" class="profile-panel">
        <form v-if="ready" class="profile-tab-card" @submit.prevent="apply">
          <div class="profile-card-heading"><h2>Оформление и читаемость</h2><p>Настройте внешний вид Space под свои предпочтения.</p></div>
          <fieldset :disabled="busy" class="profile-fields">
            <div class="profile-settings-grid">
              <label>Тема<select v-model="draft.display.theme"><option value="system">Как в системе</option><option value="light">Светлая</option><option value="dark">Тёмная</option></select></label>
              <label>Контраст<select v-model="draft.display.contrast"><option value="normal">Обычный</option><option value="high">Повышенный</option></select></label>
              <label>Размер текста<select v-model="draft.display.textSize"><option value="normal">Обычный</option><option value="large">Крупный</option><option value="largest">Очень крупный</option></select></label>
              <label>Плотность интерфейса<select v-model="draft.display.density"><option value="compact">Компактная</option><option value="comfortable">Комфортная</option></select></label>
            </div>
            <label class="profile-checkbox"><input v-model="draft.display.expandedForms" type="checkbox"> Разворачивать формы реестра на всю область браузера</label>
            <p class="profile-hint">Повышенный контраст использует светлую палитру независимо от выбранной темы.</p>
            <div><UButton type="button" variant="outline" color="neutral" @click="draft.display = { ...draft.display, contrast: 'high', textSize: 'large', density: 'comfortable' }">Повышенная читаемость</UButton></div>
          </fieldset>
          <p v-if="error" role="alert" class="profile-error">{{ error }}</p>
          <p v-if="notice" role="status" class="profile-feedback">{{ notice }}</p>
          <div class="profile-actions"><UButton type="submit" :loading="busy">Применить</UButton><UButton type="button" variant="outline" color="neutral" :disabled="busy" @click="defaults">Восстановить по умолчанию</UButton></div>
        </form>
        <div v-else class="profile-tab-card profile-state"><p v-if="error" role="alert">{{ error }} <button type="button" class="underline" @click="load">Повторить</button></p><p v-else role="status">Загрузка настроек…</p></div>
      </section>

      <section id="profile-panel-notifications" v-show="activeTab === 'notifications'" role="tabpanel" aria-labelledby="profile-tab-notifications" tabindex="0" class="profile-panel">
        <form v-if="ready" class="profile-tab-card" @submit.prevent="apply">
          <div class="profile-card-heading"><h2>Уведомления</h2><p>Управление подсказками, сообщениями чата и звуковыми сигналами.</p></div>
          <fieldset :disabled="busy" class="profile-fields profile-notification-fields">
            <label v-for="item in notificationFields" :key="item.key" class="profile-checkbox"><input v-model="draft.notifications[item.key]" type="checkbox">{{ item.label }}</label>
          </fieldset>
          <p class="profile-hint">Ошибки и предупреждения остаются видимыми. Счётчик непрочитанных сообщений не отключается. Для звука браузеру может потребоваться взаимодействие со страницей.</p>
          <div class="profile-mail-test">
            <div>
              <h3>Проверка электронной почты</h3>
              <p v-if="testEmailRecipient">Тестовое письмо будет отправлено на <strong>{{ testEmailRecipient }}</strong>.</p>
              <p v-else>В вашей учётной записи не указан адрес электронной почты.</p>
            </div>
            <UButton type="button" variant="outline" color="neutral" :loading="testEmailBusy" :disabled="!testEmailRecipient || testEmailBusy" @click="sendTestEmail">Отправить тестовое письмо</UButton>
          </div>
          <p v-if="testEmailNotice" role="status" class="profile-feedback">{{ testEmailNotice }}</p>
          <p v-if="testEmailError" role="alert" class="profile-error">{{ testEmailError }}</p>
          <p v-if="error" role="alert" class="profile-error">{{ error }}</p>
          <p v-if="notice" role="status" class="profile-feedback">{{ notice }}</p>
          <div class="profile-actions"><UButton type="submit" :loading="busy">Применить</UButton><UButton type="button" variant="outline" color="neutral" :disabled="busy" @click="defaults">Восстановить по умолчанию</UButton></div>
        </form>
        <div v-else class="profile-tab-card profile-state"><p v-if="error" role="alert">{{ error }} <button type="button" class="underline" @click="load">Повторить</button></p><p v-else role="status">Загрузка настроек…</p></div>
      </section>

      <section id="profile-panel-tables" v-show="activeTab === 'tables'" role="tabpanel" aria-labelledby="profile-tab-tables" tabindex="0" class="profile-panel">
        <div v-if="ready" class="profile-tab-card">
          <div class="profile-card-heading"><h2>Рабочие таблицы</h2><p>Порядок и видимость колонок реестра сохраняются в вашем профиле. Изменять их можно непосредственно в таблице.</p></div>
          <div class="profile-actions">
            <UButton v-if="legacyAvailable" type="button" variant="outline" color="neutral" :disabled="busy" @click="importLegacy">Перенести старые настройки этого браузера</UButton>
            <UButton type="button" variant="outline" color="neutral" :disabled="busy" @click="confirmReset = true">Сбросить настройки реестра</UButton>
          </div>
          <div v-if="confirmReset" class="profile-confirm">
            <p>Восстановить стандартный набор и порядок колонок?</p>
            <div class="profile-actions"><UButton type="button" :loading="busy" @click="resetTable">Восстановить</UButton><UButton type="button" variant="ghost" color="neutral" @click="confirmReset = false">Отмена</UButton></div>
          </div>
          <p v-if="error" role="alert" class="profile-error">{{ error }}</p>
          <p v-if="notice" role="status" class="profile-feedback">{{ notice }}</p>
        </div>
        <div v-else class="profile-tab-card profile-state"><p v-if="error" role="alert">{{ error }} <button type="button" class="underline" @click="load">Повторить</button></p><p v-else role="status">Загрузка настроек…</p></div>
      </section>
    </div>
  </div>
</template>

<style>
.space-profile {
  /* Keep the workspace distinct from the light-gray global sidebar. */
  --profile-bg: #e5edf7; --profile-panel: #f9fafc; --profile-subtle: #eaf0f6;
  --profile-border: #c9d4e2; --profile-text: #172b45; --profile-muted: #546782; --profile-accent: #2463ad;
  display: flex; flex-direction: column; box-sizing: border-box; width: 100%; height: 100%; min-height: 0; min-width: 0;
  overflow: hidden; padding: 14px clamp(12px, 2vw, 24px); background: var(--profile-bg); color: var(--profile-text);
  border-left: 1px solid #bdcddd; box-shadow: inset 7px 0 12px -11px rgb(28 62 99 / .28);
  font-size: .875rem; line-height: 1.4;
}
html.dark:not([data-space-contrast="high"]) .space-profile {
  /* Global sidebar is #15181e in graphite mode; the cabinet uses a raised slate surface. */
  --profile-bg: #243140; --profile-panel: var(--space-panel, #1d222b); --profile-subtle: var(--space-raised, #272e39);
  --profile-border: var(--space-line, #465263); --profile-text: var(--space-text, #e6eaf0);
  --profile-muted: var(--space-muted, #b0bbcb); --profile-accent: var(--space-accent, #8db8ff);
  border-left-color: #485c71; box-shadow: inset 7px 0 13px -10px rgb(0 0 0 / .55);
}
.profile-heading { display: flex; align-items: end; justify-content: space-between; min-width: 0; gap: 12px; flex: none; margin-bottom: 12px; }
.profile-breadcrumbs { color: var(--profile-muted); font-size: .75rem; margin-bottom: 4px; }
.profile-breadcrumbs a:hover { color: var(--profile-accent); text-decoration: underline; }
.profile-heading-line { display: flex; align-items: baseline; flex-wrap: wrap; gap: 12px; }
.profile-heading h1 { font-size: 1.25rem; font-weight: 650; line-height: 1.3; }
.profile-heading-email { max-width: 40%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--profile-muted); font-size: .8125rem; }
.profile-tabs { display: flex; align-items: stretch; flex: none; min-width: 0; gap: 4px; padding: 0 8px; border-bottom: 1px solid var(--profile-border); overflow-x: auto; scrollbar-width: none; }
.profile-tabs::-webkit-scrollbar, .profile-panel::-webkit-scrollbar { display: none; }
.profile-tab { display: flex; align-items: center; justify-content: center; gap: 8px; flex: none; min-height: 42px; padding: 8px 16px; border: 1px solid transparent; border-bottom: 2px solid transparent; border-radius: 7px 7px 0 0; color: var(--profile-muted); white-space: nowrap; cursor: pointer; transition: background-color .15s ease, color .15s ease, border-color .15s ease; }
.profile-tab:hover { background: var(--profile-subtle); color: var(--profile-text); }
.profile-tab--active { color: var(--profile-accent); background: var(--profile-panel); border-color: var(--profile-border); border-bottom-color: var(--profile-accent); font-weight: 650; }
.profile-tab-icon { width: 16px; height: 16px; flex-shrink: 0; }
.profile-panels { flex: 1; min-height: 0; min-width: 0; padding-top: 12px; }
.profile-panel { height: 100%; min-height: 0; min-width: 0; overflow: auto; overscroll-behavior: contain; scrollbar-width: none; }
.profile-tab-card, .space-profile .profile-card { box-sizing: border-box; border: 1px solid var(--profile-border); border-radius: 10px; background: var(--profile-panel); box-shadow: 0 3px 12px rgb(15 23 42 / .08); padding: clamp(12px, 1.5vw, 20px); }
html.dark:not([data-space-contrast="high"]) .space-profile :is(.profile-tab-card, .profile-card) { box-shadow: 0 4px 16px rgb(0 0 0 / .24); }
.profile-tab-card { display: flex; flex-direction: column; gap: 14px; max-width: 1100px; min-height: min(100%, 260px); margin: 0 auto; }
.profile-card-heading { border-bottom: 1px solid var(--profile-border); padding-bottom: 10px; }
.profile-card-heading h2, .space-profile .profile-card h2 { font-size: 1rem; font-weight: 650; margin: 0 0 4px; }
.profile-card-heading p, .profile-hint { color: var(--profile-muted); font-size: .8125rem; }
.space-profile .profile-fields { border: 0; min-width: 0; padding: 0; margin: 0; display: grid; gap: 12px; }
.profile-settings-grid, .space-profile .profile-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 18px; }
.space-profile :is(select, input:not([type=checkbox]):not([type=file]), textarea) { display: block; box-sizing: border-box; width: 100%; min-width: 0; margin-top: 5px; padding: 7px 9px; border: 1px solid var(--space-field-border, var(--profile-border)); border-radius: 6px; background: var(--ui-bg, #fff); color: var(--ui-text, var(--profile-text)); font: inherit; }
.space-profile textarea { resize: vertical; }
.space-profile input[type=checkbox] { width: 16px; height: 16px; flex: none; accent-color: var(--profile-accent); }
.profile-checkbox { display: flex; align-items: center; gap: 10px; min-width: 0; cursor: pointer; }
.profile-notification-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.profile-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.profile-mail-test { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px 18px; border: 1px solid var(--profile-border); border-radius: 8px; background: var(--profile-subtle); padding: 14px; }
.profile-mail-test h3 { font-weight: 650; margin-bottom: 4px; }
.profile-mail-test p { color: var(--profile-muted); font-size: .8125rem; overflow-wrap: anywhere; }
.profile-feedback { border-radius: 6px; border: 1px solid var(--profile-border); background: var(--profile-subtle); padding: 8px 10px; font-size: .8125rem; }
.space-profile .profile-error { border-radius: 6px; border: 1px solid #d97777; color: #a11d2b; padding: 8px 10px; font-size: .8125rem; }
html.dark:not([data-space-contrast="high"]) .space-profile .profile-error { color: #fca5a5; }
.profile-confirm { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--profile-border); border-radius: 8px; background: var(--profile-subtle); }
.profile-state { min-height: 100px; justify-content: center; }
.space-profile .profile-personal-card { display: flex; flex-direction: column; gap: 12px; width: 100%; max-width: 1200px; margin: 0 auto; }
.space-profile .profile-personal-layout { display: grid; grid-template-columns: minmax(230px, .8fr) minmax(0, 1.7fr); gap: 22px; min-width: 0; }
.space-profile .profile-identity { display: flex; flex-direction: column; gap: 14px; min-width: 0; border-right: 1px solid var(--profile-border); padding-right: 18px; }
.space-profile .profile-account { grid-template-columns: 1fr; gap: 8px; }
.space-profile .profile-account dt { font-size: .75rem; color: var(--profile-muted); }
.space-profile .profile-account dd { margin: 1px 0 0; overflow-wrap: anywhere; }
.space-profile .profile-photo-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.space-profile .profile-photo { width: 66px; height: 66px; border-radius: 50%; object-fit: cover; flex: none; border: 1px solid var(--profile-border); }
.space-profile .profile-placeholder { display: grid; place-items: center; font-size: 1.5rem; background: var(--profile-subtle); }
.space-profile .profile-upload { font-weight: 600; }
.space-profile input[type=file] { display: block; max-width: 100%; font-size: .75rem; margin-top: 4px; }
.space-profile .profile-personal-form { min-width: 0; }
.space-profile .profile-contact-fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.space-profile .profile-personal-form .profile-form-actions { margin-top: 2px; }
@media (max-width: 980px) {
  .space-profile .profile-personal-layout { grid-template-columns: 1fr; gap: 12px; }
  .space-profile .profile-identity { display: grid; grid-template-columns: minmax(160px, .8fr) minmax(0, 1.5fr); border-right: 0; border-bottom: 1px solid var(--profile-border); padding: 0 0 12px; }
  .space-profile .profile-account { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 650px) {
  .space-profile { padding: 10px; }
  .profile-heading-email { display: none; }
  .profile-tab { padding: 8px 12px; }
  .profile-settings-grid, .space-profile .profile-grid, .profile-notification-fields, .space-profile .profile-identity { grid-template-columns: minmax(0, 1fr); }
  .profile-mail-test { align-items: stretch; }
}
</style>
