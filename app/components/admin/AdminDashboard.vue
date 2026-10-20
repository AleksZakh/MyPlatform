<script setup lang="ts">
import { computed, ref } from 'vue';
import type { NavigationData, NavigationItem } from '~~/shared/navigation/catalog';
import type { AdminDashboardActivity, AdminDashboardSummary } from '~~/shared/types/admin-dashboard';
import AdminActivityChart from './AdminActivityChart.vue';
const props = defineProps<{ navigation: NavigationData | null; summary: AdminDashboardSummary | null;
  activity: AdminDashboardActivity | null; loading: boolean; navigationError?: boolean; summaryError: string; activityError: string }>();
const emit = defineEmits<{ refresh: [] }>();
const search = ref(''), category = ref('all');
const tools = computed(() => props.navigation?.tools || []);
const has = (to: string) => tools.value.some(t => t.to === to);
const categories = [ { key: 'all', label: 'Все инструменты' }, { key: 'people', label: 'Команда' },
  { key: 'access', label: 'Доступ и структура' }, { key: 'content', label: 'Файлы и контент' }, { key: 'control', label: 'Контроль' } ];
function group(tool: NavigationItem) {
  if (['/admin/users', '/online', '/admin/registration-requests'].includes(tool.to)) return 'people';
  if (/^\/admin\/(access|structure)/.test(tool.to)) return 'access';
  if (['/admin/files', '/admin/export-settings', '/library/video-settings'].includes(tool.to)) return 'content';
  return 'control';
}
const visibleCategories = computed(() => categories.filter(c => c.key === 'all' || tools.value.some(t => group(t) === c.key)));
const filtered = computed(() => tools.value.filter(tool => (category.value === 'all' || group(tool) === category.value)
  && `${tool.label} ${tool.description || ''}`.toLocaleLowerCase('ru').includes(search.value.trim().toLocaleLowerCase('ru'))));
