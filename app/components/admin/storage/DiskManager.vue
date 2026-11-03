<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { DiskScanReport, DiskSummary } from '~~/shared/types/disk-management';
import DepartmentUsage from './DepartmentUsage.vue';
const summary = ref<DiskSummary | null>(null), report = ref<DiskScanReport | null>(null);
const checking = ref(false), scanning = ref(false), summaryError = ref(''), scanError = ref('');
const filter = ref('candidate'), seconds = ref(0);
const now = ref(Date.now()), until = ref(0);
const remaining = computed(() => Math.max(0, Math.ceil((until.value - now.value)/1000)));
let clock: ReturnType<typeof setInterval> | undefined;
function cooldown(seconds: number) { now.value = Date.now(); until.value = now.value + seconds * 1000; }
const setupCommands = `cd /var/www/html/MyPlatform
sudo install -o root -g root -m 0755 deploy/disk/space-disk-report.py /usr/local/sbin/space-disk-report
sudo visudo -cf deploy/disk/space-disk-report.sudoers`;
const sudoCommands = `sudo install -o root -g root -m 0440 deploy/disk/space-disk-report.sudoers /etc/sudoers.d/space-disk-report
sudo visudo -c
sudo -u space -H sudo -n -- /usr/local/sbin/space-disk-report`;
let disposed = false, summarySequence = 0, timer: ReturnType<typeof setInterval> | undefined;
const controller = new AbortController();
const candidates = computed(() => report.value?.items.filter(i => i.status === 'candidate') || []);
const rows = computed(() => report.value?.items.filter(i => filter.value === 'all' || i.status === filter.value) || []);
const labels = { candidate: 'Кандидат', protected: 'Сохраняется', review: 'Требует проверки' };
const errorText = (e: any) => e?.data?.message || 'Не удалось получить данные. Повторите попытку.';
function bytes(value: number | null) {
  if (value === null) return 'Не измерялся';
  if (!value) return '0 Б';
  const units = ['Б', 'КиБ', 'МиБ', 'ГиБ', 'ТиБ'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value / 1024 ** index) + ' ' + units[index];
}
const date = (value: string) => new Date(value).toLocaleString('ru-RU');
async function refresh() {
  const current = ++summarySequence;
  checking.value = true; summaryError.value = '';
  try {
    const data = await $fetch<DiskSummary>('/api/admin/files/disk', { signal: controller.signal });
    if (!disposed && current === summarySequence) { summary.value = data; cooldown(data.scanner?.retryAfter||0); }
  } catch (error) { if (!disposed && current === summarySequence) { summary.value = null; summaryError.value = errorText(error); } }
  finally { if (!disposed && current === summarySequence) checking.value = false; }
}
async function scan() {
  if (scanning.value || remaining.value || summary.value?.scanner?.ready === false) return;
  scanning.value = true; scanError.value = ''; report.value = null; seconds.value = 0;
  timer = setInterval(() => { seconds.value++; }, 1000);
  try {
    const data = await $fetch<DiskScanReport>('/api/admin/files/disk/scan', {
      method: 'POST', headers: { 'x-space-disk-scan': '1' }, signal: controller.signal, retry: 0,
    });
    if (!disposed) { report.value = data; filter.value = 'candidate'; cooldown(60); await refresh(); }
  } catch (error: any) { if (!disposed) { scanError.value = errorText(error); cooldown(Math.min(60,Math.max(1,Number(error.data?.data?.retryAfter)||10))); } }
  finally { clearInterval(timer); if (!disposed) scanning.value = false; }
}
onMounted(() => { refresh(); clock = setInterval(() => { now.value = Date.now(); }, 1000); });
onBeforeUnmount(() => { disposed = true; controller.abort(); clearInterval(timer); clearInterval(clock); });
</script>
<template>
  <section class="disk-manager" aria-label="Управление диском">
    <div class="disk-toolbar">
      <div><h2>Место на сервере</h2><p>Проверка свободного места и файлов, которые можно рассмотреть для очистки.</p></div>
      <button type="button" :disabled="checking || scanning" @click="refresh"><Icon name="lucide:refresh-cw" aria-hidden="true" /> Обновить показатели</button>
    </div>
    <p v-if="summaryError" class="disk-error" role="alert">{{ summaryError }}</p>
    <p v-if="checking" role="status">Проверяем свободное место…</p>
    <article v-for="volume in summary?.volumes" :key="volume.id" class="disk-volume">
      <header><Icon name="lucide:hard-drive" aria-hidden="true" /><strong>{{ volume.paths.includes('/') ? 'Системный диск' : 'Диск файлового хранилища' }}</strong><span class="disk-level" :class="{ danger: volume.usedPercent >= 90 }">Занято {{ volume.usedPercent }}%</span></header>
      <p class="disk-path">{{ volume.paths.join(' · ') }}</p>
      <div class="disk-metrics"><div><span>Общий объём</span><strong>{{ bytes(volume.total) }}</strong></div><div><span>Занято</span><strong>{{ bytes(volume.used) }}</strong></div><div :class="{ danger: volume.usedPercent >= 90 }"><span>Доступно приложению</span><strong>{{ bytes(volume.available) }}</strong></div></div>
      <progress :value="volume.usedPercent" max="100" :aria-label="'Заполнение диска ' + volume.paths[0]" :class="{ danger: volume.usedPercent >= 90 }" />
      <p v-if="volume.usedPercent >= 90" class="disk-error">Свободного места мало — сборка нового релиза может завершиться ошибкой.</p>
      <p class="disk-meta">Резерв файловой системы: {{ bytes(volume.reserved) }}<span v-if="volume.inodes"> · Свободных inode: {{ volume.freeInodes.toLocaleString('ru-RU') }} из {{ volume.inodes.toLocaleString('ru-RU') }}</span></p>
      <p v-if="volume.inodes && volume.freeInodes / volume.inodes < .05" class="disk-error">Заканчиваются inode: создание файлов может быть недоступно даже при свободном месте.</p>
    </article>
    <p v-if="summary" class="disk-meta">Показатели на {{ date(summary.checkedAt) }}. Пути на одной файловой системе объединены.</p>
    <p v-for="warning in summary?.warnings" :key="warning" class="disk-warning" role="status">{{ warning }}</p>
    <article class="disk-analysis">
      <div class="disk-toolbar"><div><h2>Возможности очистки</h2><p>Устаревшие релизы и архивные логи старше 30 дней.</p></div><button class="disk-primary" type="button" :disabled="scanning || remaining>0 || summary?.scanner?.ready===false" @click="scan"><Icon :name="scanning ? 'lucide:loader-circle' : 'lucide:scan-search'" :class="{ 'disk-spin': scanning }" aria-hidden="true" />{{ scanning ? 'Проверка выполняется…' : 'Проверить диск на возможность очистки' }}</button></div>
      <p v-if="summary?.scanner?.ready===false" class="disk-warning" role="status">{{ summary.scanner.message }}</p>
      <p v-if="remaining&&!scanning" role="status">Следующая проверка доступна через {{ remaining }} с.</p>
      <p class="disk-meta">Текущая версия, версия для отката, три последних релиза и используемые процессами файлы сохраняются. Проверка ничего не удаляет. Повторный запуск — не чаще раза в минуту.</p>
      <p v-if="scanning" role="status" aria-live="polite">Проверяем каталоги… {{ seconds }} с. На большом диске отчёт может быть частичным.</p>
      <p v-if="scanError" class="disk-error" role="alert">{{ scanError }}</p>
      <details v-if="scanError || summary?.scanner?.ready===false" class="disk-help"><summary>Проверка установки службы на сервере</summary>
        <p>Из актуального каталога исходников установите служебный скрипт и проверьте правило sudo:</p><pre>{{ setupCommands }}</pre>
        <p>Только если проверка правила показала <code>parsed OK</code>, выполните:</p><pre>{{ sudoCommands }}</pre>
        <p>Команда выполняет проверку без удаления. Если ошибка сохраняется, её вывод поможет определить причину. Затем нажмите «Обновить показатели».</p>
      </details>
      <template v-if="report">
        <p v-for="warning in report.warnings" :key="warning" class="disk-warning" role="status">{{ warning }}</p>
        <template v-if="report.status === 'complete' || report.status === 'partial'">
          <div class="disk-result"><div><span>Потенциально можно освободить{{ report.status === 'partial' ? ' по проверенной части' : '' }}</span><strong>{{ bytes(report.candidateBytes) }}</strong></div><div><span>Кандидатов</span><strong>{{ candidates.length }}</strong></div></div>
          <p class="disk-meta">Отчёт на {{ date(report.checkedAt) }} · {{ (report.durationMs / 1000).toFixed(1) }} с. Оценка по занятым блокам; перед удалением нужна повторная проверка.</p>
          <label class="disk-filter">Показать<select v-model="filter" aria-label="Категория результатов проверки"><option value="candidate">Кандидаты на очистку</option><option value="protected">Сохраняемые файлы и версии</option><option value="review">Требуют ручной проверки</option><option value="all">Весь отчёт</option></select></label>
          <div v-if="rows.length" class="disk-table" tabindex="0" aria-label="Результаты проверки диска"><table><thead><tr><th>Каталог или файл</th><th>Занято</th><th>Статус и причина</th></tr></thead><tbody><tr v-for="item in rows" :key="item.path"><td><span class="disk-category">{{ item.category === 'release' ? 'Релиз' : 'Лог' }}</span><span class="disk-item-path">{{ item.path }}</span></td><td class="disk-number">{{ bytes(item.bytes) }}</td><td><strong>{{ labels[item.status] }}</strong><p>{{ item.reason }}</p></td></tr></tbody></table></div>
          <p v-else>{{ filter === 'candidate' ? (report.status === 'partial' ? 'В проверенной части кандидаты не найдены.' : 'Кандидаты на очистку не найдены.') : 'В этой категории нет записей.' }}</p>
        </template>
      </template>
    </article>
    <DepartmentUsage />
  </section>
