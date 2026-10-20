import { getMethod, getQuery, getRequestURL, type H3Event } from 'h3';
import { usagePage } from '../../shared/usage';
import { recordUsage } from './usage';
import { isStatisticsOwner } from './usage-owner';

/** Runs after the response: a failed capability probe followed by HTTP 200 is not a denial. */
export function recordDeniedResponse(event: H3Event) {
  if (event.node.res.statusCode !== 403 || event.context.externalSessionRevoked) return;
  const actor = event.context.usageActor || event.context.user;
  if (!Number.isSafeInteger(actor?.id) || actor.id <= 0 || isStatisticsOwner(actor)) return;
  const path = getRequestURL(event).pathname;
  // The collector must not report failures about itself; anonymous auth attempts are separate.
  if (/^\/api\/(?:statistics|_auth|auth)(?:\/|$)/.test(path)) return;
  let target: string | null = null;
  if (path === '/api/admin/guard') {
    const page = getQuery(event).page;
    const candidate = typeof page === 'string' ? usagePage(page) : null;
    target = candidate && /^\/admin(?:\/|$)/.test(candidate) ? candidate : '/admin';
  }
  const resource = event.context.usageDeniedResource as { key?: string; action?: string } | undefined;
  if (!target && resource && /^[a-z][a-z0-9.-]{0,119}$/.test(resource.key || '')
    && /^(VIEW|CREATE|UPDATE|DELETE|EXPORT|FULL)$/.test(resource.action || '')) {
    target = `access:${resource.action}:${resource.key}`;
  }
  if (!target) target = usagePage(path);
  if (!target && path.startsWith('/files/lab/')) target = 'lab-document';
  if (!target && path.startsWith('/api/')) {
    // Store route shape, never query strings, file names, email addresses or access tokens.
    const shape = path.split('/').slice(1,9).map(segment =>
      /^[a-z][a-z_-]{0,39}$/i.test(segment) ? segment : ':id').join('/');
    target = `${getMethod(event)} /${shape}`;
  }
  if (!target) target = 'protected-page';
  recordUsage({ actorId: actor.id, kind: 'ACCESS_DENIED', target, source: 'SERVER' }, 5000);
}