const primary = computed(() => tools.value.find(t => t.to === '/admin/users') || tools.value[0]);
const n = (value: number | undefined | null) => value == null ? '—' : new Intl.NumberFormat('ru-RU').format(value);
const stamp = computed(() => props.summary?.updatedAt ? new Intl.DateTimeFormat('ru-RU', {
  timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(props.summary.updatedAt)) : null);
const metrics = computed(() => {
  const items = [];
  if (has('/admin/users')) items.push({ label: 'Пользователи', icon: 'lucide:users-round', tone: 'green', value: props.summary?.users?.total,
    detail: props.summary?.users ? `${n(props.summary.users.active)} активных учётных записей` : 'Учётные записи Space', to: '/admin/users' });
  if (has('/admin/structure?tab=groups')) items.push({ label: 'Группы Space', icon: 'lucide:layers-3', tone: 'cyan', value: props.summary?.structure?.groups,
    detail: props.summary?.structure ? `${n(props.summary.structure.activeGroups)} активных групп` : 'Структура и состав', to: '/admin/structure?tab=groups' });
  if (!items.length) items.push({ label: 'Инструменты', icon: 'lucide:layout-grid', tone: 'purple', value: tools.value.length, detail: 'Доступно вашей учётной записи', to: '#admin-tools' });
  return items;
});
const states = computed(() => props.summary?.users ? [
  { label: 'Активны', value: props.summary.users.active, tone: 'green' },
  { label: 'Ожидают активации', value: props.summary.users.pending, tone: 'amber' },
  { label: 'Заблокированы', value: props.summary.users.blocked, tone: 'red' },
  { label: 'Отключены', value: props.summary.users.disabled, tone: 'muted' },
] : []);
const activePercent = computed(() => props.summary?.users?.total ? Math.round(props.summary.users.active / props.summary.users.total * 100) : 0);
const donut = computed(() => ({ background: `conic-gradient(var(--ad-primary) ${activePercent.value}%, var(--ad-track) 0)` }));
function reset() { search.value = ''; category.value = 'all'; }
</script>
<template>
  <section class="admin-dashboard" :aria-busy="loading">
    <div class="ad-container">
      <header class="ad-topbar">
        <div><p class="ad-eyebrow">SPACE <span>/</span> АДМИНИСТРИРОВАНИЕ</p><h1>Центр администрирования</h1></div>
        <button class="ad-refresh" :disabled="loading" @click="emit('refresh')"><Icon name="lucide:refresh-cw" :class="{ 'ad-spinning': loading }"/><span>{{ loading ? 'Обновление…' : 'Обновить' }}</span></button>
      </header>
      <p v-if="navigationError" class="ad-alert" role="alert">Не удалось загрузить список инструментов. Нажмите «Обновить», чтобы повторить.</p>
      <p v-if="summaryError" class="ad-alert" role="alert">{{ summaryError }}</p>
      <template v-if="navigation && tools.length">
        <div class="ad-overview">
          <article class="ad-card ad-welcome">
            <div class="ad-welcome-copy"><span class="ad-tag">Рабочее пространство компании</span><h2>Команда. Доступ. Порядок.</h2><p>Все инструменты управления Space —<br class="ad-wide-only"/> в одном рабочем пространстве.</p>
              <NuxtLink v-if="primary" class="ad-soft-button" :to="primary.to">{{ primary.to === '/admin/users' ? 'Управление пользователями' : primary.label }}<Icon name="lucide:arrow-right"/></NuxtLink>
            </div>
            <div class="ad-welcome-art" aria-hidden="true"><div class="ad-art-orbit"></div><div class="ad-art-main"><Icon name="lucide:shield-check"/></div><span class="ad-art-badge ad-art-users"><Icon name="lucide:users-round"/></span><span class="ad-art-badge ad-art-key"><Icon name="lucide:key-round"/></span><span class="ad-art-dot"></span></div>
          </article>
          <div class="ad-metrics"><NuxtLink v-for="metric in metrics" :key="metric.label" :to="metric.to" class="ad-card ad-metric">
            <span class="ad-icon-box" :data-tone="metric.tone"><Icon :name="metric.icon"/></span><span class="ad-metric-label">{{ metric.label }}</span><strong>{{ n(metric.value) }}</strong><span class="ad-metric-detail">{{ metric.detail }}</span><Icon class="ad-metric-arrow" name="lucide:arrow-up-right"/>
          </NuxtLink></div>
        </div>
        <div class="ad-middle">
          <article v-if="has('/admin/statistics')" class="ad-card ad-activity">
            <header class="ad-card-heading"><div><h2>Активность Space</h2><p>Последние 7 суток · московское время</p></div><NuxtLink to="/admin/statistics" class="ad-icon-link" aria-label="Открыть статистику"><Icon name="lucide:arrow-up-right"/></NuxtLink></header>
            <p v-if="activityError" class="ad-inline-error" role="alert">{{ activityError }}</p>
            <div v-else-if="activity" class="ad-activity-body"><div class="ad-chart-panel"><div class="ad-chart-legend"><i></i> События сотрудников</div><AdminActivityChart :daily="activity.daily"/></div>
              <aside class="ad-activity-summary"><span class="ad-muted">Всего событий</span><strong class="ad-big-number">{{ n(activity.summary.events) }}</strong><span class="ad-tag">За 7 суток</span><div class="ad-mini-stat"><span class="ad-icon-box" data-tone="cyan"><Icon name="lucide:users"/></span><div><strong>{{ n(activity.summary.users) }}</strong><span>сотрудников</span></div></div><div class="ad-mini-stat"><span class="ad-icon-box" data-tone="purple"><Icon name="lucide:log-in"/></span><div><strong>{{ n(activity.summary.logins) }}</strong><span>успешных входов</span></div></div><NuxtLink to="/admin/statistics" class="ad-text-link">Подробный отчёт <Icon name="lucide:arrow-right"/></NuxtLink></aside>
            </div>
            <div v-else class="ad-empty" role="status">{{ loading ? 'Загружаем статистику…' : 'Данные ещё не загружены' }}</div>
            <p v-if="activity" class="ad-card-footnote">Доступно только тебе · твои действия исключены<span v-if="!activity.health.enabled"> · сбор отключён</span><span v-if="activity.health.dropped || activity.health.lastErrorAt"> · данные могут быть неполными</span></p>
          </article>
          <article v-else class="ad-card ad-team-overview"><header class="ad-card-heading"><div><h2>Рабочая среда Space</h2><p>Команда и инструменты управления</p></div><span class="ad-icon-box" data-tone="purple"><Icon name="lucide:layout-dashboard"/></span></header><div class="ad-team-intro"><h3>Начните с нужного инструмента</h3><p>Управляйте доступными вам разделами, находите сотрудников и поддерживайте порядок в рабочем пространстве.</p><a href="#admin-tools" class="ad-soft-button">Все инструменты <Icon name="lucide:arrow-down"/></a></div></article>
          <aside class="ad-side-stack">
            <NuxtLink v-if="has('/admin/registration-requests')" to="/admin/registration-requests" class="ad-card ad-request"><div><span class="ad-icon-box" data-tone="amber"><Icon name="lucide:inbox"/></span><span class="ad-muted">Заявки на доступ</span><strong>{{ n(summary?.requests?.pending) }}</strong><span>{{ summary?.requests?.pending === 0 ? 'Нет заявок на рассмотрении' : 'Ожидают рассмотрения' }}</span></div><Icon class="ad-request-arrow" name="lucide:arrow-up-right"/></NuxtLink>
            <article class="ad-card ad-online"><span class="ad-icon-box" data-tone="cyan"><Icon name="lucide:radio"/></span><h2>Кто сейчас в Space?</h2><p>Сотрудники в сети и их текущий статус.</p><NuxtLink v-if="has('/online')" to="/online" class="ad-text-link">Пользователи онлайн <Icon name="lucide:arrow-right"/></NuxtLink></article>
          </aside>
        </div>
        <div class="ad-bottom">
          <section id="admin-tools" class="ad-card ad-tools">
            <header class="ad-card-heading"><div><h2>Инструменты управления</h2><p>{{ tools.length }} доступных разделов</p></div><label class="ad-search"><Icon name="lucide:search"/><input v-model="search" type="search" placeholder="Найти инструмент" aria-label="Найти инструмент"/></label></header>
            <nav class="ad-filter-tabs" aria-label="Категории инструментов"><button v-for="item in visibleCategories" :key="item.key" :aria-pressed="category === item.key" @click="category = item.key">{{ item.label }}</button></nav>
            <div class="ad-tools-grid"><NuxtLink v-for="tool in filtered" :key="tool.to" :to="tool.to" class="ad-tool"><span class="ad-icon-box" :data-tone="group(tool) === 'people' ? 'cyan' : group(tool) === 'access' ? 'purple' : group(tool) === 'content' ? 'amber' : 'green'"><Icon :name="tool.icon || 'lucide:layout-grid'"/></span><div><h3>{{ tool.label }}</h3><p>{{ tool.description }}</p></div><Icon name="lucide:chevron-right" class="ad-tool-chevron"/></NuxtLink></div>
            <div v-if="!filtered.length" class="ad-empty"><strong>Инструменты не найдены</strong><button class="ad-soft-button" @click="reset">Сбросить поиск и фильтр</button></div>
          </section>
          <article v-if="has('/admin/users')" class="ad-card ad-user-status"><header class="ad-card-heading"><div><h2>Учётные записи</h2><p>Состояние пользователей Space</p></div></header>
            <template v-if="summary?.users"><div class="ad-donut" :style="donut" role="img" :aria-label="`Активны ${summary.users.active} из ${summary.users.total} учётных записей`"><div><strong>{{ activePercent }}%</strong><span>активных</span></div></div><ul class="ad-state-list"><li v-for="state in states" :key="state.label"><span><i :data-tone="state.tone"></i>{{ state.label }}</span><strong>{{ n(state.value) }}</strong></li></ul><NuxtLink to="/admin/users" class="ad-text-link">Все пользователи <Icon name="lucide:arrow-right"/></NuxtLink></template>
            <p v-else class="ad-empty">{{ loading ? 'Загрузка…' : 'Сводка недоступна' }}</p>
          </article>
        </div>
        <footer class="ad-page-foot"><span>Автодор Инжиниринг · Space</span><span v-if="stamp">Обновлено {{ stamp }} · МСК</span></footer>
      </template>
      <div v-else-if="loading" class="ad-empty" role="status">Загружаем центр администрирования…</div>
      <div v-else-if="navigation && !navigationError" class="ad-card ad-empty"><Icon name="lucide:lock-keyhole"/><h2>Нет доступных инструментов</h2><p>Назначения доступа определяют, какие разделы вы видите.</p></div>
    </div>
  </section>
</template>
<style src="~/assets/css/admin-dashboard.css"></style>