</template>
<style scoped>
.disk-help{margin-top:14px}.disk-help summary{cursor:pointer}.disk-help pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:12px;border:1px solid var(--space-line,#d8e1ec);border-radius:6px;font-size:12px}
.disk-manager{min-width:0;display:grid;gap:16px;margin-top:18px;color:var(--space-text,#243449)}.disk-manager *{box-sizing:border-box}.disk-toolbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}.disk-manager h2{font-size:18px;font-weight:600;margin:0 0 5px}.disk-manager p{margin:6px 0;line-height:1.5}.disk-toolbar p,.disk-meta,.disk-path{color:var(--space-muted,#62738a);font-size:13px}.disk-manager button,.disk-manager select{font:inherit;color:inherit;background:var(--space-panel,#fff);border:1px solid var(--space-line,#d8e1ec);border-radius:6px;padding:9px 12px;max-width:100%}.disk-manager button{display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer}.disk-manager button:disabled{opacity:.6;cursor:wait}.disk-manager button:focus-visible,.disk-manager select:focus-visible,.disk-table:focus-visible{outline:2px solid #3b82f6;outline-offset:2px}.disk-manager .disk-primary{background:#176b88;border-color:#176b88;color:#fff}.disk-volume,.disk-analysis{border:1px solid var(--space-line,#d8e1ec);border-radius:9px;padding:20px;background:var(--space-panel,#fff);min-width:0}.disk-volume header{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.disk-level{margin-left:auto;font-size:13px}.disk-path,.disk-item-path{overflow-wrap:anywhere}.disk-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin:20px 0}.disk-metrics span,.disk-result span{display:block;color:var(--space-muted,#62738a);font-size:12px}.disk-metrics strong,.disk-result strong{display:block;font-size:26px;font-weight:650;margin-top:5px}.disk-manager progress{display:block;width:100%;height:9px;border:0;border-radius:8px;overflow:hidden;accent-color:#2788a6;background:var(--space-line,#e4eaf2)}.disk-manager progress::-webkit-progress-bar{background:var(--space-line,#e4eaf2)}.disk-manager progress::-webkit-progress-value{background:#2788a6}.disk-manager progress.danger::-webkit-progress-value{background:#dc5353}.disk-manager .danger,.disk-error{color:var(--space-danger,#b42318)}.disk-warning{padding:10px 12px;background:var(--space-selection,#eaf3ff);border-left:3px solid #2788a6;border-radius:4px}.disk-result{display:flex;gap:35px;flex-wrap:wrap;padding:15px 0;margin-top:10px}.disk-filter{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:16px 0}.disk-table{overflow:auto;max-height:440px;border:1px solid var(--space-line,#d8e1ec);border-radius:6px}.disk-table table{width:100%;border-collapse:collapse;font-size:13px}.disk-table th,.disk-table td{padding:12px;text-align:left;vertical-align:top;border-bottom:1px solid var(--space-line,#e4eaf2)}.disk-table th{position:sticky;top:0;background:var(--space-panel,#fff);z-index:1}.disk-table td:first-child{min-width:200px;max-width:420px}.disk-table td:last-child{min-width:170px}.disk-category{display:block;font-size:11px;color:var(--space-muted,#62738a);margin-bottom:4px}.disk-number{white-space:nowrap}.disk-spin{animation:disk-turn 1s linear infinite}@keyframes disk-turn{to{transform:rotate(360deg)}}@media(prefers-reduced-motion:reduce){.disk-spin{animation:none}}@media(max-width:600px){.disk-volume,.disk-analysis{padding:14px}.disk-metrics{gap:10px}.disk-metrics strong{font-size:19px}.disk-toolbar button{width:100%}}
</style>
