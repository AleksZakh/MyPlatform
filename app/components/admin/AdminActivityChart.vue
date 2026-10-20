<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ daily: { day: string; events: number; users: number }[] }>();
const peak = computed(() => Math.max(1, ...props.daily.map(d => d.events)));
</script>
<template>
  <div v-if="daily.length" class="ad-activity-chart">
    <div class="ad-chart" role="img" :aria-label="`Количество событий по дням: ${daily.map(d => `${d.day}: ${d.events}`).join('; ')}`">
      <div class="ad-chart-scale" aria-hidden="true"><span>{{ peak }}</span><span>{{ Math.round(peak / 2) }}</span><span>0</span></div>
      <div class="ad-plot"><div class="ad-grid-lines" aria-hidden="true"><i></i><i></i><i></i></div>
        <div v-for="day in daily" :key="day.day" class="ad-plot-day" tabindex="0" :aria-label="`${day.day}: ${day.events} событий, сотрудников: ${day.users}`">
          <div class="ad-bar-space"><div class="ad-bar" :style="{ height: `${day.events / peak * 100}%` }"></div><span class="ad-chart-tooltip">{{ day.day }} · {{ day.events }} событий</span></div>
          <span class="ad-day-label">{{ day.day }}</span>
        </div>
      </div>
    </div>
    <details class="ad-chart-details"><summary>Данные графика</summary><table><thead><tr><th>Дата</th><th>События</th><th>Сотрудники</th></tr></thead><tbody><tr v-for="day in daily" :key="day.day"><td>{{ day.day }}</td><td>{{ day.events }}</td><td>{{ day.users }}</td></tr></tbody></table></details>
  </div>
  <div v-else class="ad-empty"><Icon name="lucide:chart-column"/><strong>Пока нет событий</strong><p>Здесь появится активность сотрудников за последние 7 суток.</p></div>
</template>
