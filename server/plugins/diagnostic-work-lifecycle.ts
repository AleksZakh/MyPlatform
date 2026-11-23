import { defineNitroPlugin } from 'nitropack/runtime';
import { advanceDueWorks } from '../services/diagnostic/work-lifecycle';

export default defineNitroPlugin((app) => {
  if (import.meta.prerender) return;
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  async function tick() {
    let delay = 60000;
    try {
      if (await advanceDueWorks()) delay = 1000;
    } catch (error) {
      console.error('[ОДИС] Ошибка автоматического обновления статусов работ', error);
    } finally {
      if (!stopped) {
        timer = setTimeout(tick, delay);
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
