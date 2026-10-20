import { getRequestURL, getMethod, getResponseHeader } from 'h3';
import { recordUsage, flushUsage } from '../services/usage';
export default defineNitroPlugin(nitro => {
  const timer = setInterval(() => { void flushUsage(); }, 15000); timer.unref();
  nitro.hooks.hook('close', async () => { clearInterval(timer); await flushUsage(); });
  nitro.hooks.hook('afterResponse', event => {
    const user = event.context.user as { id?: number } | undefined;
    if (!user?.id || getMethod(event) !== 'GET' || event.node.res.statusCode >= 300) return;
    const path = getRequestURL(event).pathname;
    const type = String(getResponseHeader(event,'content-type') || '');
    if ((/^\/api\/library\/assets\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(path) && type.includes('application/pdf'))
      || /^\/api\/work\/projects\/\d+\/files\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(path)
      || (/^\/files\/lab\//.test(path) && !type.includes('text/html')))
      recordUsage({ actorId:user.id, kind:'DOCUMENT', target: path.startsWith('/files/') ? 'lab-document' : path }, 60000);
    if (/^\/api\/library\/videos\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(path)) recordUsage({ actorId:user.id, kind:'VIDEO', target:path }, 60000);
  });
});
