/** Pages whose own workspace owns vertical scrolling, inside the common shell. */
export function usesContainedPage(path: string): boolean {
  const normalized = path.replace(/\/+$/, '') || '/';
  return [
    '/departments/diagnostic', '/departments/lab', '/admin/audit-log',
    '/admin/statistics', '/profile', '/admin/access', '/admin/users',
  ].includes(normalized) || normalized.startsWith('/admin/users/');
}
