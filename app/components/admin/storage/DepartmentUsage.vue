<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import type { StorageUsageReport } from '~~/shared/types/department-storage';
const report = ref<StorageUsageReport | null>(null), loading = ref(false), error = ref('');
const now = ref(Date.now()), until = ref(0);
const remaining = computed(() => Math.max(0, Math.ceil((until.value - now.value)/1000)));
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => { timer = setInterval(() => { now.value = Date.now(); }, 1000); });
const controller = new AbortController();
const gib = (n: number) => new Intl.NumberFormat('ru-RU',{ minimumFractionDigits:2,maximumFractionDigits:3 }).format(n/1024**3);
async function load() {
  if (loading.value || remaining.value) return;
  loading.value = true; error.value = ''; report.value = null;
  try {
    report.value = await $fetch<StorageUsageReport>('/api/admin/files/disk/departments', { method:'POST', headers:{'x-space-disk-scan':'1'}, retry:0, signal:controller.signal });
    now.value = Date.now(); until.value = now.value+60000;
  } catch (e: any) {
    if (controller.signal.aborted) return;
    error.value = e.data?.message || 'Не удалось рассчитать объём подразделений.';
    now.value = Date.now(); until.value = now.value+Math.min(60,Math.max(1,Number(e.data?.data?.retryAfter)||10))*1000;
  } finally { loading.value = false; }
}
onBeforeUnmount(() => { clearInterval(timer); controller.abort(); });
</script>
<template>
  <article class="department-usage">
    <div class="usage-head"><div><h2>Объём по подразделениям</h2><p>Общие документы и файлы проектов, включая корзину и личные файлы.</p></div><button :disabled="loading||remaining>0" @click="load">{{ loading?'Измеряем…':'Рассчитать по отделам' }}</button></div>
    <p v-if="remaining&&!loading" role="status">Повторный расчёт через {{ remaining }} с.</p>
    <p v-if="loading" role="status">Обходим каталоги. На больших хранилищах результат может быть частичным.</p>
    <p v-if="error" role="alert">{{ error }}</p>
    <template v-if="report">
      <p><strong>Учтено: {{ gib(report.totalBytes) }} ГиБ</strong> · {{ new Date(report.checkedAt).toLocaleString('ru-RU') }}</p>
      <p v-for="warning in report.warnings" :key="warning" class="usage-warning">{{ warning }}</p>
      <div class="usage-table"><table><thead><tr><th>Подразделение</th><th>На диске, ГиБ</th><th>Доля{{ report.status==='partial'?' проверенной части':'' }}, %</th><th>Файлов</th></tr></thead><tbody><tr v-for="row in report.rows" :key="row.key"><td>{{ row.name }}</td><td>{{ gib(row.bytes) }}</td><td><span>{{ row.percent?.toLocaleString('ru-RU') }}%</span><progress :value="row.percent||0" max="100" :aria-label="'Доля '+row.name" /></td><td>{{ row.files.toLocaleString('ru-RU') }}</td></tr></tbody></table></div>
    </template>
    <p class="usage-note">Процент — доля учтённого объёма файловых хранилищ, не всего диска. 1 ГиБ = 1024³ байт. Считаются занятые блоки файлов и каталогов; жёсткие ссылки учитываются один раз. База данных, релизы и системные логи в эту разбивку не входят. Проверка не требует sudo.</p>
  </article>
</template>
<style scoped>
.department-usage{min-width:0;padding:20px;border:1px solid var(--space-line,#d8e1ec);border-radius:9px;background:var(--space-panel,#fff)}.usage-head{display:flex;gap:16px;justify-content:space-between;align-items:center;flex-wrap:wrap}h2{margin:0;font-size:18px;font-weight:600}p{font-size:13px;color:var(--space-muted,#62738a);line-height:1.5}button{font:inherit;border:1px solid var(--space-line,#d8e1ec);border-radius:6px;background:var(--space-panel,#fff);color:inherit;padding:9px 12px;cursor:pointer}button:disabled{opacity:.55;cursor:default}.usage-table{overflow:auto}table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;border-bottom:1px solid var(--space-line,#d8e1ec);padding:12px;min-width:95px}th:first-child{min-width:190px}progress{display:block;width:100%;height:7px;accent-color:#2788a6;margin-top:6px}.usage-warning{border-left:3px solid #2788a6;padding-left:10px}[role=alert]{color:var(--space-danger,#b42318)}.usage-note{margin-bottom:0}@media(max-width:600px){.department-usage{min-width:0;padding:14px}}
</style>
