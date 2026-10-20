import { computed, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue';
import type { NavigationData } from '~~/shared/navigation/catalog';
import type { AdminDashboardActivity, AdminDashboardSummary } from '~~/shared/types/admin-dashboard';

export function useAdminDashboard(navigation: Ref<NavigationData | null | undefined>) {
  const summary = ref<AdminDashboardSummary | null>(null), activity = ref<AdminDashboardActivity | null>(null);
  const summaryError = ref(''), activityError = ref(''), loading = ref(false);
  const canSeeStatistics = computed(() => navigation.value?.tools.some(t => t.to === '/admin/statistics') || false);
  let sequence = 0, mounted = false;
  async function load() {
    const ticket = ++sequence;
    summary.value = null; activity.value = null; summaryError.value = ''; activityError.value = '';
    if (!navigation.value?.tools.length) { loading.value = false; return; }
    loading.value = true;
    const statisticsAllowed = canSeeStatistics.value;
    // Do not call the personal statistics endpoint for other administrators.
    await Promise.all([
      $fetch<AdminDashboardSummary>('/api/admin/dashboard').then(value => { if(ticket === sequence) summary.value = value; })
        .catch(() => { if(ticket === sequence) summaryError.value = 'Не удалось загрузить сводку. Инструменты остаются доступны.'; }),
      statisticsAllowed ? $fetch<AdminDashboardActivity>('/api/admin/statistics', { query: { days: 7 } })
        .then(value => { if(ticket === sequence && canSeeStatistics.value) activity.value = value; })
        .catch(() => { if(ticket === sequence) activityError.value = 'Статистика временно недоступна. Попробуйте обновить данные.'; }) : Promise.resolve(),
    ]);
    if (ticket === sequence) loading.value = false;
  }
  watch(() => navigation.value?.tools.map(t => t.to).join('|'), () => { if(mounted) void load(); });
  onMounted(() => { mounted = true; void load(); });
  onBeforeUnmount(() => { sequence++; });
  return { summary, activity, summaryError, activityError, loading, canSeeStatistics, load };
}
