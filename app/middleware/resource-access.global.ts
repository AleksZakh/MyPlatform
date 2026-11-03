import { pageAccess } from '~~/shared/utils/page-access';

export default defineNuxtRouteMiddleware(async to => {
  const rule = pageAccess(to.path, to.query);
  if (!rule) return;
  const headers = import.meta.server ? useRequestHeaders(['cookie']) : undefined;
  try {
    const checks = 'upts' in rule
      ? [await $fetch<{ allowed: boolean }>('/api/upts/access', { headers })]
      : await Promise.all(rule.resources.map(resource => $fetch<{ allowed: boolean }>('/api/access/check', {
          query: { resource, action: rule.action || 'VIEW' }, headers,
        })));
    if (checks.some(check => check.allowed)) return;
  } catch (error: any) {
    const status = Number(error?.statusCode || error?.response?.status);
    if (status === 401) return navigateTo({ path: '/login', query: { redirect: to.fullPath } }, { replace: true });
    if (status !== 403) return navigateTo({ path: '/access-denied', query: { reason: 'unavailable', from: to.fullPath } }, { replace: true });
  }
  return navigateTo('/access-denied', { replace: true });
});
