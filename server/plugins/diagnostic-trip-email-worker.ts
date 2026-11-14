import {defineNitroPlugin} from 'nitropack/runtime';
import {processTripEmails} from '../services/diagnostic/trip-email-worker';
export default defineNitroPlugin(nitroApp=>{
 const tick=()=>void processTripEmails().catch(()=>console.error('[ODIS trips] Не удалось обработать очередь уведомлений. Проверьте БД и миграции.'));
 const timer=setInterval(tick,30000);timer.unref();nitroApp.hooks.hook('close',()=>clearInterval(timer));
});
