<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import type { AppVersion } from '~~/shared/types/app-version';

useHead({ title: 'О программе — Space' });
const info = ref<AppVersion | null>(null);
const loading = ref(false);
const error = ref('');
let controller: AbortController | undefined;
const installed = computed(() => info.value?.installedAt
  ? new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeStyle: 'medium', timeZone: 'Europe/Moscow' }).format(new Date(info.value.installedAt)) + ' (МСК)'
  : 'Дата установки не записана');
async function load() {
  if (loading.value) return;
  controller = new AbortController();
  loading.value = true; error.value = ''; info.value = null;
  try {
    info.value = await $fetch<AppVersion>('/api/app/version', { signal: controller.signal, retry: 0 });
  } catch (e: any) {
    if (controller.signal.aborted) return;
    if (e?.statusCode === 401 || e?.response?.status === 401) { await navigateTo('/login?redirect=/about'); return; }
    error.value = 'Не удалось получить сведения о версии. Повторите попытку.';
  } finally { loading.value = false; }
}
onMounted(load);
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="about-page" aria-labelledby="about-title">
    <div class="about-heading"><div><h1 id="about-title">О программе</h1><p>Корпоративный портал Space</p></div>
      <button type="button" :disabled="loading" @click="load">{{ loading ? 'Загрузка…' : 'Обновить' }}</button>
    </div>
    <div v-if="loading" class="about-card" role="status">Получаем сведения о работающем приложении…</div>
    <div v-else-if="error" class="about-card about-error" role="alert">{{ error }}</div>
    <div v-else-if="info" class="about-card">
      <div class="about-product"><span class="about-mark" aria-hidden="true">S</span><div><h2>{{ info.application }}</h2><p>{{ info.environment === 'production' ? 'Рабочая версия' : 'Среда разработки' }}</p></div></div>
      <dl>
        <div><dt>Версия установленного релиза</dt><dd class="about-release">{{ info.release || (info.environment === 'development' ? 'Локальная версия' : 'Номер релиза не записан') }}</dd></div>
        <div><dt>Дата установки</dt><dd>{{ installed }}</dd></div>
        <div v-if="info.commit"><dt>Ревизия кода</dt><dd class="about-release">{{ info.commit }}</dd></div>
      </dl>
      <p v-if="!info.installedAt" class="about-note">Дата будет доступна после установки релиза обновлённым механизмом развёртывания.</p>
      <p v-else class="about-note">Дата установки — активация этого релиза на сервере. Перезапуск приложения её не меняет.</p>
    </div>
  </section>
</template>

<style scoped>
.about-page{max-width:920px;margin:0 auto;padding:24px;color:var(--space-text,#172b45)}
.about-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:18px}
.about-heading h1{font-size:26px;font-weight:650;margin:0 0 5px}.about-heading p,.about-product p{color:var(--space-muted,#64748b);margin:0}
.about-heading button{border:1px solid var(--space-line,#d7e1ef);border-radius:8px;padding:9px 15px;background:var(--space-panel,#fff);color:inherit;cursor:pointer}.about-heading button:hover{background:var(--space-raised,#edf4ff)}.about-heading button:disabled{opacity:.6;cursor:wait}.about-heading button:focus-visible{outline:2px solid var(--space-accent,#2563eb);outline-offset:3px}
.about-card{border:1px solid var(--space-line,#d7e1ef);border-radius:12px;background:var(--space-panel,#fff);padding:24px}
.about-product{display:flex;align-items:center;gap:14px;margin-bottom:24px}.about-product h2{font-size:21px;font-weight:650;margin:0 0 4px}.about-mark{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;background:#2563eb;color:white;font-size:26px;font-weight:700;flex-shrink:0}
dl{margin:0}dl>div{display:grid;grid-template-columns:240px minmax(0,1fr);gap:18px;padding:16px 0;border-top:1px solid var(--space-line,#d7e1ef)}dt{color:var(--space-muted,#64748b)}dd{margin:0;overflow-wrap:anywhere}.about-release{font-family:ui-monospace,SFMono-Regular,monospace;font-size:14px}.about-note{font-size:13px;line-height:1.6;color:var(--space-muted,#64748b);margin:20px 0 0}.about-error{border-color:#dc6b6b}
@media(max-width:600px){.about-page{padding:16px}.about-heading{align-items:flex-start;flex-wrap:wrap}.about-card{padding:18px}dl>div{grid-template-columns:1fr;gap:6px}.about-heading h1{font-size:23px}}
</style>
