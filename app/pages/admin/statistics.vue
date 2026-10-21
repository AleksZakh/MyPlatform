<script setup lang="ts">
import { useUsageStatistics } from '~/composables/useUsageStatistics';
import { USAGE_KINDS } from '~~/shared/usage';
import '~/assets/css/admin-dashboard.css';
import '~/assets/css/usage-statistics.css';
useSeoMeta({ title: 'Статистика — Space' });
const { days, actorId, kind, page, busy, error, report, label, date, load, resetFilters } = useUsageStatistics();
</script>
<template>
<section class="admin-dashboard statistics-page" :aria-busy="busy">
  <header class="statistics-heading">
    <div><NuxtLink to="/admin" class="statistics-back">Администрирование /</NuxtLink><h1>Статистика использования</h1></div>
    <span class="statistics-status" role="status">{{ busy ? 'Обновление…' : 'Автообновление · 15 сек' }}</span>
  </header>
  <form class="statistics-filters" @submit.prevent="load(true)">
    <label>Период<select v-model="days"><option :value="1">24 часа</option><option :value="7">7 дней</option><option :value="30">30 дней</option><option :value="90">90 дней</option></select></label>
    <label>Сотрудник · ID<input v-model="actorId" type="number" min="1" placeholder="Все сотрудники" /></label>
    <label>Событие<select v-model="kind"><option value="">Все события</option><option v-for="(name,key) in USAGE_KINDS" :key="key" :value="key">{{ name }}</option></select></label>
    <button class="statistics-primary" :disabled="busy">Обновить</button><button type="button" :disabled="busy" @click="resetFilters">Сбросить</button>
  </form>
  <p v-if="error" role="alert" class="ad-alert">{{ error }}</p>
  <template v-if="report">
    <div class="statistics-cards">
      <article><Icon name="lucide:users" /><div><strong>{{ report.summary.users }}</strong><span>Сотрудников</span></div></article>
      <article><Icon name="lucide:activity" /><div><strong>{{ report.summary.events }}</strong><span>Событий</span></div></article>
      <article><Icon name="lucide:log-in" /><div><strong>{{ report.summary.logins }}</strong><span>Успешных входов</span></div></article>
      <article><Icon name="lucide:shield-alert" /><div><strong>{{ report.summary.denied }}</strong><span>Отказов доступа</span></div></article>
    </div>
    <p v-if="report.health.lastErrorAt || report.health.dropped" role="alert" class="ad-alert">Были сбои записи. Последний сбой: {{ report.health.lastErrorAt ? date(report.health.lastErrorAt) : '—' }}; потери очереди: {{ report.health.dropped }}.</p>
    <section class="statistics-events">
      <header><h2>Действия сотрудников</h2><span>Время · Москва</span></header>
      <div class="statistics-table-scroll" tabindex="0" aria-label="Таблица действий сотрудников">
        <table><thead><tr><th>Время</th><th>Сотрудник</th><th>Событие</th><th>Объект</th><th>Получатель</th><th>Источник</th></tr></thead>
        <tbody><tr v-for="e in report.items" :key="e.id"><td class="statistics-time">{{ date(e.occurredAt) }}</td><td><button class="statistics-actor" @click="actorId=String(e.actorId);load(true)">{{ e.actorName }}</button></td><td><span :class="{'statistics-denied':e.kind==='ACCESS_DENIED'}">{{ label(e.kind) }}</span></td><td>{{ e.targetLabel }}</td><td>{{ e.recipientName || '—' }}</td><td>{{ e.source==='SERVER' ? 'Сервер' : 'Браузер' }}</td></tr>
        <tr v-if="!report.items.length"><td colspan="6" class="statistics-empty">По выбранным фильтрам событий нет.</td></tr></tbody></table>
      </div>
      <footer><span>Всего: {{ report.summary.events }}</span><div><button :disabled="busy || page<=1" @click="page--;load()">Назад</button><span>Страница {{ page }}</span><button :disabled="busy || page*50>=report.summary.events" @click="page++;load()">Далее</button></div></footer>
    </section>
    <details class="statistics-details"><summary>Популярные разделы и сводка по дням</summary>
      <div class="statistics-columns"><section><h2>Популярные разделы и действия</h2><ol><li v-for="p in report.popular" :key="p.kind+p.target"><span>{{ label(p.kind) }} · {{ p.targetLabel }}</span><strong>{{ p.count }}</strong></li></ol></section>
      <section><h2>По дням · Москва</h2><table><thead><tr><th>Дата</th><th>События</th><th>Сотрудники</th></tr></thead><tbody><tr v-for="d in report.daily" :key="d.day"><td>{{ d.day }}</td><td>{{ d.events }}</td><td>{{ d.users }}</td></tr></tbody></table></section></div>
    </details>
    <details class="statistics-details"><summary>Диагностика и правила сбора</summary>
      <p>Сбор {{ report.health.enabled ? 'включён' : 'отключён' }}. Хранение — {{ report.health.retentionDays }} дней. Действия zakharov_av исключены. Статистика не является оценкой производительности сотрудника.</p>
      <p>С момента запуска процесса: принято {{ report.health.received }}, записано {{ report.health.saved }}, исключено {{ report.health.excluded }}, в очереди {{ report.health.pending }}. Отказов из аудита: {{ report.health.auditedDenials ?? 0 }}; дополнительно по HTTP 403: {{ report.health.responseDenials ?? 0 }}.</p>
      <p>Последнее поступление: {{ report.health.lastReceivedAt ? date(report.health.lastReceivedAt) : 'ещё не было' }}. Проверка очереди: {{ report.health.lastFlushAt ? date(report.health.lastFlushAt) : 'ещё не было' }}. Последнее сохранённое событие другого сотрудника без фильтров: {{ report.health.lastStoredEventAt ? date(report.health.lastStoredEventAt) : 'событий нет' }}. Ошибка: {{ report.health.lastErrorCode || 'нет' }}.</p>
      <p>Отказы из журнала аудита учитываются даже при перехваченном запрете. Дополнительно учитываются HTTP 403 и блокировки переходов интерфейсом. Повторы одного отказа за 5 секунд объединяются; незаписываемые в аудит фоновые проверки с успешным ответом не учитываются. Старые пропуски автоматически не восстанавливаются. Счётчики диагностики относятся к текущему процессу и сбрасываются при его перезапуске.</p>
      <p>Новые события появляются после записи очереди и обновления отчёта — обычно до 30 секунд, при нагрузке дольше. «Браузер» означает переход или нажатие, а не выполненную операцию. Открытие видео не означает полный просмотр; запросы документа за минуту объединяются.</p>
    </details>
  </template>
</section>
</template>
