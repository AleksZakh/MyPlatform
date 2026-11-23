import { defineNitroPlugin } from 'nitropack/runtime';
import { advanceDueWorks } from '../services/diagnostic/work-lifecycle';

export default defineNitroPlugin((app) => {
  if (import.meta.prerender) return;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  async function tick() {
    let backlog = false;
    try {
      backlog = await advanceDueWorks();
    } catch (error) {
      console.error('[ОДИС] Ошибка автоматического обновления статусов работ', error);
    } finally {
      if (!stopped) {
        const untilNextMinute = 60000 - Date.now() % 60000;
        timer = setTimeout(tick, backlog ? Math.min(1000, untilNextMinute) : untilNextMinute);
        timer.unref();
      }
    }
  }
  timer = setTimeout(tick, 0);
  timer.unref();
  app.hooks.hook('close', () => {
    stopped = true;
    clearTimeout(timer);
  });
});
