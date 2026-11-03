export type PageAccess = { resources: string[]; action?: 'VIEW' | 'UPDATE' } | { upts: true };
export const labPageResources = ['lab.sampling-tests', 'lab.plps', 'lab.materials', 'lab.manufacturers', 'lab.test-objects', 'lab.event-journal'];
/** These keys mirror server permissions. Multiple resources mean any VIEW grant. */
export function pageAccess(path: string, query: Record<string, unknown> = {}): PageAccess | null {
  path = path.replace(/\/+$/, '') || '/';
  if (path === '/departments/upts' || path.startsWith('/departments/upts/')) return { upts: true };
  if (path === '/departments/diagnostic') return { resources: [query.module === 'works' ? 'diagnostic.works' : query.module === 'structures' ? 'diagnostic.structures' : 'diagnostic.contracts'] };
  if (path === '/departments/lab') return { resources: labPageResources };
  const keys: Record<string, string> = {
    '/departments/lab/sampling': 'lab.sampling-tests', '/departments/lab/testprotocol': 'lab.test-protocols',
    '/admin/users': 'admin.users', '/admin/audit-log': 'system.audit-log', '/admin/statistics': 'system.usage-statistics',
  };
  if (keys[path]) return { resources: [keys[path]] };
  if (path === '/library/video-settings') return { resources: ['library.manage'], action: 'UPDATE' };
  return null;
}
